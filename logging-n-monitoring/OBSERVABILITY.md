# 🔍 Observability & Monitoring System

A comprehensive observability solution for Next.js applications featuring error tracking, performance monitoring, structured logging, and multi-channel alerting.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   External      │
│   (Browser)     │    │   (Node.js)     │    │   Services      │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • Sentry Client │    │ • Winston       │    │ • Sentry        │
│ • Error Boundary│    │ • Prometheus    │    │ • Grafana Cloud │
│ • Correlation   │    │ • Alerting      │    │ • Slack/Teams   │
│ • User Context  │    │ • Metrics       │    │ • Email         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📊 System Components

### **1. Error Tracking & Performance Monitoring**
- **Sentry Integration**: Full-stack error tracking with performance monitoring
- **Error Boundaries**: React error boundaries for graceful error handling
- **User Context**: User identification and session tracking
- **Performance Data**: Transaction monitoring and performance metrics

### **2. Structured Logging**
- **Winston Logger**: Production-ready logging with structured output
- **Correlation IDs**: Request tracing across frontend and backend
- **Log Levels**: Configurable logging levels (debug, info, warn, error)
- **Context Enrichment**: Automatic request context and user information

### **3. Metrics Collection**
- **Prometheus Metrics**: HTTP request metrics, system metrics, custom business metrics
- **Real-time Monitoring**: Live metrics endpoint at `/api/metrics`
- **Custom Metrics**: Database queries, cache performance, business KPIs
- **Correlation Tagging**: All metrics tagged with correlation IDs

### **4. Alerting System**
- **Multi-channel Alerts**: Slack, Teams, Email notifications
- **Configurable Levels**: Info, warning, error, critical alert levels
- **Sentry Integration**: Automatic error-based alerting
- **Business Alerts**: Custom business metric alerts

## 🚀 Implementation Details

### **Frontend Observability**

#### **Client Log Forwarder** (`src/components/ClientLogForwarder.tsx`)
```typescript
// Automatically forwards console.error and unhandled rejections to Sentry
export default function ClientLogForwarder({ children }) {
  useEffect(() => {
    // Override console.error to capture in Sentry
    const originalConsoleError = window.console.error;
    window.console.error = function (...args) {
      Sentry.captureMessage(args.map(String).join(' '), 'error');
      originalConsoleError.apply(window.console, args);
    };
    
    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      Sentry.captureException(event.reason);
    });
  }, []);
}
```

#### **Error Boundaries** (`src/components/ErrorBoundary.tsx`)
```typescript
// Graceful error handling with fallback UI
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    captureClientError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true
    });
  }
}
```

#### **Correlation ID System** (`src/lib/fetchWithCorrelation.ts`)
```typescript
// Automatic correlation ID propagation
export async function fetchWithCorrelation(input: RequestInfo, init: RequestInit = {}) {
  const correlationId = getCorrelationId();
  const headers = new Headers(init.headers || {});
  
  if (correlationId) {
    headers.set('x-request-id', correlationId);
    headers.set('x-correlation-id', correlationId);
  }
  
  return fetch(input, { ...init, headers });
}
```

**Correlation ID Functions:**
- `getCorrelationId()` - Gets existing or creates new correlation ID
- `setCorrelationId(id)` - Sets correlation ID in localStorage
- `fetchWithCorrelation()` - Enhanced fetch with correlation headers
- `fetchWithNewCorrelation()` - Creates new correlation ID for fresh requests

### **Backend Observability**

#### **API Route Monitoring** (`src/lib/withMonitoring.ts`)
```typescript
// Automatic monitoring wrapper for API routes
export function withMonitoring(handler, options) {
  return async function (req, ...args) {
    const start = Date.now();
    const requestId = req.headers?.get?.('x-request-id');
    
    if (requestId) {
      setCorrelationId(requestId);
    }
    
    try {
      const res = await handler(req, ...args);
      // Record metrics and logs
      return res;
    } catch (err) {
      // Capture error in Sentry and send alerts
      captureApiError(err, { requestId, route: options.route });
      return new Response('Internal Server Error', { status: 500 });
    }
  };
}
```

**Correlation ID Features:**
- Extracts correlation ID from request headers
- Sets correlation ID in Sentry scope
- Tags all metrics with correlation ID
- Includes correlation ID in all logs

