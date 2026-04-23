# EchoAI Codebase Context (Pre-Implementation)

Last updated: April 24, 2026
Scope: Read-only analysis of the current repository state

## 1. Objective of this Context File

This document is a single pre-implementation context source for developers and AI agents. It summarizes:

1. What this project is and who it serves
2. How the codebase is organized and how it runs
3. Current implementation state versus documentation intent
4. Key modules, data flow, dependencies, and config
5. Testing, reliability, risks, and recommended next steps

Use this file before starting any implementation task.

---

## 2. Project Identity and Purpose

EchoAI is an AI-powered voice operations platform concept for BPO teams.

Current repository state:

1. Frontend-focused Next.js application
2. Role-based interface flows for Agent, Supervisor, and Admin
3. Prototype behavior with local state and localStorage in several modules
4. Backend integrations described in docs, but not implemented in this repository yet

Target user roles:

1. Agent: launch and monitor AI-assisted workflows and lead operations
2. Supervisor: monitor team activity and escalations
3. Admin: configure campaigns, scripts, personas, users, security, reports, and system settings

---

## 3. High-Level Repository Map

### Root-level important files

1. README.md (currently generic Next.js template, not project-specific)
2. package.json
3. tsconfig.json
4. tailwind.config.ts
5. middleware.ts
6. CONTRIBUTING.md
7. requirment.txt (project notes/backlog style content, not Python package requirements)

### Main folders

1. docs: project workflow, implementation planning, reference guidance
2. src/app: Next.js App Router entry routes
3. src/components: feature and UI components
4. src/lib: shared auth/navigation/util logic

### Entry points and boot flow

1. src/app/layout.tsx (global layout)
2. src/app/page.tsx (landing route)
3. src/app/login/page.tsx and src/app/signup/page.tsx
4. Protected routes under dashboard, supervisor, and admin
5. middleware.ts enforces protected route access checks

---

## 4. Documentation Findings and Alignment

Reviewed documentation:

1. docs/EchoAI_Frontend_Workflow.md
2. docs/IMPLEMENTATION-PHASES.md
3. docs/ProjectRD.md
4. docs/SETUP-GUIDE.md
5. CONTRIBUTING.md

Key alignment observations:

1. docs/ProjectRD.md accurately reflects current frontend-first prototype status
2. docs/EchoAI_Frontend_Workflow.md describes broader full-product behavior (voice pipeline, escalation, analytics depth)
3. Current code implements UI-level flows and simulation for many of those concepts, but not backend-connected operations
4. README.md is outdated and inconsistent with real project purpose

Binary docs present but not parsed in this pass:

1. docs/EchoAI_Frontend_Workflow.wps
2. docs/EchoAI_Scope-bds6-032-001-final (1)-2 (1).docx
3. docs/EchoAI_SRS_Final-2.docx

---

## 5. Architecture Overview

### Architecture style

1. Frontend monolith using Next.js App Router
2. Componentized feature modules by domain (admin, auth, dashboard, landing, ui)
3. Route wrappers are mostly thin and delegate UI/business logic to components
4. Role-based access control enforced by middleware and auth helpers

### Text diagram

Client Browser
-> Next.js App Router route (src/app)
-> Feature component (src/components)
-> Shared logic helpers (src/lib)
-> Session persistence (localStorage + cookie)
-> Middleware RBAC guard
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

Responsibilities:

1. Role model and route access mapping
2. Token decode/expiry checks
3. Session persistence and clear helpers
4. Login/signup request helpers with API fallback behavior

Important behavior:

1. loginWithPassword attempts /api/auth/login
2. signupWithPassword attempts /api/auth/signup
3. If endpoint is unavailable, helper returns demo-mode behavior

### 6.2 Routing Layer

Files under src/app are mostly route wrappers that render corresponding components from src/components.

Examples:

1. src/app/admin/users/page.tsx -> UserManagementPage
2. src/app/admin/setup/page.tsx -> ScriptPersonaSetup

### 6.3 Admin Suite

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
2. Mock/demo datasets inside components
3. localStorage use for selected flows where cross-screen persistence is needed

### 6.4 Agent and Supervisor Experience

Main files:

1. src/components/dashboard/AgentDashboard.tsx
2. src/components/dashboard/Sidebar.tsx
3. src/components/auth/ProtectedLanding.tsx

Behavior:

1. Agent dashboard is UI-rich and simulation-oriented
2. Supervisor route uses protected landing composition
3. Cross-role navigation links exist, while middleware enforces final access control

### 6.5 Design System and UI Atoms

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
2. Client helper attempts API auth
3. On API absence/failure class, fallback returns demo token/user
4. Session stored in localStorage and cookie
5. Redirect to role default route or allowed next route
6. Middleware validates token existence/expiry/role for protected paths

### 7.2 Campaign setup flow

1. Campaign draft created in CampaignsPage
2. Draft written to localStorage key echoai_campaign_draft
3. ScriptPersonaSetup reads draft and allows edits
4. Readiness computed from script + persona + context completion
5. Activation status updated locally

### 7.3 Knowledge base flow

1. Knowledge items initialized from default in-component data or localStorage
2. CRUD/filter/status updates happen in component state
3. State persisted to localStorage key echoai_knowledge_items

### 7.4 Local storage keys currently in use

1. echoai_token
2. echoai_user
3. echoai_campaign_draft
4. echoai_knowledge_items

No database interactions are implemented in this repository.

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

1. This is a frontend stack only in current repo state
2. No backend framework runtime is present in repository dependencies

---

## 9. Configuration and Environment

Configuration files:

1. tsconfig.json (strict true, alias path mapping)
2. tailwind.config.ts (extended theme and design tokens)
3. postcss.config.mjs
4. next.config.mjs
5. middleware.ts (route guard)
6. .eslintrc.json

Environment/deployment findings:

1. No .env files found in repository scan
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

1. README is not aligned with project reality
2. No test suite or CI
3. Significant logic currently simulated in frontend state instead of backend-backed workflows
4. Some duplicated scaffolding despite available shared shells
5. Prototype auth/session strategy not production-ready

---

## 13. Risks and Gaps

### Security and auth risk

1. Token handling is prototype-level; flow is suitable for demo but not production hardening
2. API fallback can hide backend outages by silently moving to demo behavior

### Product/implementation gap risk

1. Docs describe real-time voice and analytics ecosystem
2. Current repository mostly models this at UI/prototype layer
3. Backend contracts/entities/endpoints are not yet present here

### Delivery risk

1. No automated tests and no CI quality gates
2. Regression risk increases as implementation accelerates

---

## 14. Suggested Next Steps Before Major Implementation

1. Replace README.md with repository-accurate architecture, setup, and status
2. Define backend API contracts for auth, campaigns, users, knowledge, leads, analytics, reports, and security events
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

1. This context reflects the repository state as analyzed on April 24, 2026
2. Binary docs were detected but not parsed in this pass
3. Findings are based on code and markdown available in the workspace

If this file becomes stale after major implementation, update it as part of each milestone.
