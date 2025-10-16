import { NextRequest } from 'next/server';

// Kinde user interface (following Kinde's actual interface)
export interface KindeUser {
  id: string;
  email: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  sub?: string;
  updated_at?: string;
}

// Kinde session interface
export interface KindeSession {
  user: KindeUser;
  access_token: string;
  refresh_token?: string;
  expires_at: number;
}

// Kinde service interface
export interface KindeService {
  getUser(): Promise<KindeUser | null>;
  getSession(): Promise<KindeSession | null>;
  isAuthenticated(): Promise<boolean>;
  logout(): Promise<void>;
  login(redirectTo?: string): Promise<void>;
  register(redirectTo?: string): Promise<void>;
  refreshSession(): Promise<KindeSession | null>;
  // New methods for automatic refresh
  startAutoRefresh(): void;
  stopAutoRefresh(): void;
  isSessionExpiringSoon(): Promise<boolean>;
}

// Session refresh configuration
const REFRESH_CONFIG = {
  // Refresh session when it expires in less than 5 minutes
  REFRESH_BEFORE_EXPIRY_MS: 5 * 60 * 1000,
  // Background refresh every 30 minutes
  BACKGROUND_REFRESH_INTERVAL_MS: 30 * 60 * 1000,
  // Max retry attempts for refresh
  MAX_REFRESH_RETRIES: 3,
  // Retry delay between attempts (exponential backoff)
  RETRY_DELAY_MS: 1000,
};

// Mock Kinde service implementation
class MockKindeService implements KindeService {
  private mockUser: KindeUser = {
    id: 'user-123',
    email: 'user123@example.com',
    given_name: 'Demo',
    family_name: 'User',
    picture: 'https://via.placeholder.com/150',
    sub: 'user-123',
    updated_at: new Date().toISOString()
  };

  private mockSession: KindeSession = {
    user: this.mockUser,
    access_token: 'mock-access-token-123',
    refresh_token: 'mock-refresh-token-123',
    expires_at: Date.now() + 3600000 // 1 hour from now
  };

  private refreshTimer: NodeJS.Timeout | null = null;
  private backgroundTimer: NodeJS.Timeout | null = null;
  private refreshRetryCount = 0;

  async getUser(): Promise<KindeUser | null> {
    // Check if session needs refresh before returning user
    if (await this.isSessionExpiringSoon()) {
      await this.refreshSession();
    }
    return this.mockUser;
  }

  async getSession(): Promise<KindeSession | null> {
    // Check if session needs refresh before returning session
    if (await this.isSessionExpiringSoon()) {
      await this.refreshSession();
    }
    return this.mockSession;
  }

  async isAuthenticated(): Promise<boolean> {
    const session = await this.getSession();
    if (!session) return false;
    return session.expires_at > Date.now();
  }

  async logout(): Promise<void> {
    this.stopAutoRefresh();
    console.log('Mock Kinde logout called');
  }

  async login(redirectTo?: string): Promise<void> {
    console.log('Mock Kinde login called', { redirectTo });
  }

  async register(redirectTo?: string): Promise<void> {
    console.log('Mock Kinde register called', { redirectTo });
  }

  async refreshSession(): Promise<KindeSession | null> {
    try {
      // Simulate silent refresh by extending expiry
      this.mockSession.expires_at = Date.now() + 3600000; // 1 hour from now
      this.mockSession.access_token = 'mock-access-token-' + Math.floor(Math.random() * 1000000);
      this.mockUser.updated_at = new Date().toISOString();
      this.refreshRetryCount = 0; // Reset retry count on success
      console.log('Mock Kinde session refreshed');
      return this.mockSession;
    } catch (error) {
      console.error('Mock session refresh failed:', error);
      return null;
    }
  }

  async isSessionExpiringSoon(): Promise<boolean> {
    const session = this.mockSession;
    if (!session) return false;
    
    const timeUntilExpiry = session.expires_at - Date.now();
    return timeUntilExpiry < REFRESH_CONFIG.REFRESH_BEFORE_EXPIRY_MS;
  }

  startAutoRefresh(): void {
    this.stopAutoRefresh(); // Clear any existing timers

    // Set up background refresh timer
    this.backgroundTimer = setInterval(async () => {
      try {
        const isExpiringSoon = await this.isSessionExpiringSoon();
        if (isExpiringSoon) {
          console.log('Background session refresh triggered');
          await this.refreshSession();
        }
      } catch (error) {
        console.error('Background refresh failed:', error);
      }
    }, REFRESH_CONFIG.BACKGROUND_REFRESH_INTERVAL_MS);

    // Set up refresh timer for when session is about to expire
    this.scheduleRefreshTimer();
  }

  stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    if (this.backgroundTimer) {
      clearInterval(this.backgroundTimer);
      this.backgroundTimer = null;
    }
  }

  private scheduleRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    const session = this.mockSession;
    if (!session) return;

    const timeUntilExpiry = session.expires_at - Date.now();
    const timeUntilRefresh = Math.max(0, timeUntilExpiry - REFRESH_CONFIG.REFRESH_BEFORE_EXPIRY_MS);

    this.refreshTimer = setTimeout(async () => {
      try {
        console.log('Scheduled session refresh triggered');
        await this.refreshSession();
        this.scheduleRefreshTimer(); // Schedule next refresh
      } catch (error) {
        console.error('Scheduled refresh failed:', error);
        // Retry with exponential backoff
        if (this.refreshRetryCount < REFRESH_CONFIG.MAX_REFRESH_RETRIES) {
          this.refreshRetryCount++;
          const retryDelay = REFRESH_CONFIG.RETRY_DELAY_MS * Math.pow(2, this.refreshRetryCount - 1);
          setTimeout(() => this.scheduleRefreshTimer(), retryDelay);
        }
      }
    }, timeUntilRefresh);
  }
}

