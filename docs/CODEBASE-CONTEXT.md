# EchoAI Detailed Codebase Context

**Last Updated**: May 5, 2026
**Version**: 1.1.0
**Scope**: Full-stack implementation reference (Next.js + FastAPI)

---

## August 13, 2026 Operational Update

This document contains historical architecture notes. The current implementation baseline is [ECHOAI-TRACK-B-ONE-WEEK-PLAN-2026-08-13.md](ECHOAI-TRACK-B-ONE-WEEK-PLAN-2026-08-13.md).

- Active Agent, Supervisor, Admin analytics, CRM, campaign, report, and escalation routes now use persisted FastAPI data rather than the legacy LocalStorage simulation stores.
- The temporary Deepgram/Groq voice lab is an adapter for the future teammate-owned 3A streaming pipeline; it already uses the stable Track B call, turn, and completion APIs.
- Campaign history is retained through `completed` and `archived`; deletion is rejected.
- `app.main` is the sole supported FastAPI entry point. `app.main_mvp` is a compatibility alias only.
- The remaining non-Track-B product scope is Module 3A production streaming plus teammate-owned Modules 7 and 8. Production hardening still needs formal migrations and expanded test coverage.

---

## 1. Project Purpose & Vision

EchoAI is a premium, AI-powered voice operations platform designed for BPO (Business Process Outsourcing) teams. It bridges the gap between traditional human-led voice operations and AI-assisted workflows. The platform provides a "command center" experience for three distinct roles:
1.  **Agents**: Execute AI-assisted calls, manage leads, and handle live simulations.
2.  **Supervisors**: Monitor team performance, intercept live calls, and handle escalations.
3.  **Admins**: Configure the system, manage users, and define the "intelligence" (scripts, personas, campaigns).

---

## 2. Technology Stack

### Frontend (Next.js 14)
-   **Framework**: Next.js 14 (App Router) for SEO, performance, and modern routing.
-   **Styling**: Tailwind CSS for rapid, utility-first design.
-   **Icons**: Lucide React for consistent, lightweight iconography.
-   **State Management**: LocalStorage for simulation persistence; React hooks for UI state.
-   **Auth**: JWT-based authentication with role-based access control (RBAC).

### Backend (FastAPI)
-   **Framework**: FastAPI for high-performance, asynchronous API development with automatic OpenAPI docs.
-   **Database**: SQLite (Development) with SQLAlchemy ORM for data persistence.
-   **Validation**: Pydantic for strict request/response schema validation.
-   **Security**: Passlib (Bcrypt) for password hashing and PyJWT for secure token handling.

---

## 3. High-Level Repository Structure

```text
EchoAI/
├── .github/              # GitHub-specific workflows and prompts
├── docs/                 # Comprehensive documentation and diagrams
├── echoai-backend/       # FastAPI Backend Service
│   ├── app/              # Core application logic
│   │   ├── api/          # API Route handlers
│   │   ├── core/         # Security and configuration
│   │   ├── db/           # Database sessions
│   │   ├── models/       # SQLAlchemy models
│   │   └── schemas/      # Pydantic schemas
│   └── requirements.txt  # Python dependencies
├── src/                  # Next.js Frontend
│   ├── app/              # Routes and Pages (App Router)
│   ├── components/       # UI and Feature components
│   └── lib/              # Shared logic and utilities
├── middleware.ts         # Next.js RBAC Guard
├── dev.mjs               # Unified development launcher
└── package.json          # Frontend dependencies and scripts
```

---

## 4. Detailed File-by-File Reference

### 4.1 Root Configuration & Tools

| File | Tech | Purpose | Rationale |
| :--- | :--- | :--- | :--- |
| `dev.mjs` | Node.js | Unified launcher. | Automatically seeds test users and starts both Frontend and Backend with one command. |
| `middleware.ts` | Next.js Middleware | RBAC Route Guard. | Intercepts requests to `/admin`, `/supervisor`, and `/dashboard` to ensure valid JWT and correct role permissions. |
| `next.config.mjs` | Next.js | Next.js Config. | Handles API rewrites, proxying `/api/*` to the FastAPI backend (`localhost:8000`). |
| `tailwind.config.ts` | Tailwind | Design System. | Customizes the visual identity with a dark command-center theme and specialized colors. |
| `tsconfig.json` | TypeScript | TS Configuration. | Enforces strict typing and defines path aliases (e.g., `@/*` for `src/*`). |
| `package.json` | npm | Frontend Manifest. | Defines dependencies (Next.js, React, Tailwind) and dev scripts. |
| `LOGIN_CREDENTIALS.md` | Markdown | Dev Reference. | Lists default accounts (Admin, Supervisor, Agent) for rapid testing. |
| `requirment.txt` | Text | Project Backlog. | Contains development notes, feature ideas, and implementation status tracking. |

