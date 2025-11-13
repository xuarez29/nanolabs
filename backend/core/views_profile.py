from __future__ import annotations

from django.http import Http404
from rest_framework import generics, permissions

from .models import Patient
from .serializers import PatientSerializer


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = PatientSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        patient = Patient.objects.filter(user=self.request.user).first()
        if patient is None:
            raise Http404("Patient profile not found.")
        return patient
