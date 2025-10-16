import * as Sentry from '@sentry/nextjs';

// Initialize Sentry
export function initSentry() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    console.warn('Sentry DSN not configured');
    return;
  }

  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Before send filter
    beforeSend(event, hint) {
      // Filter out certain errors
      if (event.exception) {
        const exception = event.exception.values?.[0];
        if (exception?.type === 'ChunkLoadError') {
          return null; // Ignore chunk load errors
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
}

// Set correlation ID for current scope
export function setCorrelationId(requestId: string) {
  Sentry.setTag('request_id', requestId);
  Sentry.setTag('correlation_id', requestId);
  
  // Add breadcrumb for correlation tracking
  Sentry.addBreadcrumb({
    message: `Request started with ID: ${requestId}`,
    category: 'correlation',
    data: { request_id: requestId },
    level: 'info',
  });
}

// Get Grafana dashboard URL for a specific request ID
export function getGrafanaDashboardUrl(requestId: string, timeRange: string = '1h') {
  const grafanaUrl = process.env.GRAFANA_CLOUD_URL || process.env.GRAFANA_URL || 'https://your-cloud-grafana-url.com';
  const dashboardUid = process.env.GRAFANA_DASHBOARD_UID || 'your-dashboard-uid';
  
  return `${grafanaUrl}/d/${dashboardUid}?orgId=1&var-request_id=${requestId}&from=now-${timeRange}&to=now`;
}

// Capture API errors with context
export function captureApiError(error: Error, context?: Record<string, any>) {
  const requestId = context?.requestId;
  
  Sentry.captureException(error, {
    tags: { 
      type: 'api_error',
      ...(requestId && { request_id: requestId, correlation_id: requestId })
    },
    extra: {
      ...context,
      ...(requestId && { grafana_url: getGrafanaDashboardUrl(requestId) })
    },
  });
}

// Capture frontend errors with context
export function captureClientError(error: Error, context?: Record<string, any>) {
  const requestId = context?.requestId;
  
  Sentry.captureException(error, {
    tags: { 
      type: 'client_error',
      ...(requestId && { request_id: requestId, correlation_id: requestId })
    },
    extra: {
      ...context,
      ...(requestId && { grafana_url: getGrafanaDashboardUrl(requestId) })
    },
  });
}

// Set user context
export function setUserContext(user: { id: string; email?: string; name?: string }) {
  Sentry.setUser(user);
}

// Add breadcrumb for debugging
export function addBreadcrumb(message: string, category: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
}

export { Sentry }; 