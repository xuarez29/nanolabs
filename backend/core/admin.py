from django.contrib import admin

from .models import Alert, Analyte, Patient, Report, ResultValue, User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("username", "email", "role", "is_staff")
    list_filter = ("role", "is_staff")
    search_fields = ("username", "email")


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ("name", "sex", "birth_date", "user")
    search_fields = ("name",)
    list_filter = ("sex",)


admin.site.register(Report)
admin.site.register(Analyte)
admin.site.register(ResultValue)
admin.site.register(Alert)
