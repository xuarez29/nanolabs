from __future__ import annotations

from datetime import date

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import serializers

from .models import Alert, Analyte, OnboardingProfile, Patient, Report, ResultValue
from utils.validators import validate_reference_range

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "role"]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    patient_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    patient_sex = serializers.ChoiceField(
        choices=Patient.Sex.choices, write_only=True, required=False
    )
    patient_birth_date = serializers.DateField(write_only=True, required=False)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "password",
            "role",
            "patient_name",
            "patient_sex",
            "patient_birth_date",
        ]
        extra_kwargs = {"role": {"default": User.Roles.PATIENT, "required": False}}

    def create(self, validated_data):
        patient_name = validated_data.pop("patient_name", None)
        patient_sex = validated_data.pop("patient_sex", None)
        patient_birth_date = validated_data.pop("patient_birth_date", None)
        role = validated_data.get("role", User.Roles.PATIENT)
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email"),
            password=validated_data["password"],
            role=role,
        )
        if role == User.Roles.PATIENT:
            Patient.objects.update_or_create(
                user=user,
                defaults={
                    "name": patient_name or validated_data["username"],
                    "sex": patient_sex or Patient.Sex.OTHER,
                    "birth_date": patient_birth_date or date.today(),
                },
            )
        return user


class OnboardingProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = OnboardingProfile
        fields = ["profile", "medical_background", "lifestyle", "missing_answers", "updated_at"]
        read_only_fields = ["updated_at"]

    def validate(self, attrs):
        profile = attrs.get("profile", {})
        lifestyle = attrs.get("lifestyle", {})
        missing = []

        def validate_range(value, min_v, max_v, field_name):
            if value is None:
                return
            if not (min_v <= value <= max_v):
                raise serializers.ValidationError({field_name: f"Debe estar entre {min_v} y {max_v}"})

        validate_range(profile.get("age"), 0, 120, "age")
        validate_range(profile.get("height"), 50, 250, "height")
        validate_range(profile.get("weight"), 20, 300, "weight")
        sleep_hours = lifestyle.get("sleep_hours")
        validate_range(sleep_hours, 0, 24, "sleep_hours")
        stress_level = lifestyle.get("stress_level")
        validate_range(stress_level, 1, 5, "stress_level")

        medications = attrs.get("medical_background", {}).get("medications")
        if medications is not None and not isinstance(medications, list):
            raise serializers.ValidationError({"medical_background": "medications debe ser una lista"})

        attrs.setdefault("missing_answers", missing)
        return attrs


class PatientSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    derived_age = serializers.SerializerMethodField()
    onboarding = OnboardingProfileSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source="user", write_only=True, required=False
    )

    class Meta:
        model = Patient
        fields = [
            "id",
            "name",
            "sex",
            "birth_date",
            "created_at",
            "user",
            "user_id",
            "derived_age",
            "is_onboarding_complete",
            "onboarding",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "user",
            "derived_age",
            "is_onboarding_complete",
            "onboarding",
        ]

    def get_derived_age(self, obj):
        if not obj.birth_date:
            return None
        today = date.today()
        return today.year - obj.birth_date.year - (
            (today.month, today.day) < (obj.birth_date.month, obj.birth_date.day)
        )


class AnalyteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Analyte
        fields = ["id", "name", "unit", "description"]


class ResultValueSerializer(serializers.ModelSerializer):
    report_id = serializers.PrimaryKeyRelatedField(
        queryset=Report.objects.all(), source="report", write_only=True
    )
    analyte_id = serializers.PrimaryKeyRelatedField(
        queryset=Analyte.objects.all(), source="analyte", write_only=True
    )
    analyte_name = serializers.CharField(source="analyte.name", read_only=True)

    class Meta:
        model = ResultValue
        fields = [
            "id",
            "report",
            "report_id",
            "analyte",
            "analyte_id",
            "analyte_name",
            "value",
            "unit",
            "ref_min",
            "ref_max",
            "flag",
            "measured_at",
        ]
        read_only_fields = ["id", "report", "analyte"]

    def validate(self, attrs):
        ref_min = attrs.get("ref_min")
        ref_max = attrs.get("ref_max")
        if ref_min is not None and ref_max is not None:
            try:
                validate_reference_range(ref_min, ref_max)
            except ValueError as exc:
                raise serializers.ValidationError(str(exc)) from exc
        return attrs


class ReportSerializer(serializers.ModelSerializer):
    patient = PatientSerializer(read_only=True)
    patient_id = serializers.PrimaryKeyRelatedField(
        queryset=Patient.objects.all(), source="patient", write_only=True
    )
    results = ResultValueSerializer(many=True, read_only=True)
    pdf_file_url = serializers.SerializerMethodField()
    pdf_download_url = serializers.SerializerMethodField()

    class Meta:
        model = Report
        fields = [
            "id",
            "patient",
            "patient_id",
            "org_name",
            "issued_at",
            "pdf_url",
            "pdf_file_url",
            "pdf_download_url",
            "raw_json",
            "parsed_fields",
            "insights",
            "analysis_generated_at",
            "results",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "patient",
            "parsed_fields",
            "insights",
            "analysis_generated_at",
            "results",
            "pdf_file_url",
            "pdf_download_url",
        ]

    def get_pdf_file_url(self, obj):
        request = self.context.get("request")
        url = None
        if getattr(obj, "pdf_file", None):
            url = obj.pdf_file.url
        elif obj.pdf_url:
            url = obj.pdf_url
        if not url:
            return None
        if request and not url.startswith(("http://", "https://")):
            return request.build_absolute_uri(url)
        return url

    def get_pdf_download_url(self, obj):
        request = self.context.get("request")
        if not request:
            return None
        relative_url = reverse("report-download", kwargs={"pk": obj.pk})
        return request.build_absolute_uri(relative_url)


class AlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alert
        fields = [
            "id",
            "patient",
            "report",
            "level",
            "rule_key",
            "message",
            "status",
            "created_at",
            "closed_at",
        ]
        read_only_fields = ["id", "created_at"]


class ReportUploadSerializer(serializers.Serializer):
    pdf = serializers.FileField()

    def validate_pdf(self, value):
        content_type = (value.content_type or "").lower()
        if "pdf" not in content_type:
            raise serializers.ValidationError("Only PDF files are supported.")
        return value
