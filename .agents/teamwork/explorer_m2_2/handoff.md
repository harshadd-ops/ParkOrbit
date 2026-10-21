# Handoff Report — Role-Specific Page Rendering & View Gating Specifications

**Agent**: Explorer 2 (Milestone 2)  
**Date**: 2026-10-19T17:08:00Z  
**Scope**: `src/app/page.tsx`, `src/app/dashboard/host/page.tsx`, `src/app/dashboard/driver/page.tsx`, `src/app/admin/page.tsx`  
**Working Directory**: `d:\lms_project\.agents\teamwork\explorer_m2_2`  

---

## 1. Observation

### 1.1 `src/app/page.tsx` (Monolithic Landing Page & Lack of Role Separation)
Direct inspection of `src/app/page.tsx` (1,064 lines) reveals:
- **No Role Awareness or Gating**: The page does not import or call `useAuth()`. Every user, regardless of whether their active persona is `host`, `driver`, or `admin`, is shown the full Driver search interface alongside Host promotional marketing.
- **Host Leaks in Driver View**:
  - Line 298: In the Stadium Hero Section:
    ```tsx
    <Link href="/host/new">
      <Button variant="secondary" size="lg" className="bg-white text-[#141413] hover:bg-[#F3F0EE]">
        List Your Space & Earn
      </Button>
    </Link>
    ```
  - Line 987: In Section 3 ("HOW PARKORBIT WORKS", Node 3):
    ```tsx
    <Link href="/host/new" aria-label="Create a host parking listing" className="mc-satellite-cta absolute bottom-1 right-1">
      <ArrowRight className="w-5 h-5" />
    </Link>
    ```
  - Lines 1046–1056: In Section 4 ("HOST MONETIZATION CALLOUT BANNER"):
    ```tsx
    <Link href="/host/new">
      <Button variant="default" size="lg">Create a Parking Listing <ArrowRight className="w-4 h-4" /></Button>
    </Link>
    <Link href="/dashboard/host">
      <Button variant="secondary" size="lg">Open Host Studio</Button>
    </Link>
    ```
- **Outdated Non-Pune Fallbacks**:
  - Lines 78–83: Initial search center is set to `Indiranagar, Bengaluru`:
    ```tsx
    const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number; label: string } | null>({
      lat: 12.9784,
      lng: 77.6408,
      label: "Indiranagar, Bengaluru",
    });
    ```
  - Lines 204–211: Browser GPS denied fallback:
    ```tsx
    toast.info("Location permission not granted — defaulting to Indiranagar, Bengaluru.");
    setSearchCenter({
      lat: 12.9784,
      lng: 77.6408,
      label: "Indiranagar, Bengaluru (Fallback)",
    });
    ```
  - Line 382: Search input placeholder:
    ```tsx
    placeholder="Indiranagar, BKC, Koramangala, Connaught Place..."
    ```

### 1.2 `src/app/dashboard/host/page.tsx` (Ad-Hoc Switcher Pollution & Stale Persona Names)
Direct inspection of `src/app/dashboard/host/page.tsx` (722 lines) reveals:
- Lines 242–252: Action bar in page header contains an ad-hoc button switching to legacy non-Pune persona:
  ```tsx
  {user && user.id === "user-driver-1" && (
    <Button
      variant="secondary"
      onClick={() => {
        switchUser("user-host-1");
        toast.success("Switched to Priya Nair (Multi-Listing Host)");
      }}
    >
      Switch to Demo Host (Priya Nair)
    </Button>
  )}
  ```
- Lines 358–366: Empty listings card contains an identical ad-hoc switcher button:
  ```tsx
  <Button
    variant="secondary"
    onClick={() => {
      switchUser("user-host-1");
      toast.success("Switched to Priya Nair (Multi-Listing Host)");
    }}
  >
    Switch to Demo Host (Priya Nair)
  </Button>
  ```
- Line 354: Stale reference in copy to "Priya Nair" (which was updated to "Neha Kulkarni" in Milestone 1 seed data).
- Line 44: Hook imports `switchUser`: `const { currentUser: user, switchUser } = useAuth();`.

