"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, DEMO_PERSONAS, DemoPersonaConfig } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
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
import { LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_LABEL: Record<string, string> = {
  driver: "Driver",
  host: "Host",
  admin: "Admin",
  user: "Driver",
};

// Each role only ever sees its own links
function getNavLinks(role: string) {
  switch (role) {
    case "host":
      return [
        { href: "/dashboard/host", label: "Dashboard" },
        { href: "/host/new", label: "List a space" },
      ];
    case "admin":
      return [{ href: "/admin", label: "Moderation" }];
    default:
      return [
        { href: "/find", label: "Find parking" },
        { href: "/dashboard/driver", label: "My trips" },
      ];
  }
}

const DRIVER_PAGES = ["/find", "/listings", "/dashboard/driver"];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    currentUser,
    authModalOpen,
    setAuthModalOpen,
    switchUser,
    login,
    register,
    logout,
    activeRole,
  } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [loginEmail, setLoginEmail] = useState("aarav@demo.parkorbit.in");
  const [loginPassword, setLoginPassword] = useState("demo123");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("+91 98450 99000");
  const [regPassword, setRegPassword] = useState("");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setMobileMenuOpen(false), [pathname]);

  const navLinks = getNavLinks(activeRole);
  const brandRootHref =
    activeRole === "host" ? "/dashboard/host" : activeRole === "admin" ? "/admin" : "/";

  const handlePersonaClick = async (persona: DemoPersonaConfig) => {
    if (currentUser?.id === persona.id) return;
    const switched = await switchUser(persona.id);
    if (!switched) return;

    if (persona.role === "driver") {
      // A driver can stay on any driver page; otherwise land on the map
      if (pathname !== "/" && !DRIVER_PAGES.some((p) => pathname.startsWith(p))) {
        router.push("/find");
      }
    } else {
      router.push(persona.targetPath);
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
      password: regPassword,
    });
  };

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <header className="sticky top-4 md:top-6 z-40 mx-auto w-full max-w-[1200px] px-4 md:px-8">
        <nav
          aria-label="Primary Navigation"
          className={cn(
            "flex items-center justify-between gap-4 rounded-pill px-3 py-2 md:pl-6 md:pr-2.5 transition-all duration-300",
            scrolled
              ? "bg-white/90 backdrop-blur-md shadow-nav"
              : "bg-white shadow-nav"
          )}
        >
          <Link
            href={brandRootHref}
            className="flex items-center gap-2.5 shrink-0 pl-1 md:pl-0"
            data-testid="navbar-brand-link"
          >
            <img
              src="/logo.png"
              alt="ParkOrbit Logo"
              width={26}
              height={32}
              className="h-8 w-auto object-contain select-none"
            />
            <span className="text-[19px] font-medium tracking-[-0.03em] text-ink">
              ParkOrbit
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-[15px] font-medium tracking-[-0.02em] px-4 py-2 rounded-pill transition-colors",
                  isActive(link.href)
                    ? "bg-canvas text-ink"
                    : "text-ink/70 hover:text-ink"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {currentUser ? (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                data-testid="nav-account-trigger"
                className="flex items-center gap-2.5 rounded-pill hover:bg-canvas pl-1 pr-1 md:pr-4 py-1 transition-colors"
              >
                <Avatar className="size-9">
                  <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                  <AvatarFallback>{currentUser.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="hidden md:flex flex-col items-start leading-tight">
                  <span className="text-[14px] font-medium text-ink">
                    {currentUser.name.split(" ")[0]}
                  </span>
                  <span className="text-[12px] text-slate">
                    {ROLE_LABEL[currentUser.role]}
                  </span>
                </span>
              </button>
            ) : (
              <Button
                size="sm"
                onClick={() => setAuthModalOpen(true)}
                data-testid="nav-signin-button"
              >
                Sign in
              </Button>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
              className="md:hidden size-11 rounded-full text-ink hover:bg-canvas inline-flex items-center justify-center"
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </nav>

        {mobileMenuOpen && (
          <div className="md:hidden mt-2 rounded-stadium bg-white p-4 shadow-halo flex flex-col animate-in fade-in slide-in-from-top-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[18px] font-medium tracking-[-0.02em] text-ink px-4 py-3 rounded-cta hover:bg-canvas"
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </header>

      {/* Demo persona dock: lets a presenter jump between roles without cluttering the nav */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 md:left-6 md:translate-x-0 z-50">
        <div
          data-testid="nav-persona-switcher"
          aria-label="Demo Persona Switcher"
          className="flex items-center gap-1 rounded-pill bg-ink/95 backdrop-blur-md p-1.5 pl-4 shadow-halo"
        >
          <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-taupe mr-1.5">
            Demo as
          </span>
          {DEMO_PERSONAS.map((persona) => {
            const active = currentUser?.id === persona.id;
            return (
              <button
                key={persona.id}
                type="button"
                data-testid={`persona-pill-${persona.role}`}
                aria-pressed={active}
                onClick={() => handlePersonaClick(persona)}
                title={`Switch to ${persona.fullName}`}
                className={cn(
                  "rounded-pill px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                  active
                    ? "bg-canvas text-ink"
                    : "text-canvas/70 hover:text-canvas hover:bg-white/10"
                )}
              >
                {persona.shortLabel}
              </button>
            );
          })}
        </div>
      </div>

      <Dialog open={authModalOpen} onOpenChange={setAuthModalOpen}>
        <DialogContent className="max-w-md">
          {currentUser ? (
            <>
              <DialogHeader>
                <DialogTitle>Your account</DialogTitle>
                <DialogDescription>
                  Signed in as {ROLE_LABEL[currentUser.role].toLowerCase()}.
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center gap-4 rounded-stadium bg-canvas p-5 mt-2">
                <Avatar className="size-14">
                  <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                  <AvatarFallback>{currentUser.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="text-[18px] font-medium text-ink truncate">
                    {currentUser.name}
                  </div>
                  <div className="text-[14px] text-slate truncate">{currentUser.email}</div>
                  {currentUser.defaultVehiclePlate && (
                    <div className="text-[13px] text-granite mt-0.5">
                      {currentUser.defaultVehiclePlate}
                    </div>
                  )}
                </div>
              </div>
              <Button
                variant="secondary"
                className="mt-2"
                onClick={async () => {
                  await logout();
                  setAuthModalOpen(false);
                  router.push("/");
                  router.refresh();
                }}
              >
                <LogOut />
                Sign out
              </Button>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Welcome to ParkOrbit</DialogTitle>
                <DialogDescription>
                  Sign in, or use the demo dock at the bottom of the screen.
                </DialogDescription>
              </DialogHeader>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="w-full bg-canvas">
                  <TabsTrigger value="login" className="flex-1">Sign in</TabsTrigger>
                  <TabsTrigger value="register" className="flex-1">Create account</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={handleLoginSubmit} className="flex flex-col gap-5">
                    <FieldGroup>
                      <Field>
                        <FieldLabel htmlFor="login-email">Email</FieldLabel>
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
                          Demo password: <code>demo123</code>
                        </FieldDescription>
                      </Field>
                    </FieldGroup>
                    <Button type="submit" className="w-full">
                      Sign in
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register">
                  <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-5">
                    <FieldGroup>
                      <Field>
                        <FieldLabel htmlFor="reg-name">Full name</FieldLabel>
                        <Input
                          id="reg-name"
                          placeholder="Ananya Deshpande"
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          required
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="reg-email">Email</FieldLabel>
                        <Input
                          id="reg-email"
                          type="email"
                          placeholder="ananya@example.com"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          required
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="reg-phone">Mobile</FieldLabel>
                        <Input
                          id="reg-phone"
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          required
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="reg-password">Password</FieldLabel>
                        <Input
                          id="reg-password"
                          type="password"
                          minLength={6}
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          required
                        />
                      </Field>
                    </FieldGroup>
                    <Button type="submit" className="w-full" data-testid="register-submit-btn">
                      Create account
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
