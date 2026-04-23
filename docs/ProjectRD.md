# EchoAI Project Reference Document

This document is the shared reference for continuing EchoAI frontend work across AI sessions, teammates, and future development phases. Use it together with `docs/EchoAI_Frontend_Workflow.md`, which remains the source of truth for user-role workflows and SRS-derived screen requirements.

## 1. Product Summary

EchoAI is an AI-powered voice sales and support platform for BPO environments. It lets admins configure campaigns, scripts, personas, knowledge, users, and system controls. Agents launch and monitor AI-managed calling sessions. Supervisors monitor escalations, whisper guidance, and take over high-risk calls.

Core roles:

- Admin: full system configuration, users, campaigns, scripts, knowledge, analytics, CRM, security, settings.
- Agent: launch AI call sessions, monitor assigned calls, manage assigned CRM leads.
- Supervisor: monitor team calls, manage escalations, review team analytics and CRM.

Current frontend phase:

- Backend/database is not connected yet.
- Interactive admin data uses React state or `localStorage`.
- Screens should behave like realistic frontend prototypes while staying easy to connect to APIs later.

## 2. Current Admin Flow

The current admin journey is:

1. Admin logs in.
2. Admin lands on `/admin` overview.
3. Admin creates campaign container at `/admin/campaigns`.
4. Admin configures script/persona/context at `/admin/setup`.
5. Admin manages users at `/admin/users`.
6. Admin manages AI knowledge at `/admin/knowledge`.
7. Admin reviews analytics, CRM, reports, security, and settings through the remaining admin routes.

Admin routes currently implemented:

- `/admin` - Admin Overview
- `/admin/campaigns` - Campaign Management
- `/admin/setup` - M7 Script & Persona Setup
- `/admin/users` - User Management
- `/admin/knowledge` - Knowledge Base
- `/admin/analytics` - Global Analytics
- `/admin/leads` - Leads & CRM
- `/admin/reports` - Reports & Exports
- `/admin/security` - Security & Access
- `/admin/settings` - System Settings

## 3. Design System

EchoAI uses a dark enterprise AI command-center visual style.

Primary visual rules:

- Use dark layered backgrounds, not flat black.
- Use rounded cards with subtle borders and soft radial glows.
- Use uppercase micro-labels with wide letter spacing for section labels.
- Use large compressed headings with `font-headline`.
- Use lucide-react outline icons inside rounded icon containers.
- Keep actions clear and role-specific.
- Avoid default-looking dashboards and generic white cards.

Color palette:

- Page background: `#080A13`, `#0D0F1A`
- Card background: `#111420`, `#151824`, `#191c28`
- Primary accent: `#b9b7ff`, `#6366F1`
- Secondary accent: `#f3a8ff`, `#D946EF`
- Tertiary/warning accent: `#f6c56f`, `#F59E0B`
- Success accent: `#a7f3c4`
- Cyan accent: `#8fdde0`, `#7ad3d8`
- Text primary: `text-white`
- Text muted: `text-white/42`, `text-white/56`, `text-white/70`
- Borders: `border-white/[0.06]`, `border-white/10`, accent borders for key panels.

Typography:

- Headings and large metrics use `font-headline`.
- Body and controls use existing UI font classes.
- Main page titles usually use:
  `font-headline text-[50px] font-semibold leading-[0.98] tracking-[-0.04em]`
- Section titles usually use:
  `font-headline text-[28px] font-semibold tracking-[-0.03em]`
- Eyebrows usually use:
  `text-[10px] or text-[11px] font-semibold uppercase tracking-[0.18em-0.22em] text-white/38`

Icon style:

- Use `lucide-react`.
- Prefer size `14-19`, stroke width `2.1`.
- Wrap important icons in:
  `grid h-10 w-10 place-items-center rounded-[12px] border border-white/10 bg-white/[0.04]`

## 4. Shared Components

Core UI atoms live in:

- `src/components/ui/Button.tsx`
- `src/components/ui/ui-components.tsx`

Admin layout and reusable admin patterns live in:

- `src/components/admin/AdminNavigation.tsx`
- `src/components/admin/AdminScreenShell.tsx`

Use these admin shared components before creating new local variants:

- `AdminScreenShell`: standard admin page frame with sidebar, topbar, title, description.
- `AdminStatCard`: standard admin metric card.
- `SectionTitle`: repeated section eyebrow/title block.
- `AdminPanel`: standard admin card wrapper for new panels.
- `AdminFormField`: standard input/textarea field.
- `AdminSelectField`: standard select field.
- `AdminMessage`: standard feedback/status message.