### 4.2 Backend: `echoai-backend/`

#### Core & DB
-   **`app/main.py`**: The entry point. Initializes FastAPI, sets up CORS, wires all routers, and handles SQLite table migrations (e.g., adding `status` to `users`).
-   **`app/core/config.py`**: Centralized environment variables and settings (DB URL, JWT Secret, CORS origins).
-   **`app/core/security.py`**: Logic for password hashing (Bcrypt) and JWT creation/verification.
-   **`app/db/session.py`**: Initializes the SQLAlchemy engine and provides a session factory.
-   **`app/db/base.py`**: Base class for SQLAlchemy models to enable automatic table creation.
-   **`seed_test_users.py`**: Script to populate the database with initial Admin, Supervisor, and Agent accounts.

#### API Routes (`app/api/routes/`)
-   **`auth.py`**: Handles `/api/auth/login` and `/api/auth/signup`. Issues JWTs and manages user session data.
-   **`users.py`**: Admin-only routes for user CRUD, status locking, and password resets.
-   **`campaigns.py`**: Logic for creating, listing, and managing campaign lifecycles.
-   **`scripts.py` / `personas.py`**: CRUD for the AI's "brain" (what they say and who they are).
-   **`agent.py`**: Routes for agent-specific operations like starting call sessions and fetching assigned work.
-   **`deps.py`**: FastAPI dependencies for injecting DB sessions and enforcing auth guards (e.g., `get_current_admin_user`).

#### Models & Schemas
-   **`app/models/user.py`**: Database model for user accounts, including roles and statuses.
-   **`app/models/campaign.py`**: Database model for campaigns, linking scripts and personas.
-   **`app/schemas/user.py`**: Pydantic models for user creation, login, and response formatting.
-   **`app/schemas/auth.py`**: Pydantic models for token structure and login requests.

### 4.3 Frontend: `src/`

#### The App Router (`src/app/`)
-   **`layout.tsx`**: The root layout providing the base HTML structure, global CSS, and font initialization.
-   **`page.tsx`**: The public landing page highlighting product features.
-   **`login/page.tsx`**: Integrated login form with backend authentication.
-   **`signup/page.tsx`**: Signup interface (currently redirects to admin-controlled flows).
-   **`unauthorized/page.tsx`**: Fallback page for role-based access denials.

**Admin Routes (`src/app/admin/`)**
-   **`page.tsx`**: Admin overview dashboard with high-level system stats.
-   **`analytics/page.tsx`**: Global analytics view for cross-campaign performance.
-   **`campaigns/page.tsx`**: Management interface for creating and monitoring campaigns.
-   **`knowledge/page.tsx`**: Repository for training data and company knowledge items.
-   **`leads/page.tsx`**: Master CRM view for all leads in the system.
-   **`reports/page.tsx`**: Exporting tools for campaign and agent performance data.
-   **`security/page.tsx`**: Interface for auditing access logs and security events.
-   **`settings/page.tsx`**: Global system configuration (API keys, voice providers).
-   **`setup/page.tsx`**: Specialized interface for configuring Scripts and Personas.
-   **`users/page.tsx`**: The primary user management interface (integrated with backend).

**Supervisor Routes (`src/app/supervisor/`)**
-   **`page.tsx`**: Supervisor command center.
-   **`activity/page.tsx`**: Live feed of team activities and status changes.
-   **`alerts/page.tsx`**: Real-time notification center for critical call events.
-   **`campaigns/page.tsx`**: Monitoring active campaigns from a management perspective.
-   **`escalations/page.tsx`**: Queue for calls requiring supervisor intervention.
-   **`performance/page.tsx`**: Detailed metrics on agent and campaign ROI.

**Agent Routes (`src/app/dashboard/`)**
-   **`page.tsx`**: Agent's personal workspace.
-   **`live/page.tsx`**: The active call interface for participating in voice sessions.
-   **`history/page.tsx`**: Log of completed calls and outcomes.
-   **`leads/page.tsx`**: List of assigned leads for the current session.
-   **`campaigns/page.tsx`**: View of campaigns the agent is currently enrolled in.

