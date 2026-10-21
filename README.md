<div align="center">

<img src="public/logo.png" alt="ParkOrbit Logo" width="140" />

# ParkOrbit

**Peer-to-Peer Urban Parking Marketplace with Interactive Geospatial Discovery**

[![Next.js](https://img.shields.io/badge/Next.js-15.1.7-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-blue?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.17-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9.4-199900?style=flat-square&logo=leaflet)](https://leafletjs.com/)
[![Vitest](https://img.shields.io/badge/Vitest-3.0.6-6E9F18?style=flat-square&logo=vitest)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

*Connecting Pune's drivers with available private parking spaces in high-density urban corridors.*

---

</div>

## 📌 Overview

**ParkOrbit** is a modern peer-to-peer (P2P) parking marketplace platform designed to tackle urban parking congestion and inefficient curb space utilization. Focused on Pune, Maharashtra, ParkOrbit connects local property owners (hosts) who have underutilized parking spots—such as residential driveways, covered society slots, and commercial spaces—with drivers in need of secure, predictable, and cost-effective parking.

The platform provides a streamlined experience for both drivers and space owners, featuring interactive map discovery, real-time hourly pricing pins, instant 1-click persona switching for effortless demos, and comprehensive host space management.

---

## ✨ Key Features

### 🚗 For Drivers
- **Interactive Geospatial Discovery**: Explore parking spaces across Pune via an open-source Leaflet and Carto Voyager map interface.
- **Dynamic Price Markers**: View live `₹/hr` pricing tags pinned directly to geographic coordinates.
- **Neighborhood Quick-Filters**: Instantly jump to major Pune urban hubs including Hinjawadi, Baner, Koregaon Park, Shivajinagar, Kothrud, and Viman Nagar.
- **Amenity & Space Filtering**: Filter listings by EV charging stations, covered parking, CCTV surveillance, 24/7 security, and wheelchair accessibility.
- **Seamless Booking**: Instant reservation workflow with time slot selection, transparent fee breakdowns, and automated booking receipts.

### 🏡 For Hosts
- **Intuitive Space Onboarding**: Multi-step wizard to list private parking spaces with dimensional sizing, accepted vehicle types, and amenity badges.
- **Interactive Pin-Drop Map Picker**: Precise click-to-pin and drag-and-drop location picker with Pune coordinate presets and landmark geocoding HUD.
- **Flexible Pricing Control**: Set custom base hourly rates with automated calculations for host net earnings and platform service fees.
- **Reservations & Spaces Inbox**: Real-time dashboard to monitor incoming bookings, check-in statuses, and track pending/estimated payouts.

### 🛡️ For Admins & Operations
- **Trust & Safety Moderation**: Review user verification requests, audit flagged listings, and handle driver-host dispute reports.
- **Platform Analytics**: Monitor active bookings, marketplace commission metrics, and Pune neighborhood listing distributions.

### ⚡ Developer & Demo Experience
- **1-Click Persona Switcher**: Segmented toggle in the top navigation bar to switch instantly between Driver, Host, and Admin perspectives without manual re-login.
- **Zero-Config Database**: Atomic file-backed JSON store (`data/parkorbit-db.json`) with pre-seeded, authentic Pune locations and MH-registered demo profiles.
- **Robust Test Coverage**: 110+ passing unit and integration tests across data contracts, pricing engines, geospatial boundaries, and marketplace workflows.

---

## 🛠️ Tech Stack

| Domain | Technology | Description |
|---|---|---|
| **Framework** | [Next.js 15](https://nextjs.org/) | App Router, Server Actions, Route Handlers, SSR/CSR optimizations |
| **UI Library** | [React 19](https://react.dev/) | Modern concurrent UI engine |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) | End-to-end type safety with strict mode |
| **Styling** | [Tailwind CSS 3](https://tailwindcss.com/) | Responsive design, custom design tokens, dark-mode ready |
| **Component Primitives** | [Radix UI](https://www.radix-ui.com/) | Accessible dialogs, dropdowns, switches, tabs, and avatars |
| **Icons & Feedback** | [Lucide React](https://lucide.dev/) & [Sonner](https://sonner.emilkowal.ski/) | Iconography and toast feedback notifications |
| **Geospatial & Maps** | [Leaflet](https://leafletjs.com/) & [React-Leaflet](https://react-leaflet.js.org/) | Carto Voyager tiles, custom `L.divIcon` price pins, GeoJSON boundaries |
| **Validation** | [Zod 3](https://zod.dev/) | Schema validation for user inputs and API payloads |
| **Data Persistence** | File-backed JSON DB | Lightweight in-memory + file-persisted data layer (`data/parkorbit-db.json`) |
| **Testing** | [Vitest](https://vitest.dev/) & [Playwright](https://playwright.dev/) | Fast unit testing, integration suites, and browser-level E2E tests |

---

## 📁 Project Structure

```text
parkorbit/
├── data/
│   └── parkorbit-db.json         # File-persisted canonical JSON database
├── public/
│   ├── logo.png                  # Platform logo
│   └── pune-boundary.geojson     # Pune district geographic GeoJSON boundary
├── src/
│   ├── app/
│   │   ├── admin/                # Admin Trust & Safety moderation console
│   │   ├── api/                  # REST Route Handlers (auth, bookings, listings, reports)
│   │   ├── dashboard/            # Driver & Host personalized dashboards
│   │   │   ├── driver/           # Driver bookings and active parking passes
│   │   │   └── host/             # Host listings management and reservations
│   │   ├── host/new/             # Space listing wizard with map picker
│   │   ├── listings/[id]/        # Individual listing detail & reservation flow
│   │   ├── globals.css           # Global Tailwind & Leaflet map styling rules
│   │   ├── layout.tsx            # Root HTML layout & AuthContext provider
│   │   └── page.tsx              # Driver discovery landing page with live map
│   ├── components/
│   │   ├── host/                 # Listing creation form and host management UI
│   │   ├── layout/               # Global Navbar (with 1-click switcher) & Footer
│   │   ├── map/                  # Leaflet map components (DriverDiscoveryMap, HostLocationPicker)
│   │   └── ui/                   # Modular UI primitives (buttons, badges, cards, dialogs)
│   ├── context/
│   │   └── AuthContext.tsx       # Auth provider with multi-persona session management
│   └── lib/
│       ├── availability.ts       # Booking slot validation & collision detection
│       ├── db.ts                 # Atomic CRUD data access layer
│       ├── pricing.ts            # Fee calculation, commission rates, and receipts
│       ├── seed.ts               # Seed data generator for Pune urban corridors
│       ├── types.ts              # Domain types (User, Listing, Booking, Review, Hub)
│       └── utils.ts              # CSS class merging (`cn`) and formatting helpers
├── tests/                        # Vitest unit, integration, and stress test suites
├── .env.example                  # Environment configuration template
├── package.json                  # Dependencies and execution scripts
├── tailwind.config.ts            # Tailwind styling tokens and animations
└── tsconfig.json                 # TypeScript compiler configuration
```

---

## 👥 Demo Personas

ParkOrbit comes pre-loaded with authentic personas to test the complete peer-to-peer flow out of the box using the top navigation bar's **Demo Persona Switcher**:

| Persona | Name | Role | Location / Focus | Vehicle / Space Details |
|---|---|---|---|---|
| **Driver** | Aarav Mehta | `driver` | Baner / Hinjawadi | Tata Nexon EV (`MH-12-RN-4821`) |
| **Host 1** | Neha Kulkarni | `host` | Koregaon Park | Covered Stilt Spot (`MH-12-KP-9012`) |
| **Host 2** | Vikram Joshi | `host` | Kothrud | Private Driveway (`MH-14-BJ-3310`) |
| **Admin** | Nandini Sharma | `admin` | Pune Central | Moderation & Platform Audit |

> **Tip:** Switching personas automatically updates your active session cookie, synchronizes the UI view, and filters visible navigation links.

---

## 🚦 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) version **18.18+** or **20+**
- [npm](https://www.npmjs.com/), [pnpm](https://pnpm.io/), or [yarn](https://yarnpkg.com/)

### 1. Clone the Repository
```bash
git clone https://github.com/harshadd-ops/ParkOrbit.git
cd ParkOrbit
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy the sample environment file to `.env.local`:
```bash
cp .env.example .env.local
```

The application functions out of the box with default local settings:
```env
# Database Persistence Path
PARKORBIT_DB_PATH="./data/parkorbit-db.json"

# Marketplace Business Model
PLATFORM_COMMISSION_PERCENT="12"
DRIVER_SERVICE_FEE_PERCENT="5"

# Payment Mode ("simulated_test" operates safely without external payment APIs)
PAYMENT_PROVIDER_MODE="simulated_test"
PAYOUT_PROVIDER_MODE="estimated_pending"

# Optional External API Keys (Defaults to open Carto / OSM tiles)
NEXT_PUBLIC_MAP_PROVIDER="interactive_orbit"
SESSION_SECRET="parkorbit-dev-secret-change-in-production"
```

### 4. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to access ParkOrbit.

---

## 🧪 Testing & Verification

The project includes an extensive suite of automated tests verifying database constraints, geospatial boundaries, pricing formulas, and the end-to-end booking lifecycle:

```bash
# Run the full Vitest test suite
npm test

# Run tests in interactive watch mode
npm run test:watch

# Validate TypeScript compilation without emitting output
npm run typecheck

# Run Playwright End-to-End tests
npm run test:e2e
```

### Build for Production
Verify production bundle compilation:
```bash
npm run build
npm run start
```

---

## 🌐 API Overview

ParkOrbit includes built-in RESTful Next.js Route Handlers:

| Endpoint | Method | Description |
|---|---|---|
| `/api/listings` | `GET` | Query listings with filters (locality, vehicle, price, amenities) |
| `/api/listings` | `POST` | Create a new parking space listing (Host authenticated) |
| `/api/listings/[id]` | `GET`, `PUT`, `DELETE` | Retrieve, update, or unpublish a specific parking space |
| `/api/bookings` | `GET` | List bookings filtered by user role (`driver` or `host`) |
| `/api/bookings` | `POST` | Create a new reservation with instant slot collision checks |
| `/api/bookings/[id]` | `PATCH` | Update reservation state (`checked_in`, `completed`, `cancelled`) |
| `/api/auth` | `POST` | Switch active demo persona or handle email login/registration |
| `/api/reviews` | `GET`, `POST` | Fetch listing reviews and submit driver ratings |
| `/api/reports` | `GET`, `POST` | Admin moderation reporting for disputes and policy flags |

---

## 🗺️ Pune Neighborhood Coverage

ParkOrbit comes pre-configured with boundary coordinates and listings across key Pune hubs:
- **Hinjawadi** (Phases 1, 2, 3 Tech Corridor)
- **Koregaon Park & Kalyani Nagar** (Commercial & Dining Hub)
- **Baner & Balewadi High Street** (IT & Retail Belt)
- **Shivajinagar & FC Road** (Central Commercial & Educational District)
- **Kothrud & Karve Nagar** (High-Density Residential Hub)
- **Viman Nagar** (Airport & Commercial District)
- **Swargate & Camp** (Transit & Heritage Hubs)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