Recommended import pattern for admin pages:

```tsx
import {
  AdminFormField,
  AdminMessage,
  AdminPanel,
  AdminScreenShell,
  AdminStatCard,
  SectionTitle,
} from "@/components/admin/AdminScreenShell";
```

## 5. Code Architecture

Routing:

- Use Next.js App Router under `src/app`.
- Route files should be thin and import a page component from `src/components`.
- Example:

```tsx
import UserManagementPage from "@/components/admin/UserManagementPage";

export default function AdminUsersRoute() {
  return <UserManagementPage />;
}
```

Admin pages:

- Keep page-specific sample data in the page component file unless it becomes shared.
- Use local React state for frontend-only interactions.
- Use `localStorage` only when data must pass between admin screens before backend integration.
- Do not add fake backend abstractions yet unless the user asks for backend planning.

Current localStorage key:

- `echoai_campaign_draft`: used by Campaign Management and M7 Script & Persona Setup.

Navigation:

- Admin sidebar route definitions are centralized in `AdminNavigation.tsx`.
- New admin screens must be added to `adminNavItems`.
- Sidebar icons must show hover tooltips.
- Do not leave clickable-looking buttons without behavior. If behavior is planned, label it clearly as planned or provide frontend-session behavior.

## 6. Interaction Rules

Frontend prototype behavior should still feel real:

- Forms must validate required fields.
- Buttons should update state, show a message, open a panel, or navigate.
- Three-dot menus must open actionable menus, not placeholders.
- Status actions should update the UI immediately.
- If backend is not connected, messages should say the change is saved in the current frontend session only.

Current examples:

- Campaign creation saves draft to `localStorage`, then routes to M7.
- M7 reads the draft and gates activation based on script, persona, and context completion.
- User Management changes account state in local component state.
- Knowledge Base add/edit/delete/search/filter/status actions work in local component state.

## 7. Screen Ownership

Admin component files:

- `AdminOverview.tsx`: admin landing summary.
- `CampaignsPage.tsx`: campaign container creation and campaign list.
- `ScriptPersonaSetup.tsx`: M7 setup for scripts, persona, context, activation.
- `UserManagementPage.tsx`: create users, account states, access details.
- `KnowledgeBasePage.tsx`: AI knowledge content library.
- `GlobalAnalyticsPage.tsx`: admin-wide metrics and performance.
- `LeadsCrmPage.tsx`: admin CRM lead audit.
- `ReportsExportsPage.tsx`: report/export preview.
- `SecurityAccessPage.tsx`: security logs and security rules.
- `SystemSettingsPage.tsx`: workspace and integration settings.

Shared admin files:

- `AdminNavigation.tsx`: admin sidebar and topbar.
- `AdminScreenShell.tsx`: shared admin layout and reusable admin UI patterns.

## 8. Future Backend Mapping

When backend/database integration starts, preserve the UI components and replace local state with API calls.

Likely backend entities:

- Organization
- User
- Campaign
- Script
- Persona
- KnowledgeItem
- Lead
- CallSession
- ReportExport
- SecurityEvent
- SystemSetting

Likely database:

- PostgreSQL, based on the workflow document.

Likely backend:

- FastAPI, based on the workflow document.

## 9. Development Rules

Before finishing a coding task, run:

```powershell
npx.cmd tsc --noEmit
npm.cmd run lint
```

Known current lint warning:

- `src/components/dashboard/AgentDashboard.tsx` uses `<img>`, and Next.js recommends `<Image />`. This warning existed before the admin screen work.

Coding consistency:

- Prefer reusable admin components from `AdminScreenShell.tsx`.
- Keep route files thin.
- Keep page components readable and sectioned.
- Do not remove planned modules from docs just because their code is not complete.
- Do not introduce backend/database claims until backend is actually connected.
- Use ASCII unless the file already needs special characters.

## 10. Continuation Prompt For Future Sessions

If this chat does not load, give the next AI this prompt:

```text
We are building EchoAI frontend in D:\Echo-Frontend\echoai. Read docs/ProjectRD.md and docs/EchoAI_Frontend_Workflow.md first. The admin flow and all admin screens are implemented under src/components/admin and src/app/admin. Keep the dark EchoAI command-center theme, use shared components from AdminScreenShell.tsx, and run npx.cmd tsc --noEmit plus npm.cmd run lint after changes. Backend is not connected yet; use local React state or localStorage only for frontend prototype behavior.
```
