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
