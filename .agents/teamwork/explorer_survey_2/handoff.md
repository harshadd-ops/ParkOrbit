# Handoff Report — UI Architecture, Role-Based Views & Persona Switcher Survey

**Agent**: Survey Explorer 2  
**Date**: 2026-10-19T16:27:00Z  
**Scope**: UI Architecture (`src/app/`, `src/components/`), Authentication & Persona Switching (`src/context/AuthContext.tsx`, `src/lib/types.ts`), Logo Assets (`public/logo.png`, `src/app/icon.png`), Marketing Clutter Identification, and 1-Click Demo Persona Switcher Design.

---

## 1. Observation

### 1.1 UI Directory Architecture & Page Structure
We inspected all frontend files under `src/app/` and `src/components/`:
- **`src/app/layout.tsx`** (lines 30–46):
  Wraps the app with `AuthProvider`, `Navbar`, `<main className="flex-1">{children}</main>`, `Footer`, and `Toaster`.
- **`src/app/page.tsx`** (1,064 lines):
  Currently a monolithic landing page combining Driver search, pseudo-SVG map (`OrbitMap`), and heavy Host marketing content:
  - Lines 229–363: "STADIUM HERO SECTION" with dense marketing copy ("Every idle driveway is a destination waiting to happen...", "PEER-TO-PEER URBAN MOBILITY MARKETPLACE", stats strip with "12%", "4-Digit", "Zero"), and dual CTAs ("Find Parking Near You" + "List Your Space & Earn").
  - Lines 364–530: Search console with non-Pune hubs ("Popular Hubs: Indiranagar, Koramangala, MG Road, HSR Layout, Whitefield, Bandra West, Connaught Place") and city dropdown ("Bengaluru", "Mumbai", "New Delhi").
  - Lines 534–860: Discovery section with `OrbitMap` (SVG illustration) and listing cards.
  - Lines 862–1011: "ASYMMETRIC CIRCULAR PORTRAIT CONSTELLATION & ORBITAL ARCHITECTURE" / "HOW PARKORBIT WORKS" — 3 large promotional cards taking up vertical real estate.
  - Lines 1013–1060: "HOST MONETIZATION CALLOUT BANNER" — "Own an empty driveway, apartment bay... Keep 88%... Create a Parking Listing / Open Host Studio".
- **`src/app/dashboard/driver/page.tsx`** (669 lines):
  Driver Hub displaying active passes, completed trips, cancellation flow, 4-digit PIN check-in, and verified review modal.
- **`src/app/dashboard/host/page.tsx`** (722 lines):
  Host Studio displaying financials (estimated net earnings, pending settlement banner), listings manager (published/draft/paused), reservations queue with PIN verification, and availability blackout calendar.
  - Lines 242–252: Hardcoded demo switch button: `user.id === "user-driver-1" && <Button onClick={() => switchUser("user-host-1")}>Switch to Demo Host (Priya Nair)</Button>`.
- **`src/app/admin/page.tsx`** (335 lines):
  Admin Moderation & Commission Console containing marketplace take-rate configuration and Trust & Safety reports queue.
  - Lines 144–153: Hardcoded demo switch button: `user?.role !== "admin" && <Button onClick={() => switchUser("user-admin-1")}>Activate Admin Persona (Nandini Sharma)</Button>`.
- **`src/app/host/new/page.tsx`** & **`src/app/host/listings/[id]/edit/page.tsx`**:
  Host listing creation and editing workflows wrapping `src/components/host/ListingForm.tsx`.
- **`src/app/listings/[id]/page.tsx`** (1,143 lines):
  Driver reservation page with date/time pickers, live availability checks, price breakdown calculation, simulated UPI/Card payment, and PIN delivery.

### 1.2 Authentication, Roles & Persona Switching
- **`src/lib/types.ts`** (line 1):
  ```typescript
  export type UserRole = "user" | "admin";
  ```
  Users currently only have roles `"user"` or `"admin"`. There is no first-class `"driver"` or `"host"` role differentiation in types or the user schema.
- **`src/lib/auth-server.ts`** (lines 5–24):
  Active user is resolved via cookie `parkorbit_user_id` or header `x-parkorbit-user-id`. Defaults to `db.users[0]` (Aarav Mehta).
- **`src/context/AuthContext.tsx`** (lines 48–82):
  Provides `currentUser`, `demoUsers`, `switchUser(userId)`, `login`, `register`, `logout`.
