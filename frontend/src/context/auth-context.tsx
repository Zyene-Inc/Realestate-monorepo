"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, setAccessToken } from "@/lib/api";
import { supabase } from "@/lib/supabase";

interface AgentProfile {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string | null;
  accountStatus: "PENDING" | "APPROVED" | "DECLINED" | "SUSPENDED";
  declineReason: string | null;
}

interface TenantProfile {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  vehicleInfo: string | null;
  petInfo: string | null;
  unitId: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
  role: "SUPER_ADMIN" | "SALES_ADMIN" | "TENANT_ADMIN" | "AGENT" | "TENANT";
  status: "INVITED" | "ACTIVE" | "DISABLED";
  agentProfile: AgentProfile | null;
  tenantProfile: TenantProfile | null;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const restoreAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          setToken(session.access_token);
          setAccessToken(session.access_token);
          setUser((await api.get("/auth/me")) as AuthUser);
        }
      } catch {
        setToken(null);
        setAccessToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    restoreAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.session)
      throw error || new Error("Unable to start a session");

    setToken(data.session.access_token);
    setAccessToken(data.session.access_token);
    const appUser = (await api.get("/auth/me")) as AuthUser;
    setUser(appUser);
    return appUser;
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setToken(null);
      setAccessToken(null);
      setUser(null);
      router.push("/");
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
