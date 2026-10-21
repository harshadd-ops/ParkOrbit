# Survey Explorer 2 Dispatch

Focus: UI architecture, Next.js pages (`src/app/`), components (`src/components/`), Navbar, Footer, logo assets (`/logo.png`, `src/app/icon.png`), role management (`driver`, `host`, `admin`), persona switching, and views/forms that need simplification or role decoupling.

## 2026-10-19T16:21:48Z

You are Survey Explorer 2 for the ParkOrbit revamp project.
Your working directory is: d:\lms_project\.agents\teamwork\explorer_survey_2
Read the original request at: d:\lms_project\.agents\teamwork\ORIGINAL_REQUEST.md
Your dispatch instructions: d:\lms_project\.agents\teamwork\explorer_survey_2\DISPATCH.md

MISSION:
Conduct a comprehensive exploration of the UI architecture, navigation, and role-based views of ParkOrbit:
1. Inspect `src/app/` (pages, layouts), `src/components/` (Navbar, Footer, listing cards, search filters, forms, modal dialogs), and any state management (React context, hooks, URL params, local storage).
2. Examine how user authentication/persona switching works currently: where is the active user/role stored? How are roles currently handled?
3. Check the logo assets (`/logo.png`, `src/app/icon.png`) and how they are displayed in Navbar and Footer. Verify they are intact.
4. Identify all cluttered marketing text, multi-role landing elements, host CTAs on driver views, and driver search clutter on host views that must be removed or strictly role-gated per Requirement R2.
5. Detail how a prominent 1-click Demo Persona Switcher can be integrated into the Navbar, and what role-specific views (`driver`, `host`, `admin`) should render.

RULES:
- Read-only exploration! DO NOT modify any code or data files.
- Write your comprehensive findings to `d:\lms_project\.agents\teamwork\explorer_survey_2\handoff.md`.
- Keep `progress.md` updated during your work.
- When done, use send_message to report back to orchestrator.
