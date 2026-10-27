"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { PlatformConfig, User, UserRole } from "@/lib/types";
import { toast } from "sonner";
import { notifyDataChanged } from "@/lib/sync";

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
      notifyDataChanged("auth");
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
      notifyDataChanged("auth");
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
      notifyDataChanged("auth");
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
    notifyDataChanged("auth");
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
      notifyDataChanged("auth");
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
