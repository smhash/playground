import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  
  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
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
    // Attach correlation ID from request headers if available
    if (hint && typeof (hint as any).request === 'object' && (hint as any).request.headers) {
      const req = (hint as any).request;
      const correlationId = req.headers['x-request-id'] || req.headers['X-Request-Id'];
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