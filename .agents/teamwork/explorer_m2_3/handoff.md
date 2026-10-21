# Handoff Report — Driver View De-cluttering & Pune Copy Localization

**Agent**: Explorer 3 (Milestone 2)  
**Date**: 2026-10-19T17:07:00Z  
**Scope**: De-cluttering marketing text in `src/app/page.tsx`, Pune search and locality quick-pills, Wakad listing cleanup in `src/lib/seed.ts` and `data/parkorbit-db.json`, and Footer localization in `src/components/layout/Footer.tsx`.

---

## 1. Observation

### 1.1 Marketing Clutter & Host Leaks in `src/app/page.tsx`
We inspected `src/app/page.tsx` (1,064 total lines):
1. **Stadium Hero Marketing Copy & Dual Action Bar** (lines 268–308):
   - Lines 271–274: Eyebrow badge `PEER-TO-PEER URBAN MOBILITY MARKETPLACE`.
   - Lines 276–279: H1 `"Every idle driveway is a destination waiting to happen."`
   - Lines 280–285: Marketing paragraph `"Reserve verified private driveways... or list your unused parking space and earn reliable monthly income."`
   - Lines 287–307: Dual action buttons: `"Find Parking Near You"` alongside `<Link href="/host/new"><Button>List Your Space & Earn</Button></Link>`. (Direct Host space-creation leak on the Driver discovery view).
2. **3-Stat Marketing Strip** (lines 309–330):
   - `12% Transparent platform fee`
   - `4-Digit PIN-verified check-in`
   - `Zero Double-booking overlaps`
3. **Hero Circular Portrait Showcase** (lines 332–361):
   - Floating price badge on lines 344–351: `"Indiranagar 100ft Rd · ₹65/hr · EV Ready"` (Hardcoded non-Pune Bengaluru locality!).
4. **"HOW PARKORBIT WORKS" 3-Card Constellation** (lines 862–1011):
   - 150 lines of marketing cards (`01 · DISCOVER & COMPARE`, `02 · RESERVE & CHECK IN`, `03 · HOST & EARN` with `<Link href="/host/new">` satellite CTA).
5. **"HOST MONETIZATION CALLOUT BANNER"** (lines 1013–1060):
   - 48 lines of host recruitment marketing: `"EARN FROM YOUR SPACE"`, `"Own an empty driveway, apartment bay... Keep 88%... Create a Parking Listing / Open Host Studio"`.

### 1.2 Legacy Non-Pune City References in Search & Filters
1. **Initial `searchCenter` State** (`src/app/page.tsx`, lines 78–82):
   ```typescript
   lat: 12.9784,
   lng: 77.6408,
   label: "Indiranagar, Bengaluru",
   ```
2. **Geolocation Fallback** (`src/app/page.tsx`, lines 203–211):
   ```typescript
   toast.info("Location permission not granted — defaulting to Indiranagar, Bengaluru.");
   setSearchCenter({
     lat: 12.9784,
     lng: 77.6408,
     label: "Indiranagar, Bengaluru (Fallback)",
   });
   ```
3. **Search Input Placeholder** (`src/app/page.tsx`, line 382):
   ```tsx
   placeholder="Indiranagar, BKC, Koramangala, Connaught Place..."
   ```
4. **City Dropdown Filter** (`src/app/page.tsx`, lines 567–577):
   ```tsx
   <select aria-label="Filter by City" value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)}>
     <option value="all">All Cities</option>
     <option value="Bengaluru">Bengaluru</option>
     <option value="Mumbai">Mumbai</option>
     <option value="New Delhi">New Delhi</option>
   </select>
   ```

### 1.3 Wakad Listing "Mumbai" References
In both `src/lib/seed.ts` (lines 667–669) and `data/parkorbit-db.json` (lines 611–612):
- Subtitle: `"Convenient transit parking near Hinjewadi Flyover & Mumbai-Pune Expressway"`
- Description: `"Private access-controlled arcade bay on Datta Mandir Road in Wakad. Fast access to Hinjewadi IT corridor and Mumbai-Pune bypass with guaranteed spot during peak hours."`
- Grep confirmation:
  `tests/challenger_m1_stress.test.ts` lines 206–235 explicitly flags this:
  - `expect(dbMatches).toBe(2);`
  - `expect(seedMatches).toBe(2);`
  - `searchListings({ query: "Mumbai" })` leaks 1 listing (`listing-wakad-8`).

