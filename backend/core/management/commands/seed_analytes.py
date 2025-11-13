from __future__ import annotations

from django.core.management.base import BaseCommand

from core.models import Analyte

ANALYTES = [
    ("glucose", "mg/dL", "Glucose (fasting)"),
    ("creatinine", "mg/dL", "Creatinine"),
    ("cholesterol_total", "mg/dL", "Total Cholesterol"),
    ("hdl", "mg/dL", "High-density lipoprotein"),
    ("ldl", "mg/dL", "Low-density lipoprotein"),
    ("triglicerides", "mg/dL", "Triglycerides"),
]


class Command(BaseCommand):
    help = "Seeds the analytes table with common entries"

    def handle(self, *args, **options):
        created = 0
        for name, unit, description in ANALYTES:
            obj, was_created = Analyte.objects.get_or_create(
                name=name,
                defaults={"unit": unit, "description": description},
            )
            if was_created:
                created += 1
        self.stdout.write(self.style.SUCCESS(f"Seed complete. Added {created} analytes."))
