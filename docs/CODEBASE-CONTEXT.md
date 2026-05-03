# EchoAI Codebase Context (Current Implementation)

Last updated: May 3, 2026
Scope: Current implementation snapshot for SDS and engineering reference

## 1. Objective of this Context File

This document is a single, up-to-date context source for developers and AI agents. It summarizes:

1. What this project is and who it serves
2. How the codebase is organized and how it runs
3. Current implementation state versus documentation intent
4. Key modules, data flow, dependencies, and config
5. Testing, reliability, risks, and recommended next steps

Use this file before starting any implementation or documentation task.

---

## 2. Project Identity and Purpose

EchoAI is an AI-powered voice operations platform for BPO teams.

Current repository state:

1. Full-stack: Next.js frontend + FastAPI backend
2. Role-based interface flows for Agent, Supervisor, and Admin
3. Backend authentication and admin user management implemented
4. Some functional modules still run on local UI state (campaigns, scripts, personas, supervisor/agent live call simulations, leads)

Target user roles:

1. Agent: launch and monitor AI-assisted workflows and lead operations
2. Supervisor: monitor team activity and escalations
3. Admin: configure campaigns, scripts, personas, users, security, reports, and system settings

---

## 3. High-Level Repository Map

### Root-level important files

1. README.md (partially updated with one-command dev flow)
2. package.json
3. tsconfig.json
4. tailwind.config.ts
5. middleware.ts
6. CONTRIBUTING.md
7. dev.mjs (one-command launcher for backend + frontend)
8. requirment.txt (project notes/backlog style content, not Python package requirements)
9. next.config.mjs (rewrites /api to backend)

### Main folders

1. docs: project workflow, implementation planning, reference guidance
2. src/app: Next.js App Router entry routes
3. src/components: feature and UI components
4. src/lib: shared auth/navigation/util logic
5. echoai-backend: FastAPI app, models, schemas, routes

### Entry points and boot flow

1. dev.mjs seeds test users, starts backend (uvicorn) + frontend (next dev)
2. src/app/layout.tsx (global layout)
3. src/app/page.tsx (landing route)
4. src/app/login/page.tsx and src/app/signup/page.tsx
5. Protected routes under dashboard, supervisor, and admin
6. middleware.ts enforces protected route access checks (token + role)

Common dev ports:

1. Frontend: http://localhost:3000 (or 3001 if 3000 is busy)
2. Backend: http://127.0.0.1:8000

---

## 4. Documentation Findings and Alignment

Reviewed documentation:

1. docs/EchoAI_Frontend_Workflow.md
2. docs/IMPLEMENTATION-PHASES.md
3. docs/ProjectRD.md
4. docs/SETUP-GUIDE.md
5. CONTRIBUTING.md

Key alignment observations:

1. docs/ProjectRD.md reflects product vision and UX
2. docs/EchoAI_Frontend_Workflow.md describes full-product behavior (voice pipeline, escalation, analytics depth)
3. Current code implements UI-level flows and simulations; backend now exists for auth and admin user management
4. README.md is partially updated but still mixed with template content

Binary docs present but not parsed in this pass:

1. docs/EchoAI_Frontend_Workflow.wps
2. docs/EchoAI_Scope-bds6-032-001-final (1)-2 (1).docx
3. docs/EchoAI_SRS_Final-2.docx

---

## 5. Architecture Overview

### Architecture style