#### Components (`src/components/`)
-   **`ui/`**: Atomic components like `Button.tsx`, `ui-components.tsx` (cards, inputs, badges), and `design-tokens.ts` which centralizes the color palette and spacing system.
-   **`app/`**: Shared layout elements like `AppTopbar.tsx`, providing a consistent header with user profile and session info.
-   **`auth/`**: `LoginForm.tsx`, `SignupForm.tsx`, `AuthShell.tsx`, and `SessionDock.tsx` for managing the authentication UI and session persistence.
-   **`admin/`**: High-level components like `AdminNavigation.tsx`, `AdminScreenShell.tsx`, and specialized pages like `ScriptPersonaSetup.tsx` and `UserManagementPage.tsx`.
-   **`supervisor/`**: Specialized components like `live-calls.tsx`, `CallCockpitPage.tsx`, and `TeamActivityPage.tsx` for real-time operations.
-   **`dashboard/`**: `AgentDashboard.tsx`, `AgentWorkflows.tsx`, and `Sidebar.tsx` tailored for the agent's calling workflow.
-   **`landing/`**: `LandingPage.tsx` component that defines the primary marketing interface.

#### Libs & Utilities (`src/lib/`)
-   **`auth.ts`**: The "source of truth" for auth state. Decodes JWTs, checks roles, and manages cookies/localStorage.
-   **`api-client.ts`**: A standardized wrapper around `fetch` that automatically injects auth headers and handles API errors.
-   **`navigation.ts`**: Centralized configuration of sidebar links and role-based menu structures.
-   **`utils.ts`**: Common utility functions like `cn` (class merging) and formatters.
-   **`agent-state.ts` / `supervisor-state.ts`**: Logic for persisting and retrieving simulation data from LocalStorage.

---

## 5. System Workflow

### 5.1 Bootstrapping & Dev Flow
1.  Developer runs `node dev.mjs`.
2.  Backend seeds default users into `echoai.db`.
3.  FastAPI starts on port `8000`.
4.  Next.js starts on port `3000`.

### 5.2 Authentication & RBAC Flow
1.  **Login**: User submits credentials to `/api/auth/login`.
2.  **JWT**: Backend returns a JWT containing the user ID and role (`admin`, `supervisor`, or `agent`).
3.  **Storage**: Frontend stores the token in a cookie (`echoai_token`) and user data in `localStorage`.
4.  **Guard**: When the user navigates, `middleware.ts` reads the cookie. If the token is missing, expired, or the role doesn't match the path (e.g., an agent trying to access `/admin`), they are redirected to `/login` or `/unauthorized`.

### 5.3 Administrative Workflow
1.  **User Creation**: Admin goes to `/admin/users` to create new accounts. This persists directly to the SQLite database.
2.  **Configuration**: Admin defines Scripts and Personas. These are linked to Campaigns.
3.  **Persistence**: While UI-driven, these configurations are designed to be synced with the Backend's campaign models.

### 5.4 Operational Workflow (Agent/Supervisor)
1.  **Campaign Activation**: Agents see assigned campaigns in their dashboard.
2.  **Simulation**: Calls are handled via the `AgentDashboard`. Live data is mirrored to `supervisor-state` in LocalStorage.
3.  **Monitoring**: Supervisors monitor the "Live Call Cockpit," seeing real-time transcripts and sentiment (simulated via local state).

---

## 6. Current Implementation State

-   **Backend Ready**: Auth, User Management, Campaign CRUD, and API security are fully implemented in Python.
-   **Frontend Integrated**: Auth and User Management are fully "wired" to the backend.
-   **Frontend Simulated**: Complex voice operations (transcription, sentiment analysis, call simulations) use sophisticated LocalStorage-backed state. This allows for rapid UX testing before the full real-time voice pipeline is integrated.

---

## 7. Recommended Development Practices

1.  **Keep it Typed**: Always define interfaces for component props and API responses in TypeScript.
2.  **Use UI Atoms**: Do not recreate buttons or cards; use `src/components/ui/`.
3.  **Auth Guarding**: If adding a new role-based route, ensure it's added to the `matcher` in `middleware.ts`.
4.  **Backend Sync**: When moving from simulation to real data, update `api-client.ts` calls and replace `lib/agent-state.ts` usage with backend fetch hooks.
