import { httpRequestTotal, httpRequestDuration, httpRequestErrors } from '@/lib/metrics';
import logger from '@/lib/logger';
import { sendCritical } from '@/lib/alerts';
import { captureApiError, setCorrelationId } from '@/lib/sentry';
import * as Sentry from '@sentry/nextjs';
import { KindeUser } from '@/auth/kinde';

interface HandlerOptions {
  route: string;
  alertOnError?: boolean;
  logRequestBody?: boolean;
  logResponseBody?: boolean;
  customLabels?: Record<string, string>;
}

export function withMonitoring(
  handler: (req: any, ...args: any[]) => Promise<Response>,
  options: HandlerOptions
) {
  return async function (req: any, ...args: any[]) {
    const start = Date.now();
    let status = 200;
    let res: Response | undefined;
    let error: any = null;
    let responseBody: any = undefined;
    let requestBody: any = undefined;
    // Correlation/request ID
    const requestId = req.headers?.get?.('x-request-id') || req.headers?.get?.('X-Request-Id') || undefined;
    if (requestId) {
      setCorrelationId(requestId);
    }
    // User context (if available)
    if (req.user) {
      const user = req.user as KindeUser;
      Sentry.setUser({ 
        id: user.id, 
        email: user.email,
        username: user.given_name && user.family_name 
          ? `${user.given_name} ${user.family_name}` 
          : user.email
      });
    }
    try {
      if (options.logRequestBody && typeof req.json === 'function') {
        requestBody = await req.json();
      }
      res = await handler(req, ...args);
      status = res.status || 200;
      if (
        options.logResponseBody &&
        typeof res?.clone === 'function' &&
        typeof res?.json === 'function'
      ) {
        try {
          responseBody = await res.clone().json();
        } catch {}
      }
      return res;
    } catch (err: any) {
      status = 500;
      error = err;
      // Alerting for critical errors
      if (options.alertOnError) {
        sendCritical(
          `API Error: ${options.route}`,
          err?.message || 'Unknown error',
          {
            method: req.method,
            route: options.route,
            error: err,
            requestId,
            body: requestBody,
          }
        );
      }
      // Sentry capture
      captureApiError(err, {
        method: req.method,
        route: options.route,
        requestId,
        body: requestBody,
      });
      // Return generic error
      return new Response('Internal Server Error', { status: 500 });
    } finally {
      const duration = (Date.now() - start) / 1000;
      const labels = {
        method: req.method,
        route: options.route,
        status_code: String(status),
        request_id: requestId || '',
        ...options.customLabels,
      };
      httpRequestTotal.labels(labels.method, labels.route, labels.status_code).inc();
      httpRequestDuration.labels(labels.method, labels.route, labels.status_code).observe(duration);
      if (status >= 400) {
        httpRequestErrors.labels(labels.method, labels.route, status >= 500 ? 'server_error' : 'client_error').inc();
      }
      // Logging
      logger.log(
        status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info',
        `${options.route} ${req.method} ${status} ${duration.toFixed(3)}s`,
        {
          status,
          method: req.method,
          route: options.route,
          requestId,
          duration,
          error: error ? (error.stack || error.message || error) : undefined,
          requestBody,
          responseBody,
        }
      );
    }
  };
} 