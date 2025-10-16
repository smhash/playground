'use client';

import { useState, useEffect } from 'react';
import { KindeUser, KindeSession, kindeService } from './kinde';

export interface UseKindeUserReturn {
  user: KindeUser | null;
  session: KindeSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
  login: (redirectTo?: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (redirectTo?: string) => Promise<void>;
  refresh: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

export function useKindeUser(): UseKindeUserReturn {
  const [user, setUser] = useState<KindeUser | null>(null);
  const [session, setSession] = useState<KindeSession | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadUser = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [userData, sessionData] = await Promise.all([
        kindeService.getUser(),
        kindeService.getSession()
      ]);

      setUser(userData);
      setSession(sessionData);
      const authenticated = !!userData && !!sessionData;
      setIsAuthenticated(authenticated);

      // Start auto-refresh if authenticated
      if (authenticated) {
        kindeService.startAutoRefresh();
      } else {
        kindeService.stopAutoRefresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load user'));
      setUser(null);
      setSession(null);
      setIsAuthenticated(false);
      kindeService.stopAutoRefresh();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (redirectTo?: string) => {
    try {
      setError(null);
      await kindeService.login(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Login failed'));
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await kindeService.logout();
      setUser(null);
      setSession(null);
      setIsAuthenticated(false);
      kindeService.stopAutoRefresh();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Logout failed'));
    }
  };

  const register = async (redirectTo?: string) => {
    try {
      setError(null);
      await kindeService.register(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Registration failed'));
    }
  };

  const refresh = async () => {
    await refreshSession();
  };

  const refreshSession = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const sessionData = await kindeService.refreshSession();
      setSession(sessionData);
      if (sessionData) {
        setUser(sessionData.user);
        setIsAuthenticated(true);
        // Restart auto-refresh with new session
        kindeService.startAutoRefresh();
      } else {
        setUser(null);
        setIsAuthenticated(false);
        kindeService.stopAutoRefresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Session refresh failed'));
      setUser(null);
      setSession(null);
      setIsAuthenticated(false);
      kindeService.stopAutoRefresh();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUser();

    // Cleanup auto-refresh on unmount
    return () => {
      kindeService.stopAutoRefresh();
    };
  }, []);

  return {
    user,
    session,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    register,
    refresh,
    refreshSession,
  };
} 