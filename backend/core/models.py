from __future__ import annotations

import uuid
from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models
from pathlib import Path


class User(AbstractUser):
    class Roles(models.TextChoices):
        PATIENT = "patient", "Patient"
        DOCTOR = "doctor", "Doctor"
        LAB = "lab", "Lab"
        ADMIN = "admin", "Admin"

    role = models.CharField(max_length=20, choices=Roles.choices, default=Roles.PATIENT)

    def __str__(self) -> str:  # pragma: no cover - trivial
        return f"{self.username} ({self.role})"


class Patient(models.Model):
    class Sex(models.TextChoices):
        MALE = "M", "Male"
        FEMALE = "F", "Female"
        OTHER = "O", "Other"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="patients",
    )
    name = models.CharField(max_length=255)
    sex = models.CharField(max_length=1, choices=Sex.choices)
    birth_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_onboarding_complete = models.BooleanField(default=False)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:  # pragma: no cover - trivial
        return self.name


class Report(models.Model):
    def report_upload_path(instance: "Report", filename: str) -> str:
        extension = Path(filename).suffix or ".pdf"
        return f"reports/{instance.patient_id}/{uuid.uuid4()}{extension}"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="reports")
    org_name = models.CharField(max_length=255)
    issued_at = models.DateTimeField()
    pdf_file = models.FileField(upload_to=report_upload_path, blank=True, null=True)
    pdf_url = models.URLField(max_length=1024, blank=True)
    raw_json = models.JSONField(default=dict, blank=True)
    parsed_fields = models.JSONField(default=dict, blank=True)
    insights = models.JSONField(default=dict, blank=True)
    analysis_generated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-issued_at"]

    def __str__(self) -> str:  # pragma: no cover
        return f"Report {self.id}"


class Analyte(models.Model):
    name = models.CharField(max_length=255, unique=True)
    unit = models.CharField(max_length=64)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:  # pragma: no cover
        return self.name


class ResultValue(models.Model):
    class Flag(models.TextChoices):
        NORMAL = "normal", "Normal"
        HIGH = "high", "High"
        LOW = "low", "Low"

    report = models.ForeignKey(Report, on_delete=models.CASCADE, related_name="results")
    analyte = models.ForeignKey(Analyte, on_delete=models.PROTECT, related_name="results")
    value = models.DecimalField(max_digits=12, decimal_places=4)
    unit = models.CharField(max_length=64)
    ref_min = models.DecimalField(max_digits=12, decimal_places=4)
    ref_max = models.DecimalField(max_digits=12, decimal_places=4)
    flag = models.CharField(max_length=20, choices=Flag.choices, default=Flag.NORMAL)
    measured_at = models.DateTimeField()

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=models.Q(ref_min__lte=models.F("ref_max")),
                name="ref_range_valid",
            )
        ]

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.analyte.name} - {self.value}{self.unit}"


class Alert(models.Model):
    class Level(models.TextChoices):
        INFO = "info", "Info"
        WARNING = "warning", "Warning"
        CRITICAL = "critical", "Critical"

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        CLOSED = "closed", "Closed"

    patient = models.ForeignKey(
        Patient, null=True, blank=True, on_delete=models.CASCADE, related_name="alerts"
    )
    report = models.ForeignKey(
        Report, null=True, blank=True, on_delete=models.CASCADE, related_name="alerts"
    )
    level = models.CharField(max_length=20, choices=Level.choices)
    rule_key = models.CharField(max_length=255)
    message = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    created_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:  # pragma: no cover
        return f"Alert {self.level} - {self.rule_key}"


class OnboardingProfile(models.Model):
    patient = models.OneToOneField(Patient, on_delete=models.CASCADE, related_name="onboarding")
    profile = models.JSONField(default=dict, blank=True)
    medical_background = models.JSONField(default=dict, blank=True)
    lifestyle = models.JSONField(default=dict, blank=True)
    missing_answers = models.JSONField(default=list, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:  # pragma: no cover
        return f"OnboardingProfile({self.patient_id})"
