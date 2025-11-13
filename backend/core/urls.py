from django.urls import path

from . import views
from .views_profile import ProfileView

urlpatterns = [
    path("patients/", views.PatientListCreateView.as_view(), name="patient-list"),
    path("patients/<uuid:pk>/", views.PatientDetailView.as_view(), name="patient-detail"),
    path("reports/", views.ReportListCreateView.as_view(), name="report-list"),
    path("reports/<uuid:pk>/", views.ReportDetailView.as_view(), name="report-detail"),
    path("reports/<uuid:pk>/download/", views.ReportDownloadView.as_view(), name="report-download"),
    path("reports/<uuid:pk>/delete/", views.ReportDeleteView.as_view(), name="report-delete"),
    path("reports/upload/", views.ReportUploadView.as_view(), name="report-upload"),
    path("report-trends/", views.ReportTrendsView.as_view(), name="report-trends"),
    path("profile/", ProfileView.as_view(), name="profile"),
    path("onboarding/", views.OnboardingProfileView.as_view(), name="onboarding"),
    path("analytes/", views.AnalyteListCreateView.as_view(), name="analyte-list"),
    path("result-values/", views.ResultValueListCreateView.as_view(), name="resultvalue-list"),
    path("alerts/", views.AlertListView.as_view(), name="alert-list"),
]
