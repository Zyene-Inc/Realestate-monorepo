"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, setAccessToken } from '@/lib/api';

interface AuthContextType {
  user: any;
  token: string | null;
  login: (token: string, user: any) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const refreshAuth = async () => {
      try {
        // Try to refresh the token using the httpOnly cookie
        const data = await api.post('/auth/refresh', {});
        if (data.accessToken) {
          setToken(data.accessToken);
          setAccessToken(data.accessToken);
          
          // For now, we'll assume the refresh endpoint returns the user object 
          // or we fetch it immediately after refresh.
          if (data.user) {
            setUser(data.user);
          }
        }
      } catch (error) {
        console.log('No active session found.');
      } finally {
        setIsLoading(false);
      }
    };

    refreshAuth();
  }, []);

  const login = (newToken: string, newUser: any) => {
    setToken(newToken);
    setAccessToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout', {});
    } catch (e) {
      console.error('Logout error', e);
    } finally {
      setToken(null);
      setAccessToken(null);
      setUser(null);
      router.push('/');
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
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