#### **Structured Logging** (`src/lib/logger.ts`)
```typescript
// Winston logger with Sentry integration
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat
    })
  ]
});

// Global error handlers
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', { error: error.message, stack: error.stack });
  Sentry.captureException(error);
  process.exit(1);
});
```

#### **Metrics Collection** (`src/lib/metrics.ts`)
```typescript
// Prometheus metrics with correlation ID tagging
export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'request_id']
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code', 'request_id'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});
```

### **Alerting System** (`src/lib/alerts.ts`)

#### **Multi-channel Alerting with Advanced Features**
```typescript
// Alert manager with multiple channels, rate limiting, and retry logic
class AlertManager {
  private channels: AlertChannel[] = [];
  private deduplicator = new AlertDeduplicator();
  
  constructor() {
    // Initialize channels with validation
    if (process.env.SLACK_WEBHOOK_URL) {
      this.channels.push(new SlackAlertChannel(process.env.SLACK_WEBHOOK_URL));
    }
    if (process.env.TEAMS_WEBHOOK_URL) {
      this.channels.push(new TeamsAlertChannel(process.env.TEAMS_WEBHOOK_URL));
    }
    if (process.env.ALERT_EMAIL_RECIPIENTS) {
      this.channels.push(new EmailAlertChannel(process.env.ALERT_EMAIL_RECIPIENTS.split(',')));
    }
  }
  
  async sendAlert(alert: AlertConfig): Promise<void> {
    // Check deduplication and rate limiting
    const dedupKey = alert.deduplicationKey || `${alert.level}:${alert.title}`;
    if (!this.deduplicator.shouldSend(dedupKey)) {
      return; // Alert deduplicated
    }
    
    // Log alert locally
    logger.log(alert.level, `ALERT: ${alert.title}`, alert);
    
    // Send to Sentry for critical errors
    if (alert.level === 'critical' || alert.level === 'error') {
      Sentry.captureMessage(alert.title, {
        level: alert.level === 'critical' ? 'fatal' : 'error',
        extra: { message: alert.message, context: alert.context }
      });
    }
    
    // Send to all configured channels
    await Promise.allSettled(this.channels.map(channel => channel.send(alert)));
  }
}
```

## 🔧 Configuration

### **Correlation ID Setup**

#### **Environment Variables**
```bash
# Grafana Configuration (for dashboard linking)
GRAFANA_URL=https://your-grafana-instance.com
GRAFANA_DASHBOARD_UID=your-dashboard-uid

# Sentry Configuration (already configured)
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
```

#### **Grafana Dashboard Setup**

1. **Create Dashboard**:
   - Go to Grafana → Dashboards → New Dashboard
   - Add a `request_id` variable as a textbox input
   - Create panels for request metrics

2. **Configure Variables**:
   - Variable name: `request_id`
   - Type: Text box
   - Default value: (leave empty)
   - Description: "Filter by request ID"

3. **Add Panels**:
   - Request rate: `rate(http_requests_total{request_id="$request_id"}[5m])`
   - Response time: `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{request_id="$request_id"}[5m]))`
   - Error rate: `rate(http_request_errors_total{request_id="$request_id"}[5m])`

#### **Sentry Custom Links Setup**

1. **In Sentry UI**:
   - Go to Settings → Projects → Your Project → Custom Links
   - Add custom links using the configuration in `sentry-custom-links.json`

2. **Manual Setup**:
   ```
   Name: View in Grafana
   URL: https://your-grafana-instance.com/d/your-dashboard-uid?orgId=1&var-request_id={{request_id}}&from=now-1h&to=now
   Description: View request metrics in Grafana dashboard
   Tags: request_id, correlation_id
   ```

### **Environment Variables**

#### **Required Configuration**
```bash
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here
SENTRY_ENVIRONMENT=production
```

#### **Alerting Features**

**Advanced Alerting Capabilities:**
- **Rate Limiting**: Prevents alert spam (max 3 alerts per 5-minute window)
- **Deduplication**: Automatic deduplication of similar alerts
- **Retry Logic**: Exponential backoff retry (3 attempts) for failed deliveries
- **URL Validation**: Validates webhook URLs on initialization
- **Timeout Protection**: 10-second timeout for webhook calls
- **Rich Email Templates**: HTML email templates with context tables
- **Error Handling**: Graceful degradation when channels fail

