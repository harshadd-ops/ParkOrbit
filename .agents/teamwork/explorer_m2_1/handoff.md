# Handoff Report — Specifications for Navbar.tsx & AuthContext.tsx (Milestone 2)

**Agent**: Explorer 1 (Milestone 2 — Role-Specific Views & 1-Click Demo Persona Switcher)  
**Date**: 2026-10-19T17:05:00Z  
**Target Files**: `src/components/layout/Navbar.tsx`, `src/context/AuthContext.tsx`  
**Related Files**: `src/lib/types.ts`, `src/lib/seed.ts`, `public/logo.png`, `src/app/layout.tsx`

---

## 1. Observation

### 1.1 Existing Navigation Structure in `src/components/layout/Navbar.tsx`
- **Lines 67–73**:
  ```typescript
  const navLinks = [
    { href: "/", label: "Discover Spaces" },
    { href: "/host/new", label: "Host a Space" },
    { href: "/dashboard/driver", label: "Driver Hub" },
    { href: "/dashboard/host", label: "Host Studio" },
    { href: "/admin", label: "Trust & Admin" },
  ];
  ```
  All 5 navigation links are statically rendered to every user simultaneously, violating the requirement of strict role-specific separation where Drivers must see only Driver links and Hosts must see only Host links.
- **Lines 103–109**:
  ```tsx
  <img
    src="/logo.png"
    alt="ParkOrbit Logo"
    width={29}
    height={36}
    className="h-9 w-auto object-contain select-none shrink-0"
  />
  ```
  Official logo is properly imported from `/logo.png` and verified intact in `public/logo.png`.
- **Lines 146–169**:
  User account pill displays hardcoded subtitle `"Trust Admin"` for admin and `"Driver & Host"` for all other users, failing to reflect individual roles (`driver` vs `host`).
- **Lines 232–326**:
  Persona switching is buried inside a secondary modal dialog (`Dialog` with `<Tabs defaultValue="switch">`), requiring 3 to 4 clicks (click account button -> open dialog -> switch tab -> scroll -> click "Switch"). There is **no 1-click persona switcher** visible in the top navigation bar.

### 1.2 Authentication Context in `src/context/AuthContext.tsx`
- **Lines 7–15**:
  ```typescript
  interface DemoUserSummary {
    id: string;
    name: string;
    email: string;
    role: string;
    avatarUrl: string;
    bio: string;
    isDemo: boolean;
  }
  ```
  `role` is typed as loose `string` instead of `UserRole` (`"driver" | "host" | "admin" | "user"`).
