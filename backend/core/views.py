from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from pathlib import Path

from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.http import FileResponse, Http404, HttpResponseRedirect
from rest_framework import generics, permissions, parsers
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Alert, Analyte, OnboardingProfile, Patient, Report, ResultValue, User
from .permissions import IsOwnerOrClinical
from .serializers import (
    AlertSerializer,
    AnalyteSerializer,
    OnboardingProfileSerializer,
    PatientSerializer,
    RegisterSerializer,
    ReportSerializer,
    ReportUploadSerializer,
    ResultValueSerializer,
    UserSerializer,
)
from .services.ai_insights import generate_insights
from .services.pdf_parser import parse_pdf


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "user": UserSerializer(user).data,
                "tokens": {
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                },
            },
            status=201,
        )


class PatientListCreateView(generics.ListCreateAPIView):
    serializer_class = PatientSerializer
    queryset = Patient.objects.select_related("user", "onboarding")

    def get_queryset(self):
        user = self.request.user
        queryset = Patient.objects.select_related("user", "onboarding")
        mine = self.request.query_params.get("mine")
        if mine in {"true", "1", "yes"}:
            return queryset.filter(user=user)
        if user.role in IsOwnerOrClinical.clinical_roles or user.is_staff:
            return queryset
        return queryset.filter(user=user)

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == User.Roles.PATIENT:
            serializer.save(user=user)
        else:
            serializer.save()


class PatientDetailView(generics.RetrieveAPIView):
    queryset = Patient.objects.select_related("user", "onboarding")
    serializer_class = PatientSerializer
    permission_classes = [IsOwnerOrClinical]


class ReportListCreateView(generics.ListCreateAPIView):
    serializer_class = ReportSerializer
    queryset = Report.objects.select_related("patient", "patient__user").prefetch_related(
        "results", "results__analyte"
    )

    def get_queryset(self):
        user = self.request.user
        queryset = Report.objects.select_related("patient", "patient__user").prefetch_related(
            "results", "results__analyte"
        )
        mine = self.request.query_params.get("mine")
        if mine in {"true", "1", "yes"}:
            queryset = queryset.filter(patient__user=user)
        patient_id = self.request.query_params.get("patient_id")
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        if user.role in IsOwnerOrClinical.clinical_roles or user.is_staff:
            return queryset
        return queryset.filter(patient__user=user)

    def perform_create(self, serializer):
        user = self.request.user
        patient = serializer.validated_data["patient"]
        if user.role not in IsOwnerOrClinical.clinical_roles and patient.user_id != user.id:
            raise PermissionDenied("You can only create reports for linked patients.")
        serializer.save()


class ReportDetailView(generics.RetrieveAPIView):
    queryset = Report.objects.select_related("patient", "patient__user").prefetch_related(
        "results", "results__analyte"
    )
    serializer_class = ReportSerializer
    permission_classes = [IsOwnerOrClinical]


class ReportDeleteView(generics.DestroyAPIView):
    queryset = Report.objects.all()
    serializer_class = ReportSerializer
    permission_classes = [IsOwnerOrClinical]

    def perform_destroy(self, instance):
        if instance.pdf_file:
            instance.pdf_file.delete(save=False)
        super().perform_destroy(instance)


class ReportDownloadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        report = get_object_or_404(
            Report.objects.select_related("patient", "patient__user"), pk=pk
        )
        permission = IsOwnerOrClinical()
        if not permission.has_object_permission(request, self, report):
            raise PermissionDenied("You cannot access this report.")
        if report.pdf_file:
            file_handle = report.pdf_file.open("rb")
            filename = Path(report.pdf_file.name).name
            response = FileResponse(file_handle, content_type="application/pdf")
            response["Content-Disposition"] = f'inline; filename="{filename}"'
            return response
        if report.pdf_url:
            return HttpResponseRedirect(report.pdf_url)
        raise Http404("Archivo no disponible.")


class AnalyteListCreateView(generics.ListCreateAPIView):
    queryset = Analyte.objects.all()
    serializer_class = AnalyteSerializer

    def perform_create(self, serializer):
        if self.request.user.role not in IsOwnerOrClinical.clinical_roles:
            raise PermissionDenied("Only medical staff can add analytes.")
        serializer.save()


class ResultValueListCreateView(generics.ListCreateAPIView):
    serializer_class = ResultValueSerializer
    queryset = ResultValue.objects.select_related("report", "report__patient", "analyte")

    def get_queryset(self):
        user = self.request.user
        queryset = ResultValue.objects.select_related("report", "report__patient", "analyte")
        if user.role in IsOwnerOrClinical.clinical_roles or user.is_staff:
            return queryset
        return queryset.filter(report__patient__user=user)

    def perform_create(self, serializer):
        report = serializer.validated_data["report"]
        user = self.request.user
        if user.role not in IsOwnerOrClinical.clinical_roles and report.patient.user_id != user.id:
            raise PermissionDenied("You can only add results to your own reports.")
        serializer.save()


class ReportTrendsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    DEFAULT_ANALYTES = {
        "glucose": "Glucosa",
        "hemoglobin": "Hemoglobina",
        "cholesterol_total": "Colesterol total",
        "hdl": "HDL",
        "ldl": "LDL",
        "triglycerides": "Triglicéridos",
    }

    def _parse_analytes(self, request):
        param = request.query_params.get("analytes")
        if not param:
            return list(self.DEFAULT_ANALYTES.keys())
        return [item.strip() for item in param.split(",") if item.strip()]

    def get(self, request):
        user = request.user
        analyte_keys = self._parse_analytes(request)
        if not analyte_keys:
            return Response({"analytes": []})

        queryset = ResultValue.objects.select_related(
            "report", "report__patient", "report__patient__user", "analyte"
        ).filter(analyte__name__in=analyte_keys)

        patient_id = request.query_params.get("patient_id")
        if patient_id:
            patient = get_object_or_404(Patient, pk=patient_id)
            permission = IsOwnerOrClinical()
            if not permission.has_object_permission(request, self, patient):
                raise PermissionDenied("You cannot access this patient's data.")
            queryset = queryset.filter(report__patient=patient)
        else:
            queryset = queryset.filter(report__patient__user=user)

        queryset = queryset.order_by("measured_at", "report__issued_at", "pk")

        trends_map = {}
        for result in queryset:
            key = result.analyte.name
            entry = trends_map.setdefault(
                key,
                {
                    "key": key,
                    "label": self.DEFAULT_ANALYTES.get(key, key.replace("_", " ").title()),
                    "unit": result.unit or result.analyte.unit,
                    "points": [],
                },
            )
            if not entry["unit"]:
                entry["unit"] = result.unit or result.analyte.unit
            measured_at = result.measured_at or result.report.issued_at
            entry["points"].append(
                {
                    "value": float(result.value),
                    "unit": result.unit,
                    "ref_min": float(result.ref_min) if result.ref_min is not None else None,
                    "ref_max": float(result.ref_max) if result.ref_max is not None else None,
                    "flag": result.flag,
                    "measured_at": measured_at.isoformat() if measured_at else None,
                    "report_id": str(result.report_id),
                    "report_issued_at": result.report.issued_at.isoformat()
                    if result.report.issued_at
                    else None,
                }
            )

        analytes_payload = [value for value in trends_map.values() if value["points"]]
        return Response({"analytes": analytes_payload})


class AlertListView(generics.ListAPIView):
    serializer_class = AlertSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Alert.objects.select_related("patient", "report", "report__patient")
        if user.role in IsOwnerOrClinical.clinical_roles or user.is_staff:
            return queryset
        return queryset.filter(Q(patient__user=user) | Q(report__patient__user=user))


class ReportUploadView(APIView):
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]

    def post(self, request, *args, **kwargs):
        serializer = ReportUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        patient = Patient.objects.filter(user=request.user).first()
        if not patient:
            raise ValidationError("Please create a patient profile before uploading reports.")
        pdf_file = serializer.validated_data["pdf"]
        parsed_payload = parse_pdf(pdf_file)
        report_date_raw = parsed_payload.get("report_date") or timezone.now()
        if isinstance(report_date_raw, str):
            dt = parse_datetime(report_date_raw)
        elif isinstance(report_date_raw, datetime):
            dt = report_date_raw
        else:
            dt = None
        if dt is None:
            dt = timezone.now()
        if timezone.is_naive(dt):
            dt = timezone.make_aware(dt, timezone.get_current_timezone())
        report_date = dt
        parsed_fields = parsed_payload.copy()
        parsed_fields["report_date"] = report_date.isoformat()
        pdf_file.seek(0)
        report = Report.objects.create(
            patient=patient,
            org_name=parsed_payload.get("lab_name") or "Unknown Lab",
            issued_at=report_date,
            pdf_file=pdf_file,
            raw_json={
                "filename": pdf_file.name,
                "size": pdf_file.size,
                "content_type": pdf_file.content_type,
                "raw_text": parsed_payload.get("raw_text", ""),
            },
            parsed_fields=parsed_fields,
        )
        if report.pdf_file:
            url = report.pdf_file.url
            if request:
                url = request.build_absolute_uri(url)
            report.pdf_url = url
            report.save(update_fields=["pdf_url"])
        results_payload = parsed_payload.get("analytes", [])
        for result_data in results_payload:
            analyte, _ = Analyte.objects.get_or_create(
                name=result_data.get("name", "unknown"),
                defaults={
                    "unit": result_data.get("unit", ""),
                    "description": "Auto-created",
                },
            )
            measured_str = result_data.get("measured_at")
            measured_at = parse_datetime(measured_str) if measured_str else None
            if measured_at is None:
                measured_at = report_date
            elif timezone.is_naive(measured_at):
                measured_at = timezone.make_aware(measured_at, timezone.get_current_timezone())
            value = result_data.get("value", 0)
            ref_min = result_data.get("ref_min", 0)
            ref_max = result_data.get("ref_max", 0)
            flag = ResultValue.Flag.NORMAL
            if value < ref_min:
                flag = ResultValue.Flag.LOW
            elif value > ref_max:
                flag = ResultValue.Flag.HIGH
            ResultValue.objects.create(
                report=report,
                analyte=analyte,
                value=value,
                unit=result_data.get("unit", analyte.unit),
                ref_min=ref_min,
                ref_max=ref_max,
                flag=flag,
                measured_at=measured_at,
            )

        insights = generate_insights(report)
        report.insights = insights
        report.analysis_generated_at = timezone.now()
        report.save(update_fields=["insights", "analysis_generated_at"])
        serializer = ReportSerializer(report, context={"request": request})
        return Response(serializer.data, status=201)


class OnboardingProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = OnboardingProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        patient = Patient.objects.filter(user=self.request.user).first()
        if patient is None:
            raise ValidationError("Patient profile not found.")
        profile, _ = OnboardingProfile.objects.get_or_create(patient=patient)
        return profile

    def perform_update(self, serializer):
        profile = serializer.save()
        patient = profile.patient
        if not patient.is_onboarding_complete:
            patient.is_onboarding_complete = True
            patient.save(update_fields=["is_onboarding_complete"])
