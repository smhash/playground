# User Session Management

## Overview

This project uses a modern, production-grade user session management system designed for SaaS and e-commerce apps. It is built around a clean abstraction (`KindeService`) that supports both mock and real Kinde authentication, and exposes user/session state via React context and hooks. All session logic is contained in the auth layer, never leaking into business or UI code.

---

## Architecture

- **KindeService Abstraction**: All user/session logic is behind a single interface. You can swap between a mock implementation (for local/dev) and a real Kinde implementation (for production) without changing business logic.
- **React Context**: User/session state is provided to the app via a context provider (`UserProvider`) and hooks (`useUser`, `useUserInfo`, `useRequireAuth`).
- **No Business Logic Leaks**: All session management is contained in the auth layer, not in business or UI code.

---

## Features Implemented

- **Automatic Session Refresh**: Sessions are automatically refreshed in the background and before expiry (proactive refresh, background timer, exponential backoff on failure).
- **401 Handling**: API calls that receive a 401 will attempt a silent session refresh and retry automatically (`fetchWithAuth`, `fetchWithCorrelationAndAuth`).
- **Cleanup**: All timers are stopped on logout and component unmount.
- **Retry Logic**: Exponential backoff and retry for refresh failures.
- **Mock/Real Support**: Easily swap between mock and real Kinde implementations.
- **No Direct Token Access**: Business logic never touches tokens or session details.

---

## How to Use

### In Business Logic (Server)

```ts
import { getUserFromHeaders } from '@/auth';

export async function handler(req) {
  const user = await getUserFromHeaders(req);
  // ...
}
```

### In Business Logic (Client)

```ts
import { useUserInfo } from '@/auth';

function MyComponent() {
  const { user, isAuthenticated, refreshSession } = useUserInfo();
  // ...
}
```

### For API Calls

```ts
import { fetchWithAuth } from '@/lib/fetchWithAuth';

const response = await fetchWithAuth('/api/secure-data');
```

---

## Integrating with Real Kinde

- Implement the real Kinde logic in `ProductionKindeService` in `src/auth/kinde.ts`:
  - `getUser`, `getSession`, `refreshSession`, etc. should call the real Kinde SDK or API.
  - Use Kinde's refresh token or silent refresh endpoint for `refreshSession`.
  - Ensure session expiry and refresh logic matches your Kinde configuration.
- All other code will work without changes.

---

## SSR/Edge Considerations

- For SSR/edge, extract the session from cookies/headers and validate it server-side.
- You may want to add a utility to parse and validate Kinde tokens in API/middleware.
- The current implementation is client-centric but can be extended for SSR/edge easily.

---

## Security & Best Practices

- Never expose tokens or session details to business/UI code.
- Always use the context/hook for user/session state.
- Use secure cookies for session tokens in production.
- Handle refresh failures gracefully (logout, redirect, etc).
- Clean up timers/resources on logout/unmount.

---

## Testing & Extensibility

- The mock Kinde service makes it easy to test all flows locally.
- You can add roles/permissions, multi-tenant logic, or other business rules in the context/provider.
- The abstraction makes it easy to migrate to another auth provider if needed.

---

## Summary

This user session management system is:
- Clean, testable, and production-ready
- Matches best-in-class SaaS practices
- Easy to extend, secure, and maintain

**To go live, just implement the real Kinde logic in `ProductionKindeService`.** 