### 1.4 Footer Legacy Hub Links
In `src/components/layout/Footer.tsx` (lines 64–69):
```tsx
<Link
  href="/#discover-search"
  className="inline-flex items-center gap-2.5 text-[14px] font-[450] text-white/90 hover:text-white"
>
  <MapPin className="size-4 text-signal-light" />
  <span>Urban Orbit Hubs (BLR • BOM • DEL) ↗</span>
</Link>
```
Preserved asset confirmation: Lines 163–169 cleanly render `/logo.png`.

---

## 2. Logic Chain

1. **Driver Discovery UX Clutter Elimination**:
   - *Requirement R2*: "When logged in as a Driver, show only Driver-relevant screens and navigation — a clean, focused Pune parking discovery experience (search bar, neighborhood pills, interactive Pune map + streamlined listing cards)... Hide all Host space-creation forms, Host studio links, Host earnings banners, and Admin links. Remove dense introductory marketing walls of text, redundant stat strips..."
   - *Direct Action*:
     - Strip lines 268–362 (marketing hero paragraphs, dual buttons with host CTA, 3-stat strip, circular portrait showcase with Indiranagar text).
     - Strip lines 862–1011 ("HOW PARKORBIT WORKS" 3-card constellation).
     - Strip lines 1013–1060 ("HOST MONETIZATION CALLOUT BANNER").
     - Replace the hero with a clean, focused Pune Driver Discovery banner: headline `"Find & Reserve Verified Parking in Pune"`, followed immediately by the search console.

2. **Localization of Search Console & Locality Dropdown**:
   - *Requirement R1 & R2*: "Replace all existing non-Pune locations (Bengaluru, Mumbai, Delhi)... with authentic Pune, Maharashtra neighborhoods... Koregaon Park, Baner, Hinjewadi, Kothrud, Viman Nagar, FC Road, Wakad, Magarpatta..."
   - *Direct Action*:
     - Update `searchCenter` initial state to Pune City Center (`lat: 18.5204, lng: 73.8567, label: "Pune City Center"`).
     - Update GPS fallback toast and coordinates to Pune City Center (`18.5204, 73.8567`).
     - Update search placeholder to `"Search Koregaon Park, Baner, Hinjewadi, Kothrud, Viman Nagar, FC Road, Wakad, Magarpatta..."`.
     - Replace `selectedCity` dropdown with `selectedLocality` dropdown containing Pune localities (`"All Pune Localities"`, `"Koregaon Park"`, `"Baner"`, `"Hinjewadi"`, `"Kothrud"`, `"Viman Nagar"`, `"FC Road"`, `"Wakad"`, `"Magarpatta"`). Selecting a locality sets `query`, updates `searchCenter` to that neighborhood's exact coordinates, and triggers sorting by distance.

3. **100% Elimination of "Mumbai" in Wakad Listing**:
   - *Observation*: The phrase "Mumbai-Pune Expressway" and "Mumbai-Pune bypass" in `listing-wakad-8` causes a query leak where `searchListings({ query: "Mumbai" })` returns 1 listing.
   - *Direct Action*:
     - In `src/lib/seed.ts` (lines 667, 669) and `data/parkorbit-db.json` (lines 611, 612), replace "Mumbai-Pune Expressway" with "Yashwantrao Chavan Expressway" and "Mumbai-Pune bypass" with "Pune bypass".
     - In `tests/challenger_m1_stress.test.ts`, update assertions so `dbMatches` is 0, `seedMatches` is 0, and `mumbaiResults` has length 0.

4. **Footer Hub Localization**:
   - *Direct Action*: In `src/components/layout/Footer.tsx` line 68, replace `"Urban Orbit Hubs (BLR • BOM • DEL) ↗"` with `"Pune Neighborhood Hubs (KP • Baner • Viman Nagar) ↗"`, pointing to `/#discover`. Keep `/logo.png` intact.

---

## 3. Caveats

