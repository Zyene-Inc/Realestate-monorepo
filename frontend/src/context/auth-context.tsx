"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
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

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (
    email: string,
    password: string,
    portal: "admin" | "agent" | "tenant",
  ) => Promise<AuthUser>;
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

  const login = useCallback(async (
    email: string,
    password: string,
    portal: "admin" | "agent" | "tenant",
  ) => {
    try {
      const authentication = (await api.post("/auth/login", {
        email,
        password,
        portal,
      })) as LoginResponse;
      const { data, error } = await supabase.auth.setSession({
        access_token: authentication.accessToken,
        refresh_token: authentication.refreshToken,
      });
      if (error || !data.session) throw error;

      setToken(data.session.access_token);
      setAccessToken(data.session.access_token);
      const appUser = (await api.get("/auth/me")) as AuthUser;
      setUser(appUser);
      return appUser;
    } catch {
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
      setToken(null);
      setAccessToken(null);
      setUser(null);
      throw new Error("Incorrect email or password");
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setToken(null);
      setAccessToken(null);
      setUser(null);
      router.push("/");
    }
  }, [router]);

  const contextValue = useMemo(() => ({ user, token, login, logout, isLoading }), [isLoading, login, logout, token, user]);

  return (
    <AuthContext.Provider value={contextValue}>
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