#### **Alerting Configuration**
```bash
# Slack Integration
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your/webhook

# Microsoft Teams Integration
TEAMS_WEBHOOK_URL=https://your-org.webhook.office.com/webhookb2/your-webhook-url

# Email Alerts (SMTP)
ALERT_EMAIL_RECIPIENTS=admin@example.com,ops@example.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=alerts@yourcompany.com

# Logging Configuration
LOG_LEVEL=info
NODE_ENV=production
```

#### **Grafana Cloud Configuration**
```bash
# Grafana Cloud (for metrics persistence)
GRAFANA_URL=https://your-grafana-instance.com
GRAFANA_DASHBOARD_UID=your-dashboard-uid
```

### **Sentry Configuration**

#### **Client Configuration** (`sentry.client.config.ts`)
```typescript
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,
  replaysOnErrorSampleRate: 1.0,
  
  beforeSend(event, hint) {
    // Attach correlation ID from localStorage
    if (typeof window !== 'undefined') {
      const correlationId = localStorage.getItem('correlation_id');
      if (correlationId) {
        event.tags = { ...event.tags, request_id: correlationId };
      }
    }
    return event;
  }
});
```

#### **Server Configuration** (`sentry.server.config.ts`)
```typescript
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  beforeSend(event, hint) {
    // Attach correlation ID from request headers
    if (hint && hint.request && hint.request.headers) {
      const correlationId = hint.request.headers['x-request-id'];
      if (correlationId) {
        event.tags = { ...event.tags, request_id: correlationId };
      }
    }
    return event;
  }
});
```

## 📊 Available Metrics

### **HTTP Request Metrics**
```promql
# Request count by endpoint
http_requests_total{route="/api/products"}

# Response time percentiles
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Error rate
rate(http_request_errors_total[5m])
```

### **System Metrics**
```promql
# CPU usage
process_cpu_seconds_total

# Memory usage
process_resident_memory_bytes

# Process uptime
process_start_time_seconds
```

### **Custom Business Metrics**
```promql
# Database query performance
database_query_duration_seconds{operation="select",table="products"}

# Cache performance
cache_hit_ratio

# Active connections
active_connections
```

## 🚨 Alerting Rules

### **Error Rate Alerts**
```yaml
# High error rate alert
- alert: HighErrorRate
  expr: rate(http_request_errors_total[5m]) > 0.05
  for: 2m
  labels:
    severity: warning
  annotations:
    summary: "High error rate detected"
    description: "Error rate is {{ $value }} errors per second"
```

### **Response Time Alerts**
```yaml
# Slow response time alert
- alert: SlowResponseTime
  expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Slow response time detected"
    description: "95th percentile response time is {{ $value }}s"
```

### **System Health Alerts**
```yaml
# High memory usage alert
- alert: HighMemoryUsage
  expr: (process_resident_memory_bytes / 1024 / 1024) > 1000
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High memory usage detected"
    description: "Memory usage is {{ $value }} MB"
```

## 🔍 Monitoring Dashboards

### **Application Overview Dashboard**
- Request rate and response time
- Error rate and error distribution
- System resource usage
- User activity and session data

### **API Performance Dashboard**
- Endpoint-specific metrics
- Database query performance
- Cache hit ratios
- External service dependencies

### **Business Metrics Dashboard**
- User engagement metrics
- Conversion rates
- Revenue tracking
- Feature usage analytics

## 🛠️ Usage Examples

### **API Route Monitoring**
```typescript
import { withMonitoring } from '@/lib/withMonitoring';

export const GET = withMonitoring(async (req) => {
  // Your API logic here
  const products = await fetchProducts();
  return Response.json(products);
}, { 
  route: '/api/products',
  alertOnError: true,
  logRequestBody: false,
  logResponseBody: false
});
```

### **Custom Error Tracking**
```typescript
import { captureApiError } from '@/lib/sentry';

try {
  // Your business logic
} catch (error) {
  captureApiError(error, {
    context: 'product_fetch',
    userId: user.id,
    productId: productId
  });
}
```

