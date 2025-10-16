import { KindeUser, KindeSession } from '@/auth/kinde';

export function getCorrelationId() {
  if (typeof window === 'undefined') return undefined;
  let id = localStorage.getItem('correlation_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('correlation_id', id);
  }
  return id;
}

export function setCorrelationId(id: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('correlation_id', id);
}

export function clearCorrelationId() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('correlation_id');
}

export async function fetchWithCorrelation(
  input: RequestInfo, 
  init: RequestInit = {}, 
  user?: KindeUser | null,
  session?: KindeSession | null
) {
  const correlationId = getCorrelationId();
  const headers = new Headers(init.headers || {});
  
  // Don't set x-request-id here - let middleware generate unique request IDs
  // Only set correlation ID for session tracking
  
  // Add additional correlation headers for better tracing
  headers.set('x-correlation-id', correlationId || '');
  headers.set('x-client-timestamp', Date.now().toString());
  
  // Add user authentication headers if user is provided
  if (user) {
    // Proper authentication with Bearer token
    if (session?.access_token) {
      headers.set('Authorization', `Bearer ${session.access_token}`);
    }
    
    // Additional user context headers
    headers.set('x-user-id', user.id);
    headers.set('x-user-email', user.email);
    if (user.given_name) headers.set('x-user-first-name', user.given_name);
    if (user.family_name) headers.set('x-user-last-name', user.family_name);
  }
  
  return fetch(input, { ...init, headers });
}

// Enhanced fetch with automatic correlation ID generation for new requests
export async function fetchWithNewCorrelation(
  input: RequestInfo, 
  init: RequestInit = {}, 
  user?: KindeUser | null,
  session?: KindeSession | null
) {
  const newCorrelationId = crypto.randomUUID();
  setCorrelationId(newCorrelationId);
  
  const headers = new Headers(init.headers || {});
  headers.set('x-request-id', newCorrelationId);
  headers.set('x-correlation-id', newCorrelationId);
  headers.set('x-client-timestamp', Date.now().toString());
  
  // Add user authentication headers if user is provided
  if (user) {
    // Proper authentication with Bearer token
    if (session?.access_token) {
      headers.set('Authorization', `Bearer ${session.access_token}`);
    }
    
    // Additional user context headers
    headers.set('x-user-id', user.id);
    headers.set('x-user-email', user.email);
    if (user.given_name) headers.set('x-user-first-name', user.given_name);
    if (user.family_name) headers.set('x-user-last-name', user.family_name);
  }
  
  return fetch(input, { ...init, headers });
} 