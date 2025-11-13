.PHONY: setup-backend run-backend seed run-frontend

setup-backend:
	@test -d .venv || python3 -m venv .venv
	. .venv/bin/activate && pip install --upgrade pip && pip install -r backend/requirements.txt

run-backend:
	. .venv/bin/activate && cd backend && python manage.py migrate && python manage.py runserver

seed:
	. .venv/bin/activate && cd backend && python manage.py seed_analytes

run-frontend:
	cd frontend && pnpm install && pnpm dev --host