### **Custom Metrics**
```typescript
import { httpRequestTotal, databaseQueryDuration } from '@/lib/metrics';

// Record custom business metric
httpRequestTotal.labels('POST', '/api/orders', '200').inc();

// Record database performance
const start = Date.now();
await database.query('SELECT * FROM products');
const duration = (Date.now() - start) / 1000;
databaseQueryDuration.labels('select', 'products').observe(duration);
```

### **Custom Alerts**
```typescript
import { sendCritical, sendWarning } from '@/lib/alerts';

// Send critical alert
await sendCritical(
  'Database Connection Failed',
  'Unable to connect to primary database',
  { database: 'primary', error: error.message }
);

// Send warning alert
await sendWarning(
  'High Memory Usage',
  'Memory usage is above 80%',
  { memoryUsage: '85%', threshold: '80%' }
);
```

## 🔍 Testing Correlation IDs

### **1. Check Frontend Propagation**
```javascript
// In browser console
localStorage.getItem('correlation_id'); // Should show correlation ID
```

### **2. Check Backend Logs**
```bash
# Check logs for correlation ID
tail -f logs/combined-*.log | grep "requestId"
```

### **3. Check Prometheus Metrics**
```bash
# Query metrics with correlation ID
curl "http://localhost:3001/api/metrics" | grep "request_id"
```

### **4. Test Sentry-Grafana Linking**
1. Trigger an error in your app
2. Go to Sentry → Issues → Find the error
3. Click "View in Grafana" custom link
4. Should open Grafana filtered by the request ID

### **5. Testing the Complete Flow**
1. **Frontend**: Visit a page and check localStorage
2. **API Call**: Make a request using `fetchWithCorrelation`
3. **Backend**: Check logs for correlation ID
4. **Metrics**: Verify correlation ID in `/api/metrics`
5. **Sentry**: Trigger an error and check correlation ID in event
6. **Grafana**: Use correlation ID to filter dashboard

## 🔧 Troubleshooting

### **Common Issues**

#### **Correlation IDs Not Propagating**
1. Check browser localStorage: `localStorage.getItem('correlation_id')`
2. Verify `fetchWithCorrelation` is used for all API calls
3. Check middleware is preserving correlation IDs
4. Verify Sentry configuration includes correlation ID tagging
5. Check that `withMonitoring` is wrapping your API routes

#### **Metrics Not Showing**
1. Check `/api/metrics` endpoint is accessible
2. Verify Prometheus is scraping the endpoint
3. Check metric labels are properly formatted
4. Verify correlation ID is included in metric labels
5. Check that `withMonitoring` is wrapping your API routes

#### **Alerts Not Sending**
1. Check environment variables are set correctly
2. Verify webhook URLs are valid and accessible
3. Check network connectivity to external services
4. Review alert manager logs for errors

#### **Sentry Integration Issues**
1. Verify DSN is correct and accessible
2. Check environment configuration
3. Verify beforeSend filters are working correctly
4. Check correlation ID attachment in Sentry events

#### **Sentry-Grafana Links Not Working**
1. Verify Grafana URL and dashboard UID in environment variables
2. Check Sentry custom links configuration
3. Ensure correlation ID is properly tagged in Sentry events

### **Debug Mode**
```bash
# Enable debug logging
LOG_LEVEL=debug npm run dev

# Check Sentry events
# Go to Sentry dashboard and verify events are being captured

# Test correlation ID flow
# Check browser console and server logs for correlation ID propagation
```

## 📚 Additional Resources

- [Sentry Documentation](https://docs.sentry.io/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Winston Documentation](https://github.com/winstonjs/winston)
- [Grafana Cloud](https://grafana.com/cloud)
- [Next.js Monitoring](https://nextjs.org/docs/advanced-features/measuring-performance)

## 🧑‍💻 User Session Management

- **Kinde Abstraction**: User/session state is managed via a KindeService interface, supporting both mock and real implementations.
- **Automatic Session Refresh**: Sessions are refreshed in the background and before expiry, ensuring seamless user experience.
- **401 Handling**: API calls that receive a 401 will attempt a silent session refresh and retry automatically.
- **React Context**: User/session state is provided via a React context and hooks, never leaking into business logic.
- **No Business Logic Leaks**: All session management is contained in the auth layer, not in business or UI code.

See `USER_SESSION.md` for deep details.

---

**This observability system provides comprehensive monitoring, error tracking, and alerting capabilities for production Next.js applications.** 