1. **Coordination with Explorer 2 (Role Gating)**:
   - Explorer 2 is designing role-gated page rendering in `src/app/page.tsx` (e.g. redirecting or rendering Host Studio when active user role is `host`).
   - The de-cluttering proposed here defines the pure **Driver Landing View**. If `currentUser.role === 'host'`, Explorer 2's gate will seamlessly redirect or display the host dashboard without rendering this driver discovery view.
2. **Coordination with Milestone 3 (Interactive Leaflet Map)**:
   - `src/app/page.tsx` currently imports `OrbitMap` from `@/components/map/OrbitMap`.
   - In M3, this will be swapped for dynamic client-only `DriverDiscoveryMap`. The grid layout (`lg:col-span-5` for map, `lg:col-span-7` for listings) designed here directly accommodates `DriverDiscoveryMap`.
3. **Challenger Test Assertion Synchronization**:
   - `tests/challenger_m1_stress.test.ts` was previously asserting that 2 instances of "Mumbai" existed. Cleaning up the Wakad listing will cause `tests/challenger_m1_stress.test.ts` lines 215–216 to fail unless updated to expect 0 matches. The implementer must update both files simultaneously.

---

## 4. Conclusion & Precise Code Specifications

### 4.1 Changes to `src/lib/seed.ts` and `data/parkorbit-db.json`

#### `src/lib/seed.ts` (lines 666–670):
```typescript
<<<< BEFORE
        title: "Wakad Datta Mandir Road Dedicated Arcade Bay",
        subtitle: "Convenient transit parking near Hinjewadi Flyover & Mumbai-Pune Expressway",
        description:
          "Private access-controlled arcade bay on Datta Mandir Road in Wakad. Fast access to Hinjewadi IT corridor and Mumbai-Pune bypass with guaranteed spot during peak hours.",
==== AFTER
        title: "Wakad Datta Mandir Road Dedicated Arcade Bay",
        subtitle: "Convenient transit parking near Hinjewadi Flyover & Yashwantrao Chavan Expressway",
        description:
          "Private access-controlled arcade bay on Datta Mandir Road in Wakad. Fast access to Hinjewadi IT corridor and Pune bypass with guaranteed spot during peak hours.",
>>>>
```

#### `data/parkorbit-db.json` (lines 610–612):
```json
<<<< BEFORE
      "title": "Wakad Datta Mandir Road Dedicated Arcade Bay",
      "subtitle": "Convenient transit parking near Hinjewadi Flyover & Mumbai-Pune Expressway",
      "description": "Private access-controlled arcade bay on Datta Mandir Road in Wakad. Fast access to Hinjewadi IT corridor and Mumbai-Pune bypass with guaranteed spot during peak hours.",
==== AFTER
      "title": "Wakad Datta Mandir Road Dedicated Arcade Bay",
      "subtitle": "Convenient transit parking near Hinjewadi Flyover & Yashwantrao Chavan Expressway",
      "description": "Private access-controlled arcade bay on Datta Mandir Road in Wakad. Fast access to Hinjewadi IT corridor and Pune bypass with guaranteed spot during peak hours.",
>>>>
```

---

### 4.2 Changes to `src/components/layout/Footer.tsx` (lines 64–69):
```tsx
<<<< BEFORE
            <Link
              href="/#discover-search"
              className="inline-flex items-center gap-2.5 text-[14px] font-[450] text-white/90 hover:text-white"
            >
              <MapPin className="size-4 text-signal-light" />
              <span>Urban Orbit Hubs (BLR • BOM • DEL) ↗</span>
            </Link>
==== AFTER
            <Link
              href="/#discover"
              className="inline-flex items-center gap-2.5 text-[14px] font-[450] text-white/90 hover:text-white"
            >
              <MapPin className="size-4 text-signal-light" />
              <span>Pune Neighborhood Hubs (KP • Baner • Viman Nagar) ↗</span>
            </Link>
>>>>
```

---

### 4.3 Changes to `src/app/page.tsx`

#### A. Coordinates & Search Center State Updates
```typescript
<<<< BEFORE (lines 74–82)
  const [searchCenter, setSearchCenter] = useState<{
    lat: number;
    lng: number;
    label: string;
  } | null>({
    lat: 12.9784,
    lng: 77.6408,
    label: "Indiranagar, Bengaluru",
  });
==== AFTER
  const [selectedLocality, setSelectedLocality] = useState<string>("all");
  const [searchCenter, setSearchCenter] = useState<{
    lat: number;
    lng: number;
    label: string;
  } | null>({
    lat: 18.5204,
    lng: 73.8567,
    label: "Pune City Center",
  });
>>>>
```

