// Core Kinde service and types
export { 
  kindeService, 
  getCurrentUser, 
  getCurrentSession, 
  isUserAuthenticated,
  createKindeService 
} from './kinde';
export type { KindeUser, KindeSession, KindeService } from './kinde';

// React hooks
export { useKindeUser } from './useKindeUser';
export type { UseKindeUserReturn } from './useKindeUser';

// User context provider
export { UserProvider, useUser, useUserInfo, useRequireAuth } from './UserProvider';

// Server-side utilities
export { getUserFromHeaders, getUserFromHeadersSync } from './getUserFromHeaders'; 