### 1.3 `src/app/admin/page.tsx` (Ad-Hoc Switcher in Admin Header)
Direct inspection of `src/app/admin/page.tsx` (335 lines) reveals:
- Lines 143–153: Header contains an ad-hoc switch button:
  ```tsx
  {user?.role !== "admin" && (
    <Button
      variant="consent"
      onClick={() => {
        switchUser("user-admin-1");
        toast.success("Switched to Nandini Sharma (Trust & Safety Admin)");
      }}
    >
      Activate Admin Persona (Nandini Sharma)
    </Button>
  )}
  ```
- Line 18: Hook imports `switchUser`: `const { currentUser: user, switchUser } = useAuth();`.

### 1.4 `src/app/dashboard/driver/page.tsx` (Clean Driver Workspace)
Direct inspection of `src/app/dashboard/driver/page.tsx` (669 lines) reveals:
- Zero ad-hoc persona switcher buttons.
- Zero host creation buttons or studio links.
- Zero admin links.
- Strictly provides Driver booking management, PIN verification, pass history, and profile updates.

---

## 2. Logic Chain

1. **Role Gating on `/` for Hosts (Observation 1.1)**:
   - When a host persona is active (`user?.role === "host"`), presenting driver search bars, radius filters, and booking feeds creates confusion and violates Requirement R2 ("When logged in as a Host, show only Host-relevant screens and navigation... Hide Driver search clutter").
   - A client-side route guard (`useEffect` using Next.js `router.replace("/dashboard/host")`) immediately directs hosts to their workspace.
   - While the route transition completes, rendering a focused transitional loading card prevents any visual flash of driver search content.

2. **Strict Driver Presentation on `/` (Observation 1.1)**:
   - When active as `driver` (or guest), the page must render **only** Driver discovery.
   - Removing the hero secondary CTA (`/host/new`), Section 3 Node 3 host link, and the entire Section 4 Host monetization banner guarantees zero host creation buttons and zero host earnings text are visible.
   - Updating initial coordinates and GPS fallback to Pune (`Koregaon Park` and `Shivajinagar`) ensures authentic localization.

3. **Global Persona Switcher Precedence (Observations 1.2 & 1.3)**:
   - Milestone 2 implements a permanent 1-click segmented switcher in `Navbar.tsx` (handled by Explorer 1).
   - In-page ad-hoc buttons in `dashboard/host` (lines 242–252, 358–366) and `admin` (lines 143–153) are redundant, visually clutter the interface, and hardcode stale names ("Priya Nair").
   - Removing these buttons eliminates duplicated switching logic and enforces a single, consistent global control in the Navbar.

---

## 3. Caveats

- **Client-Side Hydration**: Because active user session is managed in React Context (`AuthContext.tsx`) and backed by cookies/localStorage, role-based redirects on `/` execute on the client. Rendering a clean transitional state during `currentUser === undefined` or `currentUser.role === "host"` avoids layout shift or hydration mismatch.
- **Guest / Unauthenticated Users**: When `currentUser` is null/undefined (e.g. initial load before auth context hydrates), the system defaults to Driver discovery mode, allowing guests to search Pune spaces immediately.
- **Leaflet Map Integration (Milestone 3)**: In Milestone 2, the Driver discovery map on `/` remains `OrbitMap` until Milestone 3 replaces it with `DriverDiscoveryMap.tsx`. The role gating designed here seamlessly carries over to Milestone 3 without alteration.

---

## 4. Conclusion & Component Code Specifications

### 4.1 Specification for `src/app/page.tsx`

#### A. Imports & Hook Additions
Add `useRouter` and `useAuth`:
```tsx
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
```

#### B. Role Gating & Host Redirect Logic
Insert inside `HomePage()`:
```tsx
export default function HomePage() {
  const router = useRouter();
  const { currentUser } = useAuth();

  // Role Gate: Redirect Host to Host Studio & Admin to Admin Console
  useEffect(() => {
    if (currentUser?.role === "host") {
      router.replace("/dashboard/host");
    } else if (currentUser?.role === "admin") {
      router.replace("/admin");
    }
  }, [currentUser?.role, router]);

  // Transitional state for Host or Admin to prevent Driver UI flash
  if (currentUser?.role === "host") {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-24 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="w-12 h-12 rounded-full border-3 border-[#CF4500] border-t-transparent animate-spin" />
        <h2 className="text-2xl font-medium text-[#141413]">Opening Host Studio...</h2>
        <p className="text-sm text-[#595550] max-w-md">
          Welcome back, {currentUser.name}. Loading your spaces, reservations queue, and earnings studio.
        </p>
        <Link href="/dashboard/host">
          <Button variant="default" size="sm">Go to Host Studio</Button>
        </Link>
      </div>
    );
  }

  if (currentUser?.role === "admin") {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-24 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="w-12 h-12 rounded-full border-3 border-[#141413] border-t-transparent animate-spin" />
        <h2 className="text-2xl font-medium text-[#141413]">Opening Admin Console...</h2>
        <p className="text-sm text-[#595550] max-w-md">
          Loading Trust & Safety moderation queue.
        </p>
        <Link href="/admin">
          <Button variant="default" size="sm">Go to Admin Console</Button>
        </Link>
      </div>
    );
  }
```

