'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { KindeUser } from '@/auth/kinde';

export function useSentryUser(user: KindeUser | null) {
  useEffect(() => {
    if (user) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
        username: user.given_name && user.family_name 
          ? `${user.given_name} ${user.family_name}` 
          : user.email,
        // Add additional user context
        ip_address: '{{auto}}',
      });

      // Add user context as tags
      Sentry.setTag('user.id', user.id);
      Sentry.setTag('user.email', user.email);
      if (user.given_name) Sentry.setTag('user.first_name', user.given_name);
      if (user.family_name) Sentry.setTag('user.last_name', user.family_name);
    } else {
      Sentry.setUser(null);
    }
  }, [user]);
} 