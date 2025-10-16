import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

// Enable default metrics (CPU, memory, etc.)
collectDefaultMetrics({ register });

// Custom metrics
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

export const httpRequestErrors = new Counter({
  name: 'http_request_errors_total',
  help: 'Total number of HTTP request errors',
  labelNames: ['method', 'route', 'error_type']
});

export const activeConnections = new Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

export const databaseQueryDuration = new Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

export const cacheHitRatio = new Gauge({
  name: 'cache_hit_ratio',
  help: 'Cache hit ratio (0-1)'
});

// Middleware to collect metrics
export function metricsMiddleware(req: any, res: any, next: any) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const { method, path } = req;
    const statusCode = res.statusCode;
    
    httpRequestDuration
      .labels(method, path, statusCode.toString())
      .observe(duration);
    
    httpRequestTotal
      .labels(method, path, statusCode.toString())
      .inc();
    
    if (statusCode >= 400) {
      httpRequestErrors
        .labels(method, path, statusCode >= 500 ? 'server_error' : 'client_error')
        .inc();
    }
  });
  
  next();
}

// Get metrics as text
export async function getMetrics() {
  return await register.metrics();
}

// Reset metrics (useful for testing)
export function resetMetrics() {
  register.clear();
}

export { register }; 