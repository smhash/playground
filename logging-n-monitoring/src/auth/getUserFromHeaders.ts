import { NextRequest } from 'next/server';
import { getCurrentUser, KindeUser } from './kinde';

export async function getUserFromHeaders(req: NextRequest): Promise<KindeUser | null> {
  try {
    // First, try to extract user from Authorization header (Bearer token)
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      // In production, validate the token with Kinde's API
      // For now, we'll use the mock implementation
      // TODO: Implement proper token validation
      console.log('Validating Bearer token:', token);
      
      // For mock implementation, assume valid token and get current user
      const user = await getCurrentUser();
      if (user) {
        return user;
      }
    }

    // Fallback: Extract user information from custom headers
    const userId = req.headers.get('x-user-id');
    const userEmail = req.headers.get('x-user-email');
    const userFirstName = req.headers.get('x-user-first-name');
    const userLastName = req.headers.get('x-user-last-name');

    // If we have user headers, construct the user object
    if (userId && userEmail) {
      const user: KindeUser = {
        id: userId,
        email: userEmail,
        given_name: userFirstName || undefined,
        family_name: userLastName || undefined,
        sub: userId,
        updated_at: new Date().toISOString()
      };
      return user;
    }

    // Final fallback to server-side user resolution (for backward compatibility)
    const user = await getCurrentUser();
    return user;
  } catch (error) {
    console.error('Failed to get user from headers:', error);
    return null;
  }
}

// Legacy function for backward compatibility (deprecated)
export function getUserFromHeadersSync(req: NextRequest) {
  console.warn('getUserFromHeadersSync is deprecated. Use getUserFromHeaders instead.');
  const userId = req.headers.get('x-mock-user-id');
  if (!userId) return undefined;
  return {
    id: userId,
    email: req.headers.get('x-mock-user-email') || undefined,
    name: req.headers.get('x-mock-user-name') || undefined,
  };
} 