#### C. Pune Search Center & Geolocation Fallback
Update lines 78–83 and lines 204–211:
```tsx
  // Initial Pune search center (Koregaon Park)
  const [searchCenter, setSearchCenter] = useState<{
    lat: number;
    lng: number;
    label: string;
  } | null>({
    lat: 18.5362,
    lng: 73.8940,
    label: "Koregaon Park, Pune",
  });
```
And in `handleLocateMe`:
```tsx
      () => {
        setLocating(false);
        toast.info(
          "Location permission not granted — defaulting to Shivajinagar, Pune."
        );
        setSearchCenter({
          lat: 18.5314,
          lng: 73.8446,
          label: "Shivajinagar, Pune (Fallback)",
        });
      },
```

#### D. Removal of Host CTAs & Marketing Banners from Driver Discovery
1. **Hero Action Bar (Lines 287–307)**:
   - **Before**:
     ```tsx
     <div className="flex flex-wrap items-center gap-4 pt-2">
       <a href="#discover">
         <Button variant="consent" size="lg" className="shadow-lg">
           Find Parking Near You
           <ArrowRight className="w-4 h-4 ml-1" />
         </Button>
       </a>
       <Link href="/host/new">
         <Button variant="secondary" size="lg" className="bg-white text-[#141413] hover:bg-[#F3F0EE]">
           List Your Space & Earn
         </Button>
       </Link>
     </div>
     ```
   - **After (Driver-Only)**:
     ```tsx
     <div className="flex flex-wrap items-center gap-4 pt-2">
       <a href="#discover">
         <Button variant="consent" size="lg" className="shadow-lg">
           Find Parking in Pune
           <ArrowRight className="w-4 h-4 ml-1" />
         </Button>
       </a>
     </div>
     ```
2. **Remove Section 3 Node 3 Host Link & Section 4 Host Monetization Banner**:
   - Strip out lines 1013–1060 (`{/* 4. HOST MONETIZATION CALLOUT BANNER */}`).
   - Driver lands exclusively on: Search Console -> Neighborhood Quick-Pills -> Interactive Map -> Listing Cards.

---

### 4.2 Specification for `src/app/dashboard/host/page.tsx`

#### A. Hook Signature Cleanup (Line 44)
- **Before**:
  ```tsx
  const { currentUser: user, switchUser } = useAuth();
  ```
- **After**:
  ```tsx
  const { currentUser: user } = useAuth();
  ```

#### B. Header Action Bar Switcher Removal (Lines 241–259)
- **Before**:
  ```tsx
  <div className="flex flex-wrap items-center gap-3">
    {user && user.id === "user-driver-1" && (
      <Button
        variant="secondary"
        onClick={() => {
          switchUser("user-host-1");
          toast.success("Switched to Priya Nair (Multi-Listing Host)");
        }}
      >
        Switch to Demo Host (Priya Nair)
      </Button>
    )}
    <Link href="/host/new">
      <Button variant="default">
        <PlusCircle className="w-4 h-4" />
        Create New Parking Listing
      </Button>
    </Link>
  </div>
  ```
- **After**:
  ```tsx
  <div className="flex flex-wrap items-center gap-3">
    <Link href="/host/new">
      <Button variant="default">
        <PlusCircle className="w-4 h-4" />
        Create New Parking Listing
      </Button>
    </Link>
  </div>
  ```

