'use client';
import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function ClientLogForwarder({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === 'undefined' || process.env.NODE_ENV !== 'production') return;
    const originalConsoleError = window.console.error;
    window.console.error = function (...args) {
      Sentry.captureMessage(args.map(String).join(' '), 'error');
      originalConsoleError.apply(window.console, args);
    };
    const unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
      Sentry.captureException(event.reason);
    };
    window.addEventListener('unhandledrejection', unhandledRejectionHandler);
    return () => {
      window.console.error = originalConsoleError;
      window.removeEventListener('unhandledrejection', unhandledRejectionHandler);
    };
  }, []);
  return <>{children}</>;
} 