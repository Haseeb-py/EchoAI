# Contributing Guide

This project is built by multiple contributors. Follow this workflow to keep code consistent and easy to merge.

## 1. Active Folder
- Make all code changes only inside `echoai/`.
- Do not implement features in reference folders.

## 2. Branch Strategy
- Keep `main` stable.
- Create one feature branch per screen or task.

Branch name format:
- `feature/<screen-or-module-name>`
- `fix/<short-bug-name>`
- `chore/<task-name>`

Examples:
- `feature/live-call-cockpit`
- `feature/crm-lead-management`
- `fix/sidebar-icon-alignment`

## 3. Commit Rules
- Commit small, focused changes.
- Use clear commit messages.

Commit message format:
- `feat: add live call cockpit header actions`
- `fix: correct sidebar icon spacing`
- `chore: extract reusable sidebar component`
- `docs: update implementation phases`

## 4. Screen Build Order
Use the implementation order in:
- `docs/IMPLEMENTATION-PHASES.md`

Keep backlog and scope aligned with:
- `requirment.txt`

## 5. Reusable Component Rules
- Reuse shared components instead of duplicating UI.
- Keep dashboard/shared UI in `src/components`.
- Add new shared components only when reused by 2+ screens.

## 6. Before Opening PR
Run these checks:
1. App runs locally (`npm run dev`).
2. No TypeScript or build errors.
3. Visual alignment with approved design references.
4. New code follows existing naming and folder patterns.

## 7. Pull Request Checklist
- Title: clear and action-oriented.
- Description includes:
  - What changed
  - Why it changed
  - Screens/components affected
  - Any known follow-up work
- Add screenshots for visual changes.

## 8. Conflict Avoidance (Two-Person Team)
- Assign screens in advance from phase plan.
- One owner for shared components per sprint.
- Communicate before changing `Sidebar`, `TopHeader`, token files, or global styles.

## 9. Golden Rule
- Keep code repo-ready at all times.
- Prefer clean, incremental commits over large mixed changes.
