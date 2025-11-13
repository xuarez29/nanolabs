from __future__ import annotations

from rest_framework.permissions import BasePermission

from .models import Patient, Report, ResultValue, Alert, User


class IsOwnerOrClinical(BasePermission):
    message = "You do not have permission to access this resource."
    clinical_roles = {User.Roles.DOCTOR, User.Roles.LAB, User.Roles.ADMIN}

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user.is_authenticated:
            return False
        if user.role in self.clinical_roles or user.is_staff:
            return True
        patient = None
        if isinstance(obj, Patient):
            patient = obj
        elif isinstance(obj, Report):
            patient = obj.patient
        elif isinstance(obj, ResultValue):
            patient = obj.report.patient
        elif isinstance(obj, Alert):
            patient = obj.patient or (obj.report.patient if obj.report else None)
        return patient is not None and patient.user_id == user.id
