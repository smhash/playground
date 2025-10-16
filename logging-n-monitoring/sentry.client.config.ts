import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  
  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Session replay
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,
  replaysOnErrorSampleRate: 1.0,
  
  // Before send filter
  beforeSend(event, hint) {
    // Filter out certain errors
    if (event.exception) {
      const exception = event.exception.values?.[0];
      if (exception?.type === 'ChunkLoadError') {
        return null; // Ignore chunk load errors
      }
    }
    // Attach correlation ID from localStorage if available
    if (typeof window !== 'undefined') {
      const correlationId = localStorage.getItem('correlation_id');
      if (correlationId) {
        event.tags = { ...event.tags, request_id: correlationId };
      }
    }
    return event;
  },
  
  // Before send transaction filter
  beforeSendTransaction(event) {
    // Filter out health check endpoints
    if (event.transaction === '/api/health') {
      return null;
    }
    return event;
  },
}); 