// Production Kinde service implementation
class ProductionKindeService implements KindeService {
  private kindeClient: any; // Would be the actual Kinde client
  private refreshTimer: NodeJS.Timeout | null = null;
  private backgroundTimer: NodeJS.Timeout | null = null;
  private refreshRetryCount = 0;

  constructor() {
    // In production, initialize the actual Kinde client
    // this.kindeClient = new KindeClient({ ... });
  }

  async getUser(): Promise<KindeUser | null> {
    try {
      // Check if session needs refresh before returning user
      if (await this.isSessionExpiringSoon()) {
        await this.refreshSession();
      }
      throw new Error('Production Kinde service not implemented');
    } catch (error) {
      console.error('Failed to get user from Kinde:', error);
      return null;
    }
  }

  async getSession(): Promise<KindeSession | null> {
    try {
      // Check if session needs refresh before returning session
      if (await this.isSessionExpiringSoon()) {
        await this.refreshSession();
      }
      throw new Error('Production Kinde service not implemented');
    } catch (error) {
      console.error('Failed to get session from Kinde:', error);
      return null;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      const session = await this.getSession();
      return !!session && session.expires_at > Date.now();
    } catch (error) {
      console.error('Failed to check authentication:', error);
      return false;
    }
  }

  async logout(): Promise<void> {
    try {
      this.stopAutoRefresh();
      throw new Error('Production Kinde service not implemented');
    } catch (error) {
      console.error('Failed to logout from Kinde:', error);
    }
  }

  async login(redirectTo?: string): Promise<void> {
    try {
      throw new Error('Production Kinde service not implemented');
    } catch (error) {
      console.error('Failed to login with Kinde:', error);
    }
  }

  async register(redirectTo?: string): Promise<void> {
    try {
      throw new Error('Production Kinde service not implemented');
    } catch (error) {
      console.error('Failed to register with Kinde:', error);
    }
  }

  async refreshSession(): Promise<KindeSession | null> {
    try {
      // In production, this would call Kinde's silent refresh endpoint or use a refresh token
      // Example:
      // const newSession = await this.kindeClient.refreshSession();
      // this.refreshRetryCount = 0;
      // return newSession;
      throw new Error('Production Kinde session refresh not implemented');
    } catch (error) {
      console.error('Failed to refresh session with Kinde:', error);
      return null;
    }
  }

  async isSessionExpiringSoon(): Promise<boolean> {
    try {
      const session = await this.getSession();
      if (!session) return false;
      
      const timeUntilExpiry = session.expires_at - Date.now();
      return timeUntilExpiry < REFRESH_CONFIG.REFRESH_BEFORE_EXPIRY_MS;
    } catch (error) {
      console.error('Failed to check session expiry:', error);
      return false;
    }
  }

  startAutoRefresh(): void {
    this.stopAutoRefresh(); // Clear any existing timers

    // Set up background refresh timer
    this.backgroundTimer = setInterval(async () => {
      try {
        const isExpiringSoon = await this.isSessionExpiringSoon();
        if (isExpiringSoon) {
          console.log('Background session refresh triggered');
          await this.refreshSession();
        }
      } catch (error) {
        console.error('Background refresh failed:', error);
      }
    }, REFRESH_CONFIG.BACKGROUND_REFRESH_INTERVAL_MS);

    // Set up refresh timer for when session is about to expire
    this.scheduleRefreshTimer();
  }

  stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    if (this.backgroundTimer) {
      clearInterval(this.backgroundTimer);
      this.backgroundTimer = null;
    }
  }

  private scheduleRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    // In production, get the actual session
    this.getSession().then(session => {
      if (!session) return;

      const timeUntilExpiry = session.expires_at - Date.now();
      const timeUntilRefresh = Math.max(0, timeUntilExpiry - REFRESH_CONFIG.REFRESH_BEFORE_EXPIRY_MS);

      this.refreshTimer = setTimeout(async () => {
        try {
          console.log('Scheduled session refresh triggered');
          await this.refreshSession();
          this.scheduleRefreshTimer(); // Schedule next refresh
        } catch (error) {
          console.error('Scheduled refresh failed:', error);
          // Retry with exponential backoff
          if (this.refreshRetryCount < REFRESH_CONFIG.MAX_REFRESH_RETRIES) {
            this.refreshRetryCount++;
            const retryDelay = REFRESH_CONFIG.RETRY_DELAY_MS * Math.pow(2, this.refreshRetryCount - 1);
            setTimeout(() => this.scheduleRefreshTimer(), retryDelay);
          }
        }
      }, timeUntilRefresh);
    });
  }
}

// Factory function to create the appropriate service
export function createKindeService(): KindeService {
  if (process.env.NODE_ENV === 'production' && process.env.KINDE_CLIENT_ID) {
    return new ProductionKindeService();
  }
  return new MockKindeService();
}

// Singleton instance
export const kindeService = createKindeService();

// Utility functions for common operations
export async function getCurrentUser(): Promise<KindeUser | null> {
  return await kindeService.getUser();
}

export async function getCurrentSession(): Promise<KindeSession | null> {
  return await kindeService.getSession();
}

export async function isUserAuthenticated(): Promise<boolean> {
  return await kindeService.isAuthenticated();
}

export async function refreshUserSession(): Promise<KindeSession | null> {
  return await kindeService.refreshSession();
}

// Auto-refresh management
export function startAutoRefresh(): void {
  kindeService.startAutoRefresh();
}

export function stopAutoRefresh(): void {
  kindeService.stopAutoRefresh();
} 