#### B. Geolocation Fallback Update
```typescript
<<<< BEFORE (lines 203–211)
        toast.info(
          "Location permission not granted — defaulting to Indiranagar, Bengaluru."
        );
        setSearchCenter({
          lat: 12.9784,
          lng: 77.6408,
          label: "Indiranagar, Bengaluru (Fallback)",
        });
==== AFTER
        toast.info(
          "Location permission not granted — defaulting to Pune City Center."
        );
        setSearchCenter({
          lat: 18.5204,
          lng: 73.8567,
          label: "Pune City Center (Fallback)",
        });
>>>>
```

#### C. Locality Coordinate Preset Mapping & Handler
```typescript
const PUNE_LOCALITIES: Record<string, { lat: number; lng: number; label: string }> = {
  "Koregaon Park": { lat: 18.5362, lng: 73.8940, label: "Koregaon Park, Pune" },
  "Baner": { lat: 18.5590, lng: 73.7868, label: "Baner, Pune" },
  "Hinjewadi": { lat: 18.5913, lng: 73.7389, label: "Hinjewadi, Pune" },
  "Kothrud": { lat: 18.5074, lng: 73.8077, label: "Kothrud, Pune" },
  "Viman Nagar": { lat: 18.5679, lng: 73.9143, label: "Viman Nagar, Pune" },
  "FC Road": { lat: 18.5222, lng: 73.8416, label: "FC Road, Pune" },
  "Wakad": { lat: 18.5987, lng: 73.7686, label: "Wakad, Pune" },
  "Magarpatta": { lat: 18.5158, lng: 73.9272, label: "Magarpatta, Pune" },
};

const handleLocalityChange = (loc: string) => {
  setSelectedLocality(loc);
  if (loc === "all") {
    setQuery("");
    setSearchCenter({ lat: 18.5204, lng: 73.8567, label: "Pune City Center" });
  } else {
    setQuery(loc);
    const target = PUNE_LOCALITIES[loc];
    if (target) {
      setSearchCenter(target);
      setSortBy("distance");
    }
  }
};
```

