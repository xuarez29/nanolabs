from __future__ import annotations

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="report",
            name="parsed_fields",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