#### C. Empty Listings State Switcher Removal & Copy Update (Lines 350–371)
- **Before**:
  ```tsx
  <h3 className="text-xl font-medium text-[#141413]">
    You haven&apos;t listed any parking spaces under {user?.name} yet
  </h3>
  <p className="text-sm text-[#595550] max-w-md mx-auto">
    Click &ldquo;Create New Parking Listing&rdquo; to publish a
    driveway or save a draft, or switch to Demo Host{" "}
    <strong>Priya Nair</strong> to inspect pre-populated spaces and earnings.
  </p>
  <div className="flex flex-wrap justify-center gap-3">
    <Button
      variant="secondary"
      onClick={() => {
        switchUser("user-host-1");
        toast.success("Switched to Priya Nair (Multi-Listing Host)");
      }}
    >
      Switch to Demo Host (Priya Nair)
    </Button>
    <Link href="/host/new">
      <Button variant="default">Create Your First Listing</Button>
    </Link>
  </div>
  ```
- **After**:
  ```tsx
  <h3 className="text-xl font-medium text-[#141413]">
    You haven&apos;t listed any parking spaces under {user?.name} yet
  </h3>
  <p className="text-sm text-[#595550] max-w-md mx-auto">
    Click &ldquo;Create New Parking Listing&rdquo; to publish a driveway or save a draft.
    You can also use the 1-click persona switcher in the top navigation bar to switch between Pune demo accounts.
  </p>
  <div className="flex flex-wrap justify-center gap-3">
    <Link href="/host/new">
      <Button variant="default">
        <PlusCircle className="w-4 h-4 mr-2" />
        Create Your First Listing
      </Button>
    </Link>
  </div>
  ```

#### D. Non-Host Role Context Banner (Lines 261–273)
Add below the header to guide non-host viewers without breaking access:
```tsx
{user && user.role !== "host" && (
  <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 flex items-center justify-between text-xs text-[#595550]">
    <div className="flex items-center gap-2">
      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
      <span>
        You are currently viewing as <strong>{user.name}</strong> ({user.role.toUpperCase()}). Use the <strong>1-Click Persona Switcher</strong> in the top navigation bar to switch to <strong>Neha Kulkarni (Host)</strong>.
      </span>
    </div>
  </div>
)}
```

---

### 4.3 Specification for `src/app/admin/page.tsx`

#### A. Hook Signature Cleanup (Line 18)
- **Before**:
  ```tsx
  const { currentUser: user, switchUser } = useAuth();
  ```
- **After**:
  ```tsx
  const { currentUser: user } = useAuth();
  ```

#### B. Header Switcher Removal (Lines 143–153)
- **Before**:
  ```tsx
  {user?.role !== "admin" && (
    <Button
      variant="consent"
      onClick={() => {
        switchUser("user-admin-1");
        toast.success("Switched to Nandini Sharma (Trust & Safety Admin)");
      }}
    >
      Activate Admin Persona (Nandini Sharma)
    </Button>
  )}
  ```
- **After**:
  ```tsx
  {user?.role !== "admin" && (
    <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-pill bg-black/5 border border-black/10 text-xs text-[#595550] font-medium">
      <ShieldCheck className="w-3.5 h-3.5 text-[#CF4500]" />
      <span>Viewing as {user?.name || "Demo User"}. Use navbar switcher to activate Admin persona.</span>
    </div>
  )}
  ```

---

## 5. Verification Method

To independently verify these specifications upon implementation:

1. **Host Route Gating Verification**:
   - Log in as Host (or switch to `user-host-1` via navbar).
   - Navigate to `http://localhost:3000/`.
   - **Expected Result**: Page immediately displays the transitional host state and replaces URL with `/dashboard/host`. Zero driver search inputs or driver maps are displayed.

2. **Driver View Clutter-Free Verification**:
   - Log in as Driver (or switch to `user-driver-1` via navbar).
   - Inspect `http://localhost:3000/`.
   - Search page source or DOM for `/host/new`, `/dashboard/host`, and "Keep 88%".
   - **Expected Result**: Zero occurrences of host links or host earnings banners. Only Pune parking discovery elements remain.

3. **In-Page Switcher Elimination Verification**:
   - Inspect `src/app/dashboard/host/page.tsx` and `src/app/admin/page.tsx`.
   - Run grep:
     ```powershell
     rg "switchUser\(" src/app/dashboard/host/ src/app/admin/
     ```
   - **Expected Result**: Zero matches. All switching is unified in `src/components/layout/Navbar.tsx`.

4. **Automated Test & Build Command**:
   - Run Vitest tests:
     ```powershell
     npm test
     ```
   - Run Next.js production build:
     ```powershell
     npm run build
     ```
   - **Expected Result**: Zero TypeScript errors, zero hydration errors, and successful build completion.