#### D. Streamlined Driver Discovery Hero & Search Bar
Replace lines 229–531 with a sleek, uncluttered Driver Discovery Hero:
```tsx
      {/* 1. CLEAN DRIVER DISCOVERY HERO */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-8 pt-6 pb-10">
        <div className="relative rounded-[32px] bg-[#141413] text-[#F3F0EE] overflow-hidden shadow-mc-floating border border-black/10">
          {/* Subtle gradient texture */}
          <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#F37338_1px,transparent_1px)] [background-size:24px_24px]" />

          <div className="relative z-10 px-6 sm:px-10 py-10">
            {/* Header: Concise Pune Eyebrow & Title */}
            <div className="max-w-2xl mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-pill bg-white/10 backdrop-blur-sm border border-white/15 mb-3">
                <span className="w-2 h-2 rounded-full bg-[#F37338]" />
                <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#F3F0EE]">
                  PUNE PARKING DISCOVERY
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-medium tracking-[-0.02em] text-[#F3F0EE]">
                Find & reserve verified parking in Pune.
              </h1>
              <p className="text-sm sm:text-base text-[#D0CBC5] mt-2 max-w-xl">
                Instant access to private driveways, EV bays, and dedicated slots across Koregaon Park, Baner, Hinjewadi, and top Pune localities.
              </p>
            </div>

            {/* PROMINENT SEARCH CONSOLE */}
            <div className="bg-[#FCFBFA] text-[#141413] rounded-[24px] p-5 sm:p-6 shadow-2xl border border-black/10">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                {/* Destination Input */}
                <div className="md:col-span-4">
                  <label
                    htmlFor="hero-destination-input"
                    className="block text-xs font-bold uppercase tracking-wider text-[#595550] mb-1.5"
                  >
                    Destination, Landmark, or Locality
                  </label>
                  <div className="relative flex items-center">
                    <Search className="w-4 h-4 text-[#736E68] absolute left-3.5 pointer-events-none" />
                    <input
                      id="hero-destination-input"
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search Koregaon Park, Baner, Hinjewadi, Kothrud, Viman Nagar, FC Road, Wakad, Magarpatta..."
                      className="w-full h-11 pl-10 pr-24 rounded-xl border border-black/15 bg-white text-sm text-[#141413] placeholder:text-[#736E68] focus:outline-none focus:ring-2 focus:ring-[#CF4500]"
                    />
                    <button
                      type="button"
                      onClick={handleLocateMe}
                      disabled={locating}
                      className="absolute right-2 px-2.5 py-1 rounded-pill bg-[#F3F0EE] hover:bg-[#E8E2DA] text-[11px] font-bold text-[#141413] flex items-center gap-1 transition-colors"
                      title="Use browser GPS location"
                    >
                      <Compass className="w-3 h-3 text-[#CF4500]" />
                      {locating ? "..." : "Near Me"}
                    </button>
                  </div>
                </div>

                {/* Date Input */}
                <div className="md:col-span-2">
                  <label
                    htmlFor="hero-date-input"
                    className="block text-xs font-bold uppercase tracking-wider text-[#595550] mb-1.5"
                  >
                    Parking Date
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-[#736E68] absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      id="hero-date-input"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full h-11 pl-10 pr-3 rounded-xl border border-black/15 bg-white text-sm text-[#141413] focus:outline-none focus:ring-2 focus:ring-[#CF4500]"
                    />
                  </div>
                </div>

                {/* Arrival & Duration */}
                <div className="md:col-span-2">
                  <label
                    htmlFor="hero-time-input"
                    className="block text-xs font-bold uppercase tracking-wider text-[#595550] mb-1.5"
                  >
                    Arrival Time
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-[#736E68] absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      id="hero-time-input"
                      type="time"
                      value={arrivalTime}
                      onChange={(e) => setArrivalTime(e.target.value)}
                      className="w-full h-11 pl-10 pr-3 rounded-xl border border-black/15 bg-white text-sm text-[#141413] focus:outline-none focus:ring-2 focus:ring-[#CF4500]"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="hero-duration-select"
                    className="block text-xs font-bold uppercase tracking-wider text-[#595550] mb-1.5"
                  >
                    Duration
                  </label>
                  <select
                    id="hero-duration-select"
                    value={durationHours}
                    onChange={(e) => setDurationHours(Number(e.target.value))}
                    className="w-full h-11 px-3 rounded-xl border border-black/15 bg-white text-sm text-[#141413] focus:outline-none focus:ring-2 focus:ring-[#CF4500]"
                  >
                    <option value={1}>1 Hour</option>
                    <option value={2}>2 Hours</option>
                    <option value={3}>3 Hours</option>
                    <option value={4}>4 Hours</option>
                    <option value={6}>6 Hours</option>
                    <option value={8}>Full Workday (8 hrs)</option>
                    <option value={12}>Overnight (12 hrs)</option>
                    <option value={24}>24 Hours (1 Day)</option>
                    <option value={48}>Weekend (2 Days)</option>
                  </select>
                </div>

                {/* Vehicle Selector */}
                <div className="md:col-span-2">
                  <label
                    htmlFor="hero-vehicle-select"
                    className="block text-xs font-bold uppercase tracking-wider text-[#595550] mb-1.5"
                  >
                    Vehicle Size
                  </label>
                  <select
                    id="hero-vehicle-select"
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-black/15 bg-white text-sm text-[#141413] focus:outline-none focus:ring-2 focus:ring-[#CF4500]"
                  >
                    <option value="all">All Vehicles</option>
                    <option value="two_wheeler">Two-Wheeler / Bike</option>
                    <option value="hatchback">Hatchback / Compact</option>
                    <option value="sedan">Sedan</option>
                    <option value="suv">SUV / Crossover</option>
                    <option value="ev">EV Car (Charging)</option>
                  </select>
                </div>
              </div>

              {/* Popular Pune Localities Quick-Pills */}
              <div className="mt-4 pt-3 border-t border-black/8 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#736E68] mr-1">
                    Pune Localities:
                  </span>
                  {URBAN_HUBS.map((hub) => {
                    const isHubActive =
                      searchCenter?.label.includes(hub.name) ||
                      query.toLowerCase().includes(hub.name.toLowerCase());
                    return (
                      <button
                        key={hub.id}
                        type="button"
                        onClick={() => handleSelectHub(hub)}
                        className={`px-3 py-1 rounded-pill text-xs font-medium transition-all ${
                          isHubActive
                            ? "bg-[#141413] text-[#F3F0EE] font-semibold"
                            : "bg-[#F3F0EE] text-[#595550] hover:bg-[#E8E2DA] hover:text-[#141413]"
                        }`}
                      >
                        {hub.name}
                      </button>
                    );
                  })}
                </div>

                <label className="inline-flex items-center gap-2 text-xs font-medium text-[#595550] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={onlyAvailable}
                    onChange={(e) => setOnlyAvailable(e.target.checked)}
                    className="rounded border-black/25 text-[#CF4500] focus:ring-[#CF4500]"
                  />
                  <span>
                    Only show spots available for{" "}
                    <strong className="text-[#141413]">
                      {date} ({arrivalTime}, {durationHours}h)
                    </strong>
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </section>
```

