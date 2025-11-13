from __future__ import annotations

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0002_report_parsed_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="report",
            name="analysis_generated_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="report",
            name="insights",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