- **`src/components/layout/Navbar.tsx`**:
  - Lines 67–73: Hardcoded navigation links shown indiscriminately to all users:
    ```typescript
    const navLinks = [
      { href: "/", label: "Discover Spaces" },
      { href: "/host/new", label: "Host a Space" },
      { href: "/dashboard/driver", label: "Driver Hub" },
      { href: "/dashboard/host", label: "Host Studio" },
      { href: "/admin", label: "Trust & Admin" },
    ];
    ```
  - Lines 146–169: Account button displays `"Trust Admin"` for admins and `"Driver & Host"` for all other users.
  - Lines 232–326: Persona switching requires clicking the account pill, opening a multi-tab `Dialog` modal, selecting the "Instant Persona Switch" tab, scrolling through cards, and clicking "Switch". It is **not** a 1-click switcher.

### 1.3 Logo Assets & Display
- **`public/logo.png`**: Verified intact. 433x557 PNG displaying the official ParkOrbit black 'P' mark with white roadway and location pin.
- **`src/app/icon.png`**: Verified intact. 256x256 PNG app favicon matching the brand mark.
- In `src/components/layout/Navbar.tsx` (lines 103–109):
  ```tsx
  <img
    src="/logo.png"
    alt="ParkOrbit Logo"
    width={29}
    height={36}
    className="h-9 w-auto object-contain select-none shrink-0"
  />
  ```
- In `src/components/layout/Footer.tsx` (lines 162–170):
  ```tsx
  <span className="inline-flex items-center justify-center rounded-md bg-white px-1.5 py-1 shadow-sm">
    <img
      src="/logo.png"
      alt="ParkOrbit Logo"
      width={18}
      height={22}
      className="h-5 w-auto object-contain select-none"
    />
  </span>
  ```

### 1.4 Identified Clutter & Role Leaks
1. **Multi-Role Landing Page Clutter** (`src/app/page.tsx`):
   - Hero marketing wall of text ("Every idle driveway is a destination...", "PEER-TO-PEER URBAN MOBILITY MARKETPLACE", stats row).
   - Conflicting hero CTAs: "Find Parking Near You" next to "List Your Space & Earn".
   - Non-Pune city pills: Bengaluru, Mumbai, New Delhi.
   - 3-card marketing constellation ("HOW PARKORBIT WORKS").
   - Host monetization banner ("Own an empty driveway... Keep 88%...").
2. **Navbar Clutter** (`src/components/layout/Navbar.tsx`):
   - Displays all 5 links (`/`, `/host/new`, `/dashboard/driver`, `/dashboard/host`, `/admin`) to every user regardless of their role.
3. **Footer Clutter** (`src/components/layout/Footer.tsx`):
   - Dual CTAs: "List Your Driveway" AND "Manage Reservations".
   - Non-Pune link: "Urban Orbit Hubs (BLR • BOM • DEL)".
4. **Ad-Hoc Page Cross-Pollination**:
   - Host Dashboard shows an ad-hoc button to switch to Host Priya Nair.
   - Admin page shows an ad-hoc button to switch to Admin Nandini Sharma.

---

## 2. Logic Chain

1. **Role Differentiation**:
   - *Observation*: `UserRole` in `src/lib/types.ts` is only `"user" | "admin"`, and Navbar shows all links to all users.
   - *Requirement R2*: "Eliminate the overwhelming multi-role landing page and cluttered navigation by tying the entire UI strictly to the active user's role (`driver`, `host`, or `admin`) paired with a prominent 1-click Demo Persona Switcher in the top navigation bar."
   - *Inference*: `UserRole` must be expanded to `"driver" | "host" | "admin"`. Demo users must be seeded with explicit roles (`driver`, `host`, `admin`).
2. **1-Click Navbar Persona Switcher**:
   - *Observation*: Currently, changing personas requires opening a 3-tab modal dialog (`authModalOpen`) and scrolling.
   - *Requirement R2 & R4*: A 1-click demo persona switcher must sit directly in the top navigation bar, allowing instant switching between Pune Driver, Pune Host, and Admin.
   - *Inference*: The Navbar should render a prominent segmented pill bar directly in the nav header with 3 options:
     - `🚗 Driver (Pune)`
     - `🏠 Host (Pune)`
     - `🛡️ Admin`
     Clicking any persona invokes `switchUser(personaId)` immediately (1 click), without opening any dialog.
