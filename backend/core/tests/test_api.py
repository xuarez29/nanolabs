from __future__ import annotations

import shutil
import tempfile
from datetime import date, datetime, timezone

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings

from rest_framework import status
from rest_framework.test import APITestCase

from core.models import Patient, Report, ResultValue, User


class AuthFlowTests(APITestCase):
    def test_user_registration_and_login(self):
        payload = {
            "username": "patient1",
            "email": "patient1@example.com",
            "password": "supersecret",
            "patient_name": "Patient One",
            "patient_sex": "F",
            "patient_birth_date": "1995-05-10",
        }
        response = self.client.post("/api/auth/register/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("tokens", response.data)
        self.assertTrue(Patient.objects.filter(user__username="patient1").exists())

        login_resp = self.client.post(
            "/api/auth/login/", {"username": "patient1", "password": "supersecret"}, format="json"
        )
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)
        self.assertIn("access", login_resp.data)


class PatientTests(APITestCase):
    def setUp(self):
        self.doctor = User.objects.create_user(
            username="doc1", password="strongpass", role=User.Roles.DOCTOR
        )

    def test_create_patient(self):
        self.client.force_authenticate(user=self.doctor)
        payload = {
            "name": "John Doe",
            "sex": "M",
            "birth_date": "1990-01-01",
        }
        response = self.client.post("/api/patients/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Patient.objects.count(), 1)


class ReportTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="patient2", password="supersecret", role=User.Roles.PATIENT
        )
        self.patient = Patient.objects.create(
            user=self.user,
            name="Jane Roe",
            sex="F",
            birth_date=date(1992, 6, 15),
        )

    def test_create_and_list_reports(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            "patient_id": str(self.patient.id),
            "org_name": "Nano Labs",
            "issued_at": datetime.now(timezone.utc).isoformat(),
            "pdf_url": "http://example.com/report.pdf",
            "raw_json": {"value": 123},
        }
        response = self.client.post("/api/reports/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        report = Report.objects.get()
        self.assertEqual(report.patient, self.patient)

        list_resp = self.client.get(f"/api/reports/?patient_id={self.patient.id}")
        self.assertEqual(list_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(list_resp.data["count"], 1)


class ReportUploadTests(APITestCase):
    def setUp(self):
        self.media_dir = tempfile.mkdtemp()
        self.addCleanup(lambda: shutil.rmtree(self.media_dir, ignore_errors=True))
        self.override = override_settings(MEDIA_ROOT=self.media_dir)
        self.override.enable()
        self.addCleanup(self.override.disable)
        self.user = User.objects.create_user(
            username="upload_patient", password="supersecret", role=User.Roles.PATIENT
        )
        self.patient = Patient.objects.create(
            user=self.user, name="Uploader", sex="O", birth_date=date(1990, 1, 1)
        )

    def test_upload_pdf_creates_report_for_patient(self):
        self.client.force_authenticate(user=self.user)
        pdf_file = SimpleUploadedFile("report.pdf", b"%PDF-1.4 test", content_type="application/pdf")
        response = self.client.post("/api/reports/upload/", {"pdf": pdf_file}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Report.objects.count(), 1)
        report = Report.objects.first()
        self.assertEqual(report.patient, self.patient)
        self.assertIn("parsed_fields", response.data)
        self.assertIn("analytes", response.data["parsed_fields"])
        self.assertIn("results", response.data)
        self.assertGreater(ResultValue.objects.filter(report=report).count(), 0)
        self.assertIn("insights", response.data)
        self.assertIsNotNone(report.analysis_generated_at)


class ProfileViewTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="profile_user", password="supersecret", role=User.Roles.PATIENT
        )
        self.patient = Patient.objects.create(
            user=self.user, name="Profile User", sex="O", birth_date=date(1991, 7, 1)
        )

    def test_get_and_update_profile(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.get("/api/profile/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["name"], "Profile User")
        update_resp = self.client.put(
            "/api/profile/",
            {"name": "Updated Name", "birth_date": "1990-01-01", "sex": "F"},
            format="json",
        )
        self.assertEqual(update_resp.status_code, status.HTTP_200_OK)
        self.patient.refresh_from_db()
        self.assertEqual(self.patient.name, "Updated Name")
