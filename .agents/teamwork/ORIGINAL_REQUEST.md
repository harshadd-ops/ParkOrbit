# Original User Request

## Initial Request — 2026-10-19T16:19:58Z

Revamp the ParkOrbit peer-to-peer parking web application into a clean, intuitive, strictly role-specific experience localized entirely to **Pune city**, featuring an interactive **Leaflet + OpenStreetMap** map and a pre-loaded **end-to-end live demo workflow** where a Host lists a parking spot in Pune and a Driver/Rider switches login to immediately see and reserve that exact spot on the map.

Working directory: d:\lms_project
Integrity mode: development

## Requirements

### R1. Complete Pune City Localization & Pre-loaded Demo Data
Replace all existing non-Pune locations (Bengaluru, Mumbai, Delhi) across seeded listings, users, bookings, reviews, search filters, quick-select neighborhood pills, and UI copy with authentic **Pune, Maharashtra** neighborhoods and accurate Pune coordinates (`~18.48° N–18.60° N, 73.73° E–73.95° E`), such as **Koregaon Park, Baner, Hinjewadi Phase 1/2, Kothrud, Viman Nagar, FC Road (Deccan Gymkhana), Wakad, Magarpatta City, and Shivajinagar**. Pre-load rich demo data (seeded Pune Hosts, Pune Drivers/Riders, active Pune parking spaces, and sample reservations) so the app works out-of-the-box for a live demonstration. Also ensure the uploaded ParkOrbit logo (`/logo.png` and `src/app/icon.png`) remains intact in the Navbar and Footer. Note that `data/parkorbit-db.json` should also be updated or regenerated so the running app immediately loads the new Pune seed data.

### R2. Account-Tied Role-Specific Views & Simplified, Intuitive UX
Eliminate the overwhelming multi-role landing page and cluttered navigation by tying the entire UI strictly to the active user's role (`driver`, `host`, or `admin`) paired with a prominent **1-click Demo Persona Switcher** in the top navigation bar:
- **Driver (Rider) Role**: When logged in as a Driver, show **only** Driver-relevant screens and navigation — a clean, focused Pune parking discovery experience (search bar, neighborhood pills, interactive Pune map + streamlined listing cards) and a "My Bookings" view. Hide all Host space-creation forms, Host studio links, Host earnings banners, and Admin links.
- **Host Role**: When logged in as a Host, show **only** Host-relevant screens and navigation — a focused Host dashboard showing their listed Pune parking spaces, incoming driver reservations, earnings summary, availability blocks, and a streamlined "Host a New Space" flow. Hide Driver search clutter.
- **Admin Role**: When logged in as an Admin, show focused Trust & Moderation controls.
- **De-cluttered Visual Design**: Remove dense introductory marketing walls of text, redundant stat strips, and overwhelming secondary panels so users immediately see only the primary task for their role.

### R3. Interactive Open-Source Map (Leaflet + OpenStreetMap / Carto Tiles)
Replace the custom SVG orbital map illustration with a real, interactive open-source map centered on **Pune (`18.5204, 73.8567`)** using **Leaflet** and free OpenStreetMap / Carto Voyager tiles (no API key required):
- **Driver Discovery Map**: Display interactive price pins (`₹/hr`) at each listing's real Pune coordinates. Clicking a pin highlights/opens the listing preview and syncs with the listing list; filtering by Pune locality pans/zooms the map smoothly.
- **Host Location Picker**: When a Host creates or edits a parking space in Pune, allow them to select a Pune neighborhood preset or click/drag directly on the interactive Pune map to set the exact latitude/longitude pin for their parking spot.

### R4. Seamless End-to-End Host → Driver Demo Flow
Support a rock-solid, zero-friction live demo workflow:
1. Switch to a **Pune Host** persona in 1 click (or log in as a Host) → add/publish a new parking space in Pune (with map pin, hourly/daily price in INR `₹`, and instructions).
2. Use the **1-click Demo Switcher** in the navbar to switch to a **Pune Driver (Rider)** persona.
3. The Driver view immediately displays the newly hosted Pune parking spot on the interactive Leaflet map and in the Pune search results, allowing the Driver to select a time window, reserve the spot, and receive their check-in PIN.
4. Switching back to the **Host** persona immediately shows the Driver's new reservation on that space.

## Verification Resources

- Existing automated test suite in `tests/marketplace.test.ts` executed via `npm test` (Vitest). Update and expand tests to verify Pune seeded data, role-specific data flows, and the Host-to-Driver end-to-end listing + booking lifecycle.
- Production build & type verification via `npm run build`.

## Acceptance Criteria

### Pune Localization
- [ ] 100% of seeded listings, default coordinates, quick-filter chips, and sample bookings are located in Pune, Maharashtra with valid Pune coordinates (`18.40 <= lat <= 18.65`, `73.70 <= lng <= 74.00`).
- [ ] Zero references to Bengaluru, Mumbai, or Delhi remain in the seeded database, search placeholders, or UI copy.

### Strict Role-Based Separation & Simplified UI
- [ ] User accounts support explicit roles (`driver`, `host`, `admin`), with seeded demo accounts clearly labeled for 1-click switching in the navbar (e.g., Pune Driver vs. Pune Host vs. Admin).
- [ ] When active as a **Driver**, the navbar and pages render only Driver discovery (`Find Parking`) and `My Bookings` — zero Host creation CTAs, Host Studio links, or Admin links are visible.
- [ ] When active as a **Host**, the navbar and pages render only the Host workspace (`My Spaces & Bookings` and `Host New Space`) — zero Driver search hero clutter is visible.
- [ ] First-time landing view is clean, uncluttered, and immediately focused on the active role's core task.

### Open-Source Map (Leaflet + OpenStreetMap)
- [ ] An interactive Leaflet map with OpenStreetMap/Carto tiles renders Pune streets and neighborhoods without requiring any paid API key.
- [ ] All Pune listings appear as interactive price markers on the map; clicking a marker selects the listing, and hosts can click on the map to place a pin when creating a listing.

### End-to-End Demo & Build Verification
- [ ] A listing created by a Host immediately persists and appears on the Pune map and listing feed when switching to a Driver account, and can be booked end-to-end.
- [ ] `npm test` passes all unit and integration tests with zero failures.
- [ ] `npm run build` completes cleanly with zero TypeScript or Next.js build errors.

## Follow-up — 2026-10-19T16:32:28Z

A server restart occurred and stopped active subagents and background cron tasks. Please check on the status of the Project Orchestrator (13904d61-68e8-4ba4-b41b-c36b15babd1c) and `.agents/teamwork/` state, revive the orchestrator (and re-establish any needed monitoring schedules), and continue executing the milestones to completion.