1. Full-stack: Next.js App Router frontend + FastAPI backend
2. Componentized feature modules by domain (admin, auth, dashboard, landing, ui)
3. Route wrappers are thin and delegate UI/business logic to components
4. Role-based access control enforced by middleware and backend auth
5. Next.js rewrites /api/* to the FastAPI backend

### Backend structure (FastAPI)

1. echoai-backend/app/main.py: FastAPI app setup, CORS, router wiring, SQLite migration for user status
2. echoai-backend/app/api/routes: auth, users, scripts, personas, campaigns
3. echoai-backend/app/models: SQLAlchemy models
4. echoai-backend/app/schemas: Pydantic schemas
5. echoai-backend/app/core/security.py: password hashing and JWT creation
6. echoai-backend/app/api/deps.py: auth guards (Bearer token, admin role)

### Text diagram

Client Browser
-> Next.js App Router route (src/app)
-> Feature component (src/components)
-> Shared logic helpers (src/lib)
-> Session persistence (localStorage + cookie)
-> Middleware RBAC guard
-> Next.js /api proxy -> FastAPI backend
-> Render allowed page or redirect to login/unauthorized

### Protection boundaries

Protected route prefixes:

1. /dashboard
2. /supervisor
3. /admin

Middleware matcher and logic in middleware.ts check:

1. token presence
2. token expiration (exp claim)
3. role-to-path authorization

---

## 6. Core Modules and Responsibilities

### 6.1 Auth and RBAC

Primary files:

1. src/lib/auth.ts
2. src/components/auth/LoginForm.tsx
3. src/components/auth/SignupForm.tsx
4. middleware.ts
5. echoai-backend/app/api/routes/auth.py
6. echoai-backend/app/api/deps.py

Responsibilities:

1. Role model and route access mapping
2. Token decode/expiry checks
3. Session persistence and clear helpers
4. Login/signup request helpers (login requires backend; signup has limited fallback when backend is unreachable)
5. Backend token creation, hashing, and role claims

Important behavior:

1. loginWithPassword calls /api/auth/login and expects access_token; no demo fallback
2. signupWithPassword calls /api/auth/signup (admin-only on backend)
3. signupWithPassword returns success only when the endpoint is unavailable (404/405 or backend not reachable); backend errors surface to the UI
4. Login blocked if user status is not active

### 6.2 Backend user management (Admin)

Primary files:

1. echoai-backend/app/api/routes/users.py
2. echoai-backend/app/schemas/user.py
3. echoai-backend/app/models/user.py
4. src/components/admin/UserManagementPage.tsx

Behavior:

1. Admin UI loads users from /api/admin/users
2. Create user posts to /api/admin/users
3. Lock/Unlock/Deactivate uses /api/admin/users/{id}
4. Reset password uses /api/admin/users/{id}/reset-password (returns temporary password)
5. Login is blocked for users with status != active

### 6.3 Routing Layer

Files under src/app are mostly route wrappers that render corresponding components from src/components.

Examples:

1. src/app/admin/users/page.tsx -> UserManagementPage
2. src/app/admin/setup/page.tsx -> ScriptPersonaSetup

### 6.4 Admin Suite

Main admin components:

1. AdminOverview
2. CampaignsPage
3. ScriptPersonaSetup
4. UserManagementPage
5. KnowledgeBasePage
6. GlobalAnalyticsPage
7. LeadsCrmPage
8. ReportsExportsPage
9. SecurityAccessPage
10. SystemSettingsPage
11. AdminNavigation and AdminScreenShell (shared admin layout primitives)

Current behavior pattern:

1. Rich interactive UI state
2. User Management is backed by real backend APIs
3. Script/persona setup, campaign setup, knowledge base, and analytics modules still use mock/demo datasets and local state

### 6.5 Agent and Supervisor Experience

Main files:

1. src/components/dashboard/AgentDashboard.tsx
2. src/components/dashboard/Sidebar.tsx
3. src/components/auth/ProtectedLanding.tsx

Behavior:

1. Agent dashboard is UI-rich and simulation-oriented (localStorage-backed via agent-state)
2. Supervisor route uses live-call simulation state (localStorage-backed via supervisor-state)
3. Cross-role navigation links exist, middleware enforces access control

### 6.6 Design System and UI Atoms

Files:

1. src/components/ui/Button.tsx
2. src/components/ui/ui-components.tsx
3. src/components/ui/design-tokens.ts
4. src/app/globals.css
5. tailwind.config.ts

Pattern:

1. Dark command-center visual system
2. Consistent tokenized colors, spacing, typography and card/button primitives

---

## 7. Data Flow and State Lifecycle

### 7.1 Authentication flow

1. User submits login form
2. Client calls /api/auth/login (proxied to backend)
3. Backend validates credentials and status, returns JWT access_token + user
4. Session stored in localStorage and cookie
5. Redirect to role default route or allowed next route
6. Middleware validates token existence/expiry/role for protected paths

### 7.2 Admin user lifecycle flow

1. Admin creates a user in Admin -> User Access
2. Frontend calls /api/admin/users to persist to backend
3. Backend stores hashed password and status
4. Newly created users can log in immediately
5. Admin can lock/unlock or deactivate, blocking login for non-active status

### 7.3 Campaign setup flow

1. Campaign draft created in CampaignsPage
2. Draft written to localStorage key echoai_campaign_draft
3. ScriptPersonaSetup reads draft and allows edits
4. Readiness computed from script + persona + context completion
5. Activation status updated locally

### 7.4 Knowledge base flow

1. Knowledge items initialized from default in-component data or localStorage
2. CRUD/filter/status updates happen in component state
3. State persisted to localStorage key echoai_knowledge_items

### 7.5 Local storage keys currently in use

1. echoai_token
2. echoai_user
3. echoai_campaign_draft
4. echoai_knowledge_items
5. echoai_agent_campaigns
6. echoai_agent_call_history
7. echoai_agent_leads
8. echoai_agent_scripts
9. echoai_supervisor_team_activity
10. echoai_supervisor_live_calls
11. echoai_supervisor_escalations
12. echoai_supervisor_performance
13. echoai_supervisor_campaign_monitor
14. echoai_supervisor_alerts
15. echoai_supervisor_settings

Backend persistence exists for auth, users, scripts, personas, and campaigns; only user management is currently wired to the frontend UI.

### 7.6 Backend API surface (current)

Auth:

1. POST /api/auth/login
2. POST /api/auth/signup (admin-only)
3. GET /api/health

Admin user management:

1. GET /api/admin/users
2. POST /api/admin/users
3. PUT /api/admin/users/{user_id}
4. POST /api/admin/users/{user_id}/reset-password

Admin content management:

1. /api/admin/scripts (CRUD)
2. /api/admin/personas (CRUD)
3. /api/admin/campaigns (CRUD + activate/pause)

---

## 8. Dependencies and Tooling

From package.json:

Core runtime:

1. next 14.2.16
2. react 18
3. react-dom 18
4. lucide-react
5. clsx
6. tailwind-merge

Dev/tooling:

1. typescript
2. eslint and eslint-config-next
3. tailwindcss
4. postcss

Notes:

1. Frontend: Next.js 14 with Tailwind and TypeScript
2. Backend: FastAPI + SQLAlchemy + SQLite (requirements.txt in echoai-backend)
3. Dev launcher: dev.mjs (seeds users + starts both servers)

---

## 9. Configuration and Environment

Configuration files:

1. tsconfig.json (strict true, alias path mapping)
2. tailwind.config.ts (extended theme and design tokens)
3. postcss.config.mjs
4. next.config.mjs (rewrites /api to backend)
5. middleware.ts (route guard)
6. .eslintrc.json
7. echoai-backend/app/core/config.py (backend env configuration)

Backend environment defaults:

1. DATABASE_URL=sqlite:///./echoai.db
2. SECRET_KEY=change-this-in-production
3. ACCESS_TOKEN_EXPIRE_MINUTES=480
4. CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002

Environment/deployment findings:

1. No .env files committed
2. No Dockerfile or docker-compose files found
3. No CI workflow files found under .github/workflows

---

## 10. Testing and Reliability State

Current testing posture:

1. No test files found via common test naming patterns
2. No test scripts declared in package.json
3. No CI pipeline found

Implication:

1. Reliability is currently dependent on manual testing and local checks
2. High risk for regressions when implementation scales

---

## 11. Strengths

1. Clear modular organization by domain
2. Thin route wrappers and component-first architecture
3. Strong visual consistency via shared design system
4. Good shared admin shell abstractions for repeated page structure
5. Useful local prototype behaviors for early UX iteration

---

## 12. Weaknesses and Technical Debt

1. README still includes template sections
2. No test suite or CI
3. Many workflows still simulated in frontend state
4. Some duplicated scaffolding despite available shared shells
5. User admin flows now real, but other admin modules remain mock

---

## 13. Risks and Gaps

### Security and auth risk

1. Token handling is suitable for dev but still not production hardening
2. Admin signup is now protected; other endpoints should remain protected

### Product/implementation gap risk

1. Docs describe real-time voice and analytics ecosystem
2. Current repository mostly models this at UI/prototype layer
3. Backend contracts exist for auth/users/scripts/personas/campaigns (admin-only)

### Delivery risk

1. No automated tests and no CI quality gates
2. Regression risk increases as implementation accelerates

---

## 14. Suggested Next Steps Before Major Implementation

1. Replace README.md with repository-accurate architecture, setup, and status
2. Document backend API contracts for campaigns, users, knowledge, leads, analytics, reports, and security events
3. Add baseline tests:
   - auth helper unit tests
   - critical component behavior tests
   - one end-to-end login and RBAC flow
4. Add CI pipeline for lint, typecheck, and tests
5. Introduce implementation status matrix that maps each workflow module to one of:
   - implemented
   - mocked/prototype
   - planned
6. Plan migration strategy from localStorage/component state to backend persistence

---

## 15. Quick Orientation Checklist for New Contributors

1. Read docs/ProjectRD.md and docs/EchoAI_Frontend_Workflow.md first
2. Review src/lib/auth.ts and middleware.ts for access model
3. Understand route wrappers in src/app and domain components in src/components
4. Start with admin shared shell patterns before adding new page structures
5. Keep feature behavior explicit when it is frontend-session only

---

## 16. Scope Notes and Assumptions

1. This context reflects the repository state as analyzed on May 3, 2026
2. Binary docs were detected but not parsed in this pass
3. Findings are based on code and markdown available in the workspace

If this file becomes stale after major implementation, update it as part of each milestone.
