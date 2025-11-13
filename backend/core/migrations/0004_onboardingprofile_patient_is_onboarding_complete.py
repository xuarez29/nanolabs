from __future__ import annotations

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0003_report_insights"),
    ]

    operations = [
        migrations.AddField(
            model_name="patient",
            name="is_onboarding_complete",
            field=models.BooleanField(default=False),
        ),
        migrations.CreateModel(
            name="OnboardingProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("profile", models.JSONField(blank=True, default=dict)),
                ("medical_background", models.JSONField(blank=True, default=dict)),
                ("lifestyle", models.JSONField(blank=True, default=dict)),
                ("missing_answers", models.JSONField(blank=True, default=list)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "patient",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="onboarding",
                        to="core.patient",
                    ),
                ),
            ],
        ),
    ]