#### E. Filter Bar Dropdown Replacement
In the Discovery section (lines 567–577), replace the legacy city dropdown:
```tsx
            <select
              aria-label="Filter by Locality"
              value={selectedLocality}
              onChange={(e) => handleLocalityChange(e.target.value)}
              className="h-9 px-3 rounded-pill bg-[#F3F0EE] text-xs font-medium text-[#141413] border border-transparent focus:outline-none focus:border-black/20"
            >
              <option value="all">All Pune Localities</option>
              <option value="Koregaon Park">Koregaon Park</option>
              <option value="Baner">Baner</option>
              <option value="Hinjewadi">Hinjewadi</option>
              <option value="Kothrud">Kothrud</option>
              <option value="Viman Nagar">Viman Nagar</option>
              <option value="FC Road">FC Road</option>
              <option value="Wakad">Wakad</option>
              <option value="Magarpatta">Magarpatta</option>
            </select>
```

#### F. Removal of Bottom Marketing Sections
- **Remove Section 3 ("HOW PARKORBIT WORKS")**: Delete lines 862–1011 entirely.
- **Remove Section 4 ("HOST MONETIZATION CALLOUT BANNER")**: Delete lines 1013–1060 entirely.

---

### 4.4 Changes to `tests/challenger_m1_stress.test.ts`
When the Wakad listing is updated:
```typescript
<<<< BEFORE (lines 215–216, 231)
      expect(dbMatches).toBe(2);
      expect(seedMatches).toBe(2);
      ...
      expect(mumbaiResults).toHaveLength(1);
==== AFTER
      expect(dbMatches).toBe(0);
      expect(seedMatches).toBe(0);
      ...
      expect(mumbaiResults).toHaveLength(0);
>>>>
```

---

## 5. Verification Method

1. **Verify Complete Elimination of "Mumbai"**:
   ```bash
   grep -ri "mumbai" src/lib/seed.ts data/parkorbit-db.json
   ```
   *Expected Result*: Zero matches found.
2. **Verify Elimination of Non-Pune Cities in Page and Footer**:
   ```bash
   grep -rn "Bengaluru\|BLR" src/app/page.tsx src/components/layout/Footer.tsx
   ```
   *Expected Result*: Zero matches found.
3. **Verify Test Suite**:
   ```bash
   npm test
   ```
   *Expected Result*: All tests in `tests/marketplace.test.ts` and `tests/challenger_m1_stress.test.ts` pass cleanly.
4. **Verify TypeScript & Production Build**:
   ```bash
   npm run build
   ```
   *Expected Result*: Clean build without type errors or unused imports.
5. **Invalidation Conditions**:
   - If `npm test` fails, check whether `challenger_m1_stress.test.ts` still expects `dbMatches === 2`. Update it to expect 0.
   - If `npm run build` fails, ensure removed JSX sections did not leave dangling unused imports in `src/app/page.tsx` (e.g. `Zap`, `CheckCircle2`, `IndianRupee` if no longer used).
