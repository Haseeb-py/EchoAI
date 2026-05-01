# EchoAI Backend (FastAPI + SQLite)

This backend covers two modules for the 30% FYP submission:
- Auth: signup/login with bcrypt + JWT
- Admin: scripts, personas, and campaign context + activation

## Quick start

1) Create and activate a Python virtual environment.
2) Install dependencies:

```
pip install -r requirements.txt
```

3) Copy environment settings:

```
copy .env.example .env
```

4) Run the server:

```
uvicorn app.main:app --reload
```

## API

Base URL: http://localhost:8000

- POST /api/auth/signup
- POST /api/auth/login
- GET /api/admin/scripts
- POST /api/admin/scripts
- GET /api/admin/scripts/{script_id}
- PUT /api/admin/scripts/{script_id}
- DELETE /api/admin/scripts/{script_id}
- GET /api/admin/personas
- POST /api/admin/personas
- GET /api/admin/personas/{persona_id}
- PUT /api/admin/personas/{persona_id}
- DELETE /api/admin/personas/{persona_id}
- GET /api/admin/campaigns
- POST /api/admin/campaigns
- GET /api/admin/campaigns/{campaign_id}
- PUT /api/admin/campaigns/{campaign_id}
- DELETE /api/admin/campaigns/{campaign_id}
- POST /api/admin/campaigns/{campaign_id}/activate
- POST /api/admin/campaigns/{campaign_id}/pause

## Notes

- SQLite database file is stored at ./echoai.db by default.
- Change DATABASE_URL in .env to switch to PostgreSQL later.