3. **Role-Gated Views**:
   - *When role === 'driver'*:
     - Navbar shows only: `Find Parking` (`/`) and `My Bookings` (`/dashboard/driver`).
     - Landing page (`/`) shows only Driver parking discovery: search bar, Pune neighborhood quick-pills, Leaflet Pune map, and listing cards. All host CTAs, host banners, and marketing walls are removed.
     - Accessing `/dashboard/host` or `/host/new` redirects or displays a role-switch gate.
   - *When role === 'host'*:
     - Navbar shows only: `My Spaces & Bookings` (`/dashboard/host`) and `Host a Space` (`/host/new`).
     - When a Host navigates to `/`, it displays the Host workspace/dashboard (or cleanly routes to `/dashboard/host`), removing Driver search bars, filters, and discovery maps.
   - *When role === 'admin'*:
     - Navbar shows: `Trust & Moderation` (`/admin`), plus direct links to review listings.
4. **Logo Asset Integrity**:
   - *Observation*: `/logo.png` and `src/app/icon.png` are valid, official assets already correctly referenced in `Navbar` and `Footer`.
   - *Inference*: Keep both files completely intact. Ensure all JSX image tags preserve their proper rendering.

---

## 3. Caveats

1. **Leaflet Dependency Installation**:
   `leaflet` and `@types/leaflet` are not yet listed in `package.json`. In Next.js App Router (SSR), Leaflet must either use client-side dynamic imports (`next/dynamic` with `ssr: false`) or be initialized inside `useEffect` to prevent `window is not defined` errors.
2. **Database Seed Roles vs Existing Test Assumptions**:
   `tests/marketplace.test.ts` references user IDs `user-driver-1`, `user-host-1`, `user-host-2`, `user-admin-1`. When updating `UserRole` to `"driver" | "host" | "admin"`, ensure `tests/marketplace.test.ts` continues to pass or is updated to assert the new role types cleanly.

---

## 4. Conclusion

1. **Persona Switching Architecture**:
   Integrate a prominent 1-click segmented switcher into `src/components/layout/Navbar.tsx`:
   - Quick pills: `[🚗 Driver: Rohan]` `[🏠 Host: Priya]` `[🛡️ Admin: Nandini]`
   - Direct call to `switchUser(targetUserId)` on click with immediate visual feedback (active state indicator).
2. **Navigation Decoupling**:
   Filter `navLinks` strictly based on `currentUser.role`:
   - `driver`: `[{ href: "/", label: "Find Parking" }, { href: "/dashboard/driver", label: "My Bookings" }]`
   - `host`: `[{ href: "/dashboard/host", label: "My Spaces & Bookings" }, { href: "/host/new", label: "Host a Space" }]`
   - `admin`: `[{ href: "/admin", label: "Trust & Moderation" }]`
3. **De-cluttering `src/app/page.tsx`**:
   - Strip the 3-column "HOW PARKORBIT WORKS" marketing constellation.
   - Strip the "HOST MONETIZATION CALLOUT BANNER" from the Driver view.
   - Strip non-Pune city selectors ("Bengaluru", "Mumbai", "New Delhi") and replace with Pune neighborhood chips (Koregaon Park, Baner, Hinjewadi, Kothrud, Viman Nagar, FC Road, Wakad, Magarpatta, Shivajinagar).
   - When a Host lands on `/`, render the Host Studio workspace instead of the Driver search hero.
4. **Logo Assets**:
   Confirm `/logo.png` and `src/app/icon.png` are verified intact and preserve their usage.

---

## 5. Verification Method

To independently verify these architectural findings:
1. **Verify Existing Tests Pass**:
   ```bash
   npm test
   ```
   (Confirmed: 14 passing tests in `tests/marketplace.test.ts`).
2. **Verify Logo Assets**:
   Inspect `public/logo.png` and `src/app/icon.png` to confirm valid dimensions and content.
3. **Verify Role Isolation in Code**:
   Inspect `src/components/layout/Navbar.tsx` lines 67–73 to see the static 5-link array that must be role-gated.
   Inspect `src/app/page.tsx` lines 229–363, 862–1011, and 1013–1060 to see the marketing clutter to be removed.
4. **Invalidation Conditions**:
   - If `npm test` fails after updating `UserRole` in `types.ts`, ensure `types.ts` maintains backward compatibility for any functions checking `role === "admin"`.
   - If Leaflet causes SSR hydration failure during `npm run build`, ensure dynamic import with `{ ssr: false }` is used.