- **Lines 68–82**:
  ```typescript
  const switchUser = async (userId: string) => {
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "switch", userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to switch account");
      setCurrentUser(data.currentUser);
      toast.success(`Switched active account to ${data.currentUser.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Switch failed");
    }
  };
  ```
  `switchUser` returns `void`. Calling components cannot easily inspect the switched user object or trigger route synchronization automatically.
- No exported pre-configured demo personas constant exists for UI consumption.

### 1.3 Seeded Personas in `src/lib/seed.ts`
- `user-driver-1`: **Aarav Mehta** (`role: "driver"`, email: `aarav@demo.parkorbit.in`, plate: `MH-12-RN-4821`, city: `Pune`)
- `user-host-1`: **Neha Kulkarni** (`role: "host"`, email: `host@demo.parkorbit.in`, plate: `MH-12-KP-9012`, city: `Pune`)
- `user-host-2`: **Vikram Joshi** (`role: "host"`, email: `vikram@demo.parkorbit.in`, plate: `MH-14-BJ-3310`, city: `Pune`)
- `user-admin-1`: **Nandini Sharma (Trust & Safety)** (`role: "admin"`, email: `admin@demo.parkorbit.in`, plate: `MH-12-AD-0001`, city: `Pune`)

---

## 2. Logic Chain

1. **Prominent 1-Click Persona Switcher directly inside Navbar**:
   - *Requirement*: 1-click segmented switcher with 3 options: `🚗 Driver (Aarav)`, `🏠 Host (Neha)`, `🛡️ Admin (Nandini)` directly inside the Navbar header with an active indicator pill.
   - *Design Solution*: Create a sleek segmented control embedded directly in the main header bar.
   - *Visual Tokens*: A pill container (`bg-canvas/90 border border-ink/10 rounded-pill p-1 shadow-inner`) containing 3 segmented buttons.
   - *Active State Indicator*: The active persona button has `bg-ink text-canvas shadow-sm` and a live badge dot, while inactive buttons use `text-ink/75 hover:text-ink hover:bg-white/60`.
   - *1-Click Execution*: Clicking an inactive persona button calls `switchUser(personaId)` immediately (1 click), updates context state, sets the session cookie, and provides visual confirmation via toast.
2. **Intelligent Route Synchronization on Switch**:
   - *Requirement R4*: A Host adds a space, switches to Driver in 1 click, and immediately sees the space on the discovery map. A Driver books a space, switches to Host, and immediately sees the booking on the Host studio.
   - *Design Solution*: When switching to:
     - `driver`: If current route is `/dashboard/host`, `/host/*`, or `/admin`, navigate to `/` (Driver discovery).
     - `host`: If current route is `/` or `/dashboard/driver`, navigate to `/dashboard/host` (Host studio).
     - `admin`: If current route is not `/admin`, navigate to `/admin` (Trust & Moderation console).
   - This prevents Drivers from getting stranded on Host-only edit screens and vice-versa.
3. **Strict Role-Based Navigation Links**:
   - *Requirement*:
     - Driver: `Find Parking` (`/`), `My Bookings` (`/dashboard/driver`).
     - Host: `My Spaces & Bookings` (`/dashboard/host`), `Host a Space` (`/host/new`).
     - Admin: `Trust & Moderation` (`/admin`).
   - *Design Solution*: Derive `navLinks` dynamically via `getNavLinks(currentUser?.role)`.
   - *Result*: Zero host space-creation links or host studio links appear when logged in as Driver. Zero driver search links appear when logged in as Host. Zero admin moderation links appear for non-admins.
4. **Logo Asset Preservation**:
   - Retain `/logo.png` exactly intact with width 29, height 36, and responsive brand wordmark ("ParkOrbit — Pune Mobility Network").
5. **Mobile Responsiveness**:
   - On desktop (`md:` & `lg:`), render full labels: `🚗 Driver (Aarav)`, `🏠 Host (Neha)`, `🛡️ Admin (Nandini)`.
   - On smaller screens (`sm:`), render `🚗 Aarav`, `🏠 Neha`, `🛡️ Nandini`.
   - In the mobile hamburger drawer, render the 1-click segmented switcher prominently at the top, followed by role-specific navigation links.

---

## 3. Caveats

1. **Server-Side Session Hydration**:
   `switchUser` invokes `/api/auth` which updates the `parkorbit_user_id` cookie. Next.js App Router Server Components rely on this cookie. Calling `router.refresh()` alongside `router.push()` ensures any SSR components immediately re-render with the switched user's data.
2. **Unauthenticated / Guest Fallback**:
   If `currentUser` is null or unauthenticated, default to the Driver view (`Find Parking`, `My Bookings`) so first-time visitors can immediately explore Pune parking without friction.

---

## 4. Conclusion & Component Code Specifications

### 4.1 Specification for `src/context/AuthContext.tsx`

```tsx
"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { PlatformConfig, User, UserRole } from "@/lib/types";
import { toast } from "sonner";

export interface DemoUserSummary {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string;
  bio: string;
  isDemo: boolean;
}

export interface DemoPersonaConfig {
  id: string;
  role: "driver" | "host" | "admin";
  icon: string;
  name: string;
  fullName: string;
  label: string;
  shortLabel: string;
  mobileLabel: string;
  targetPath: string;
}

export const DEMO_PERSONAS: readonly DemoPersonaConfig[] = [
  {
    id: "user-driver-1",
    role: "driver",
    icon: "🚗",
    name: "Aarav",
    fullName: "Aarav Mehta",
    label: "Driver (Aarav)",
    shortLabel: "Driver",
    mobileLabel: "🚗 Aarav",
    targetPath: "/",
  },
  {
    id: "user-host-1",
    role: "host",
    icon: "🏠",
    name: "Neha",
    fullName: "Neha Kulkarni",
    label: "Host (Neha)",
    shortLabel: "Host",
    mobileLabel: "🏠 Neha",
    targetPath: "/dashboard/host",
  },
  {
    id: "user-admin-1",
    role: "admin",
    icon: "🛡️",
    name: "Nandini",
    fullName: "Nandini Sharma",
    label: "Admin (Nandini)",
    shortLabel: "Admin",
    mobileLabel: "🛡️ Nandini",
    targetPath: "/admin",
  },
] as const;

interface AuthContextValue {
  currentUser: User | null;
  demoUsers: DemoUserSummary[];
  config: PlatformConfig | null;
  isLoading: boolean;
  authModalOpen: boolean;
  activeRole: UserRole;
  isDriver: boolean;
  isHost: boolean;
  isAdmin: boolean;
  setAuthModalOpen: (open: boolean) => void;
  switchUser: (userId: string) => Promise<User | null>;
  login: (email: string, password?: string) => Promise<boolean>;
  register: (input: {
    name: string;
    email: string;
    phone: string;
    password?: string;
    upiId?: string;
    bio?: string;
  }) => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<boolean>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [demoUsers, setDemoUsers] = useState<DemoUserSummary[]>([]);
  const [config, setConfig] = useState<PlatformConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const refreshAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.currentUser || null);
        setDemoUsers(data.demoUsers || []);
        setConfig(data.config || null);
      }
    } catch {
      // ignore network error on init
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const activeRole: UserRole = useMemo(() => {
    if (!currentUser) return "driver";
    return currentUser.role || "driver";
  }, [currentUser]);

  const isDriver = activeRole === "driver";
  const isHost = activeRole === "host";
  const isAdmin = activeRole === "admin";

  const switchUser = async (userId: string): Promise<User | null> => {
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "switch", userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to switch account");
      const user = data.currentUser as User;
      setCurrentUser(user);
      const roleBadge = user.role.toUpperCase();
      toast.success(`Switched active account to ${user.name} (${roleBadge})`);
      return user;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Switch failed");
      return null;
    }
  };

  const login = async (email: string, password?: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sign in failed");
      setCurrentUser(data.currentUser);
      await refreshAuth();
      toast.success(`Welcome back, ${data.currentUser.name}`);
      setAuthModalOpen(false);
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
      return false;
    }
  };

  const register = async (input: {
    name: string;
    email: string;
    phone: string;
    password?: string;
    upiId?: string;
    bio?: string;
  }): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "register", ...input }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      setCurrentUser(data.currentUser);
      await refreshAuth();
      toast.success(`Account created! Welcome to ParkOrbit, ${data.currentUser.name}`);
      setAuthModalOpen(false);
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
      return false;
    }
  };

  const logout = async () => {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    setCurrentUser(null);
    toast.info("Signed out of ParkOrbit.");
  };

  const updateProfile = async (updates: Partial<User>): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_profile", ...updates }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      setCurrentUser(data.currentUser);
      toast.success("Profile updated.");
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Profile update failed");
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        demoUsers,
        config,
        isLoading,
        authModalOpen,
        activeRole,
        isDriver,
        isHost,
        isAdmin,
        setAuthModalOpen,
        switchUser,
        login,
        register,
        logout,
        updateProfile,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
```

---

### 4.2 Specification for `src/components/layout/Navbar.tsx`

```tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, DEMO_PERSONAS, DemoPersonaConfig } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/primitives";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  Input,
} from "@/components/ui/field";
import {
  LogOut,
  Menu,
  PlusCircle,
  Search,
  ShieldCheck,
  UserCheck,
  X,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    currentUser,
    demoUsers,
    authModalOpen,
    setAuthModalOpen,
    switchUser,
    login,
    register,
    logout,
    activeRole,
  } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("aarav@demo.parkorbit.in");
  const [loginPassword, setLoginPassword] = useState("demo123");

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("+91 98450 99000");
  const [regUpi, setRegUpi] = useState("");
  const [regPassword, setRegPassword] = useState("pass123");

  // Strict role-based navigation links per Requirement R2
  const getNavLinks = (role: string) => {
    switch (role) {
      case "driver":
        return [
          { href: "/", label: "Find Parking" },
          { href: "/dashboard/driver", label: "My Bookings" },
        ];
      case "host":
        return [
          { href: "/dashboard/host", label: "My Spaces & Bookings" },
          { href: "/host/new", label: "Host a Space" },
        ];
      case "admin":
        return [
          { href: "/admin", label: "Trust & Moderation" },
        ];
      default:
        return [
          { href: "/", label: "Find Parking" },
          { href: "/dashboard/driver", label: "My Bookings" },
        ];
    }
  };

  const navLinks = getNavLinks(activeRole);

  const handlePersonaClick = async (persona: DemoPersonaConfig) => {
    if (currentUser?.id === persona.id) return;
    const switched = await switchUser(persona.id);
    if (!switched) return;

    // Intelligently sync the current view to the target role's primary space
    if (persona.role === "host") {
      if (pathname === "/" || pathname.startsWith("/dashboard/driver")) {
        router.push("/dashboard/host");
      }
    } else if (persona.role === "driver") {
      if (
        pathname.startsWith("/dashboard/host") ||
        pathname.startsWith("/host/") ||
        pathname.startsWith("/admin")
      ) {
        router.push("/");
      }
    } else if (persona.role === "admin") {
      if (!pathname.startsWith("/admin")) {
        router.push("/admin");
      }
    }
    router.refresh();
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(loginEmail, loginPassword);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await register({
      name: regName,
      email: regEmail,
      phone: regPhone,
      upiId: regUpi,
      password: regPassword,
    });
  };

  // Determine root destination based on active role
  const brandRootHref = activeRole === "host" ? "/dashboard/host" : activeRole === "admin" ? "/admin" : "/";

  return (
    <>
      <header className="sticky top-6 z-40 mx-auto w-full max-w-[1280px] px-3 md:px-8">
        <nav
          aria-label="Primary Navigation"
          className="flex items-center justify-between gap-2 md:gap-4 rounded-pill bg-white/95 backdrop-blur-md px-4 py-2.5 md:px-6 md:py-3 shadow-nav border border-ink/5"
        >
          {/* Left: ParkOrbit Brand Mark + Pune Network Wordmark */}
          <Link
            href={brandRootHref}
            className="flex items-center gap-2.5 group focus:outline-none shrink-0"
            data-testid="navbar-brand-link"
          >
            {/* OFFICIAL LOGO PRESERVED INTACT */}
            <img
              src="/logo.png"
              alt="ParkOrbit Logo"
              width={29}
              height={36}
              className="h-9 w-auto object-contain select-none shrink-0"
            />
            <div className="flex flex-col">
              <span className="text-[18px] md:text-[19px] font-medium tracking-[-0.03em] leading-none text-ink">
                ParkOrbit
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-slate mt-0.5">
                Pune Mobility
              </span>
            </div>
          </Link>

          {/* Center-Left: Strict Role-Based Links (Desktop) */}
          <div className="hidden lg:flex items-center gap-2 xl:gap-4 shrink-0">
            {navLinks.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "text-[15px] font-medium tracking-[-0.02em] leading-none transition-colors py-2 px-3.5 rounded-pill",
                    isActive
                      ? "bg-ink text-canvas shadow-xs"
                      : "text-ink hover:text-signal-clay hover:bg-canvas/60"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Center-Right: 1-Click Segmented Demo Persona Switcher */}
          <div
            data-testid="nav-persona-switcher"
            aria-label="Demo Persona Switcher"
            className="flex items-center p-1 rounded-pill bg-canvas/90 border border-ink/10 shadow-inner"
          >
            {DEMO_PERSONAS.map((persona) => {
              const isActive = currentUser?.id === persona.id;
              return (
                <button
                  key={persona.id}
                  type="button"
                  data-testid={`persona-pill-${persona.role}`}
                  aria-pressed={isActive}
                  onClick={() => handlePersonaClick(persona)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-pill text-[12px] sm:text-[13px] font-medium transition-all select-none",
                    isActive
                      ? "bg-ink text-canvas shadow-sm font-semibold"
                      : "text-ink/75 hover:text-ink hover:bg-white/60"
                  )}
                  title={`Switch to ${persona.fullName} (${persona.shortLabel})`}
                >
                  <span className="text-[14px] leading-none select-none">{persona.icon}</span>
                  <span className="hidden sm:inline">{persona.label}</span>
                  <span className="sm:hidden">{persona.name}</span>
                  {isActive && (
                    <span className="size-1.5 rounded-full bg-signal-light ml-0.5 animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right: Search Jump (Driver Only) + User Pill + Mobile Trigger */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Show search button only for Driver role */}
            {activeRole === "driver" && (
              <button
                type="button"
                onClick={() => router.push("/#discover-search")}
                aria-label="Jump to Pune parking search"
                className="hidden sm:inline-flex size-10 rounded-full border border-ink/20 text-ink bg-white hover:bg-ink hover:text-canvas items-center justify-center transition-colors"
                title="Search Pune Parking"
              >
                <Search className="size-4" />
              </button>
            )}

            {currentUser ? (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                data-testid="nav-account-trigger"
                className="flex items-center gap-2 rounded-pill border border-ink/15 bg-white hover:bg-canvas px-2.5 py-1 text-left transition-colors"
              >
                <Avatar className="size-7 md:size-8">
                  <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                  <AvatarFallback>
                    {currentUser.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden xl:flex flex-col pr-1">
                  <span className="text-[12px] font-medium leading-tight text-ink truncate max-w-[100px]">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] font-semibold text-slate uppercase tracking-wider leading-tight">
                    {currentUser.role === "admin"
                      ? "🛡️ Admin"
                      : currentUser.role === "host"
                      ? "🏠 Host"
                      : "🚗 Driver"}
                  </span>
                </div>
              </button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => setAuthModalOpen(true)}
                data-testid="nav-signin-button"
              >
                Sign In
              </Button>
            )}

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              className="lg:hidden size-10 rounded-full border border-ink/20 text-ink bg-white inline-flex items-center justify-center"
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </nav>

        {/* Mobile Full-Overlay Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-2 rounded-stadium bg-white p-5 shadow-halo border border-ink/10 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex flex-col gap-1.5 pb-3 border-b border-ink/10">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate">
                1-Click Demo Persona Switcher
              </span>
              <div className="flex flex-wrap gap-2 pt-1">
                {DEMO_PERSONAS.map((persona) => {
                  const isActive = currentUser?.id === persona.id;
                  return (
                    <Button
                      key={persona.id}
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        handlePersonaClick(persona);
                        setMobileMenuOpen(false);
                      }}
                      className="rounded-pill text-[13px]"
                    >
                      <span className="mr-1">{persona.icon}</span>
                      {persona.label}
                      {isActive && <Check className="ml-1.5 size-3.5" />}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate mb-1">
                {activeRole.toUpperCase()} Navigation
              </span>
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-[16px] font-medium tracking-[-0.02em] text-ink py-2 px-1 border-b border-ink/5 flex items-center justify-between"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="pt-2 flex justify-between items-center">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setAuthModalOpen(true);
                }}
              >
                Account Settings / Switcher
              </Button>
              {currentUser && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="text-signal hover:text-signal-clay"
                >
                  <LogOut className="size-4 mr-1" />
                  Sign Out
                </Button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Unified Account & Full Roster Dialog Modal */}
      <Dialog open={authModalOpen} onOpenChange={setAuthModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <div className="mc-eyebrow">
              <span className="mc-eyebrow-dot" />
              <span>Pune Mobility Persona & Auth</span>
            </div>
            <DialogTitle className="mt-1">
              ParkOrbit Pune Accounts
            </DialogTitle>
            <DialogDescription>
              Switch between seeded Pune demo personas or access personal account credentials.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="switch" className="w-full">
            <TabsList className="w-full justify-start overflow-x-auto bg-canvas">
              <TabsTrigger value="switch">Demo Personas</TabsTrigger>
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="register">Create Account</TabsTrigger>
            </TabsList>

            <TabsContent value="switch">
              <div className="flex flex-col gap-3">
                <p className="text-[13px] text-slate">
                  Seeded Pune personas with authentic Maharashtra vehicle plates and localized Pune parking spaces:
                </p>
                {demoUsers.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  return (
                    <div
                      key={u.id}
                      className={cn(
                        "flex items-center justify-between gap-4 rounded-[20px] p-3.5 border transition-all",
                        isCurrent
                          ? "bg-canvas border-ink shadow-xs"
                          : "bg-lifted border-ink/15 hover:border-ink/40"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="size-10">
                          <AvatarImage src={u.avatarUrl} alt={u.name} />
                          <AvatarFallback>
                            {u.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[15px] font-medium text-ink">
                              {u.name}
                            </span>
                            <Badge
                              variant={
                                u.role === "admin"
                                  ? "signal"
                                  : u.role === "host"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {u.role.toUpperCase()}
                            </Badge>
                          </div>
                          <span className="text-[12px] text-slate">{u.email}</span>
                          <span className="text-[11px] text-granite line-clamp-1">
                            {u.bio}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant={isCurrent ? "default" : "secondary"}
                        size="sm"
                        onClick={async () => {
                          await switchUser(u.id);
                          setAuthModalOpen(false);
                          if (u.role === "host") router.push("/dashboard/host");
                          else if (u.role === "driver") router.push("/");
                          else if (u.role === "admin") router.push("/admin");
                          router.refresh();
                        }}
                        data-testid={`switch-user-${u.id}`}
                      >
                        {isCurrent ? (
                          <>
                            <UserCheck data-icon="inline-start" />
                            Active
                          </>
                        ) : (
                          "Switch"
                        )}
                      </Button>
                    </div>
                  );
                })}

                {currentUser && (
                  <div className="flex justify-between items-center pt-3 border-t border-ink/10">
                    <span className="text-[13px] text-slate">
                      Active: <strong>{currentUser.email}</strong> ({currentUser.role})
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await logout();
                        setAuthModalOpen(false);
                        router.push("/");
                        router.refresh();
                      }}
                    >
                      <LogOut data-icon="inline-start" />
                      Sign Out
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="login">
              <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="login-email">Email Address</FieldLabel>
                    <Input
                      id="login-email"
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="login-password">Password</FieldLabel>
                    <Input
                      id="login-password"
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                    <FieldDescription>
                      Demo password: <code>demo123</code> (or <code>admin123</code>)
                    </FieldDescription>
                  </Field>
                </FieldGroup>
                <Button type="submit" className="w-full">
                  Sign In to ParkOrbit
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="reg-name">Full Name</FieldLabel>
                    <Input
                      id="reg-name"
                      placeholder="Ananya Deshpande"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="reg-email">Email Address</FieldLabel>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="ananya@example.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      required
                    />
                  </Field>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field>
                      <FieldLabel htmlFor="reg-phone">Mobile Number</FieldLabel>
                      <Input
                        id="reg-phone"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        required
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="reg-upi">UPI ID</FieldLabel>
                      <Input
                        id="reg-upi"
                        placeholder="ananya@okhdfcbank"
                        value={regUpi}
                        onChange={(e) => setRegUpi(e.target.value)}
                      />
                    </Field>
                  </div>
                  <Field>
                    <FieldLabel htmlFor="reg-password">Password</FieldLabel>
                    <Input
                      id="reg-password"
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      required
                    />
                  </Field>
                </FieldGroup>
                <Button type="submit" className="w-full" data-testid="register-submit-btn">
                  <PlusCircle data-icon="inline-start" />
                  Create Pune Account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

---

## 5. Verification Method

1. **Verify Test Suite**:
   ```bash
   npx vitest run --fileParallelism=false
   ```
   (Must confirm all 47 tests continue to pass).
2. **Verify Component Integrity**:
   - Confirm `/logo.png` is preserved intact with dimensions `width={29}`, `height={36}`, and `<img src="/logo.png" ... />`.
   - Confirm the 3 persona pills exist with `data-testid="persona-pill-driver"`, `data-testid="persona-pill-host"`, and `data-testid="persona-pill-admin"`.
   - Confirm `getNavLinks(role)` yields only Driver links for Driver, Host links for Host, and Admin links for Admin.
3. **Invalidation Conditions**:
   - If a persona pill fails to switch, inspect `POST /api/auth` response in Network tab or Vitest mock.
   - If an unauthenticated session causes a crash, verify `activeRole` defaults safely to `"driver"`.
