'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useKindeUser, UseKindeUserReturn } from './useKindeUser';
import { KindeUser } from './kinde';

// Extend the user context with additional business logic
interface UserContextValue extends UseKindeUserReturn {
  // Add business-specific user properties
  displayName: string;
  isPremium: boolean;
  canAccessAdmin: boolean;
  refreshSession: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | null>(null);

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const kindeUser = useKindeUser();

  // Business logic for user properties
  const displayName = kindeUser.user 
    ? kindeUser.user.given_name && kindeUser.user.family_name
      ? `${kindeUser.user.given_name} ${kindeUser.user.family_name}`
      : kindeUser.user.email
    : 'Guest';

  const isPremium = kindeUser.user?.email?.includes('premium') || false; // Mock premium logic
  const canAccessAdmin = kindeUser.user?.email?.includes('admin') || false; // Mock admin logic

  const value: UserContextValue = {
    ...kindeUser,
    displayName,
    isPremium,
    canAccessAdmin,
    refreshSession: kindeUser.refreshSession,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextValue {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

// Utility hook for components that only need basic user info
export function useUserInfo() {
  const { user, isAuthenticated, isLoading, displayName, refreshSession } = useUser();
  return { user, isAuthenticated, isLoading, displayName, refreshSession };
}

// Utility hook for components that need authentication
export function useRequireAuth() {
  const { user, isAuthenticated, isLoading, login } = useUser();
  
  if (!isLoading && !isAuthenticated) {
    // Redirect to login or show login modal
    login();
  }
  
  return { user, isAuthenticated, isLoading };
} 