#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

console.log('🚀 Next.js Observability Framework Setup');
console.log('==========================================\n');

// Create readline interface for interactive prompts
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Utility function for prompts
function askQuestion(question, defaultValue = '') {
  return new Promise((resolve) => {
    const prompt = defaultValue ? `${question} (${defaultValue}): ` : `${question}: `;
    rl.question(prompt, (answer) => {
      resolve(answer || defaultValue);
    });
  });
}

// Validation functions
function validateUrl(url, name) {
  if (!url) return true; // Optional
  try {
    new URL(url);
    return true;
  } catch {
    console.log(`❌ Invalid ${name} URL format`);
    return false;
  }
}

function validateEmail(email) {
  if (!email) return true; // Optional
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateSentryDsn(dsn) {
  if (!dsn) return true; // Optional
  return dsn.startsWith('https://') && dsn.includes('@');
}

// Main setup function
async function runSetup() {
  try {
    console.log('📋 Configuration Setup\n');

    // Project configuration
    const projectName = await askQuestion('What is your project name?', 'my-nextjs-app');
    
    // Sentry configuration
    let sentryDsn = '';
    const useSentry = await askQuestion('Do you want to set up Sentry error tracking? (y/n)', 'y');
    if (useSentry.toLowerCase() === 'y') {
      sentryDsn = await askQuestion('Enter your Sentry DSN (or press Enter to skip)', '');
      while (sentryDsn && !validateSentryDsn(sentryDsn)) {
        sentryDsn = await askQuestion('Enter your Sentry DSN (or press Enter to skip)', '');
      }
    }

    // Alerting configuration
    let slackWebhook = '';
    const useSlack = await askQuestion('Do you want to set up Slack alerts? (y/n)', 'n');
    if (useSlack.toLowerCase() === 'y') {
      slackWebhook = await askQuestion('Enter your Slack webhook URL', '');
      while (slackWebhook && !validateUrl(slackWebhook, 'Slack webhook')) {
        slackWebhook = await askQuestion('Enter your Slack webhook URL', '');
      }
    }

    let teamsWebhook = '';
    const useTeams = await askQuestion('Do you want to set up Microsoft Teams alerts? (y/n)', 'n');
    if (useTeams.toLowerCase() === 'y') {
      teamsWebhook = await askQuestion('Enter your Teams webhook URL', '');
      while (teamsWebhook && !validateUrl(teamsWebhook, 'Teams webhook')) {
        teamsWebhook = await askQuestion('Enter your Teams webhook URL', '');
      }
    }

    let alertEmail = '';
    const useEmail = await askQuestion('Do you want to set up email alerts? (y/n)', 'n');
    if (useEmail.toLowerCase() === 'y') {
      alertEmail = await askQuestion('Enter alert email recipients (comma-separated)', '');
      if (alertEmail) {
        const emails = alertEmail.split(',').map(e => e.trim());
        const invalidEmails = emails.filter(email => !validateEmail(email));
        if (invalidEmails.length > 0) {
          console.log(`❌ Invalid email addresses: ${invalidEmails.join(', ')}`);
          alertEmail = await askQuestion('Enter alert email recipients (comma-separated)', '');
        }
      }
    }

    // Logging configuration
    const logLevel = await askQuestion('What log level do you want?', 'info');
    const validLogLevels = ['error', 'warn', 'info', 'debug'];
    if (!validLogLevels.includes(logLevel)) {
      console.log('❌ Invalid log level. Using "info"');
    }

    // Cloud monitoring configuration
    let grafanaUrl = '';
    const useGrafana = await askQuestion('Do you want to set up Grafana Cloud monitoring? (y/n)', 'n');
    if (useGrafana.toLowerCase() === 'y') {
      grafanaUrl = await askQuestion('Enter your Grafana Cloud URL', '');
      while (grafanaUrl && !validateUrl(grafanaUrl, 'Grafana Cloud')) {
        grafanaUrl = await askQuestion('Enter your Grafana Cloud URL', '');
      }
    }

    // Configuration summary
    console.log('\n📋 Configuration Summary:');
    console.log(`Project Name: ${projectName}`);
    console.log(`Sentry DSN: ${sentryDsn ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`Slack Webhook: ${slackWebhook ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`Teams Webhook: ${teamsWebhook ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`Alert Email: ${alertEmail ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`Log Level: ${logLevel}`);
    console.log(`Grafana Cloud: ${grafanaUrl ? '✅ Configured' : '❌ Not configured'}`);

    const proceed = await askQuestion('\nProceed with this configuration? (y/n)', 'y');
    if (proceed.toLowerCase() !== 'y') {
      console.log('❌ Setup cancelled');
      rl.close();
      return;
    }

    // Create .env.local file
    console.log('\n📝 Creating .env.local file...');
    const envContent = `# Observability Configuration
NEXT_PUBLIC_SENTRY_DSN=${sentryDsn}
SENTRY_DSN=${sentryDsn}
SENTRY_ENVIRONMENT=${process.env.NODE_ENV || 'development'}

# Alerting Configuration
SLACK_WEBHOOK_URL=${slackWebhook}
TEAMS_WEBHOOK_URL=${teamsWebhook}
ALERT_EMAIL_RECIPIENTS=${alertEmail}

# Logging Configuration
LOG_LEVEL=${logLevel}
NODE_ENV=development

# Cloud Prometheus Configuration
GRAFANA_CLOUD_URL=${grafanaUrl}

# Grafana Dashboard Configuration (for Sentry custom links)
GRAFANA_URL=${grafanaUrl}
GRAFANA_DASHBOARD_UID=your-dashboard-uid

# Email Configuration (for SMTP alerts)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=alerts@yourcompany.com

# Kinde Authentication (optional)
KINDE_CLIENT_ID=your_kinde_client_id
KINDE_CLIENT_SECRET=your_kinde_client_secret
KINDE_DOMAIN=your_kinde_domain
`;

    fs.writeFileSync('.env.local', envContent);
    console.log('✅ Created .env.local file');

    // Create logs directory
    if (!fs.existsSync('logs')) {
      fs.mkdirSync('logs');
      console.log('✅ Created logs directory');
    }

    // Create comprehensive setup instructions
    console.log('\n📚 Creating setup documentation...');
    const setupInstructions = generateSetupInstructions({
      projectName,
      sentryDsn,
      slackWebhook,
      teamsWebhook,
      alertEmail,
      logLevel,
      grafanaUrl
    });

    fs.writeFileSync('OBSERVABILITY_SETUP.md', setupInstructions);
    console.log('✅ Created OBSERVABILITY_SETUP.md');

    // Create package.json scripts if they don't exist
    console.log('\n📦 Checking package.json scripts...');
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      if (!packageJson.scripts) packageJson.scripts = {};
      
      const scriptsToAdd = {
        'setup': 'node scripts/setup.js',
        'generate-config': 'node scripts/generate-config.js',
        'test-observability': 'node scripts/test-observability.js'
      };

      let scriptsAdded = false;
      Object.entries(scriptsToAdd).forEach(([key, value]) => {
        if (!packageJson.scripts[key]) {
          packageJson.scripts[key] = value;
          scriptsAdded = true;
        }
      });

      if (scriptsAdded) {
        fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
        console.log('✅ Added observability scripts to package.json');
      } else {
        console.log('✅ Package.json scripts already configured');
      }
    } catch (error) {
      console.log('⚠️  Could not update package.json scripts automatically');
    }

    console.log('\n🎉 Observability setup complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Review .env.local and add your actual credentials');
    console.log('2. Run: npm install');
    console.log('3. Run: npm run dev');
    console.log('4. Check OBSERVABILITY_SETUP.md for detailed instructions');
    console.log('5. Test your setup: npm run test-observability');
    console.log('\n🚀 Your app now has production-ready observability!');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

function generateSetupInstructions(config) {
  return `# Observability Setup Complete! 🎉

## What's Been Added

### 📊 Metrics & Monitoring
- Prometheus metrics endpoint at \`/api/metrics\`
- Automatic HTTP request tracking with correlation IDs
- Custom metrics support
- Health check endpoint at \`/api/health\`
- Performance monitoring with Sentry

### 🚨 Error Tracking & Alerting
- Sentry integration (frontend + backend)
- Automatic error capture and reporting
- Multi-channel alerting system (Slack, Teams, Email)
- Performance monitoring and transaction tracking
- User context and session tracking

### 📝 Logging
- Winston structured logging with daily rotation
- Separate error and combined logs
- Sentry integration for error tracking
- Correlation ID propagation

### 🔍 Frontend Observability
- Correlation ID system for request tracing
- Client log forwarding to Sentry
- User context tracking
- Session replay (Sentry)
- Error boundaries with fallback UI

### 🔐 Authentication & User Management
- Kinde authentication service abstraction
- User session management with auto-refresh
- User context provider for React components
- Server-side user extraction utilities

## Configuration

### Environment Variables
Your configuration has been saved to \`.env.local\`:

- **Sentry**: ${config.sentryDsn ? '✅ Configured' : '❌ Not configured'}
- **Slack Alerts**: ${config.slackWebhook ? '✅ Configured' : '❌ Not configured'}
- **Teams Alerts**: ${config.teamsWebhook ? '✅ Configured' : '❌ Not configured'}
- **Email Alerts**: ${config.alertEmail ? '✅ Configured' : '❌ Not configured'}
- **Grafana Cloud**: ${config.grafanaUrl ? '✅ Configured' : '❌ Not configured'}
- **Log Level**: ${config.logLevel}

## Next Steps

### 1. Install Dependencies
\`\`\`bash
npm install
\`\`\`

### 2. Configure Cloud Prometheus (Optional)

#### Option A: Grafana Cloud (Recommended)
1. Sign up at https://grafana.com/cloud
2. Create a new stack
3. Go to "Prometheus" section
4. Copy the "Remote Write URL"
5. Update \`.env.local\` with your Grafana Cloud URL

#### Option B: AWS Managed Prometheus
1. Create workspace in AWS Console
2. Get remote write endpoint
3. Run: \`npm run generate-config aws-prometheus\`
4. Follow the generated instructions

### 3. Start Development
\`\`\`bash
npm run dev
\`\`\`

### 4. Test Your Setup
\`\`\`bash
# Test observability endpoints
npm run test-observability

# Manual testing
curl http://localhost:3000/api/health
curl http://localhost:3000/api/metrics
\`\`\`

## Usage Examples

### API Route Monitoring
\`\`\`typescript
import { withMonitoring } from '@/lib/withMonitoring';

export const GET = withMonitoring(async (req) => {
  // Your API logic here
  const data = await fetchData();
  return Response.json(data);
}, { 
  route: '/api/my-endpoint',
  alertOnError: true,
  logRequestBody: false,
  logResponseBody: false
});
\`\`\`

### Frontend Error Tracking
\`\`\`typescript
import * as Sentry from '@sentry/nextjs';
import { useSentryUser } from '@/lib/useSentryUser';
import { useUserInfo } from '@/auth/UserProvider';

export default function MyComponent() {
  const { user } = useUserInfo();
  useSentryUser(user); // Set Sentry user context

  const handleClick = () => {
    Sentry.captureMessage('Button clicked', {
      level: 'info',
      tags: { type: 'user_action' },
      extra: { button: 'checkout', page: '/cart' }
    });
  };

  return <button onClick={handleClick}>Click me</button>;
}
\`\`\`

### Custom Metrics
\`\`\`typescript
import { Counter, Histogram } from 'prom-client';

const customCounter = new Counter({
  name: 'custom_events_total',
  help: 'Total number of custom events',
  labelNames: ['event_type', 'user_id']
});

const customHistogram = new Histogram({
  name: 'custom_duration_seconds',
  help: 'Duration of custom operations',
  labelNames: ['operation']
});

// Record metrics
customCounter.labels('purchase', 'user123').inc();
customHistogram.labels('database_query').observe(0.5);
\`\`\`

### Custom Alerts
\`\`\`typescript
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
\`\`\`

## Dashboard Setup

### Grafana Dashboard Queries
Once you have cloud Prometheus configured:
1. Go to your Grafana instance
2. Create dashboards using these queries:

**Request Rate:**
\`\`\`promql
rate(http_requests_total[5m])
\`\`\`

**Error Rate:**
\`\`\`promql
rate(http_request_errors_total[5m])
\`\`\`

**Response Time (95th percentile):**
\`\`\`promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
\`\`\`

**Active Users:**
\`\`\`promql
count by (user_id) (http_requests_total)
\`\`\`

## Testing

### Test Observability Features
\`\`\`bash
npm run test-observability
\`\`\`

This will test:
- Health endpoint
- Metrics endpoint
- Sentry integration
- Alerting system
- Logging configuration

### Manual Testing
1. **Trigger an error** in your app
2. **Check Sentry** for the error
3. **Check logs** in the \`logs/\` directory
4. **Check metrics** at \`/api/metrics\`
5. **Test alerts** by triggering error conditions

## Troubleshooting

### Common Issues

**Sentry not capturing errors:**
- Check DSN is correct in \`.env.local\`
- Verify Sentry config files are in project root
- Check browser console for Sentry errors

**Metrics not showing:**
- Verify \`/api/metrics\` endpoint is accessible
- Check Prometheus is scraping the endpoint
- Verify correlation IDs are being set

**Alerts not sending:**
- Check webhook URLs are correct
- Verify network connectivity
- Check alert manager logs

**Correlation IDs not working:**
- Ensure \`fetchWithCorrelation\` is used for API calls
- Check middleware is preserving correlation IDs
- Verify Sentry configuration includes correlation ID tagging

## Support

- Check the \`src/lib/\` directory for all observability utilities
- Review \`OBSERVABILITY.md\` for detailed documentation
- See \`USER_SESSION.md\` for authentication details
- Check \`sentry-custom-links.json\` for Sentry configuration templates

## Production Deployment

### Environment Variables
Make sure to set these in production:
- \`NODE_ENV=production\`
- \`SENTRY_ENVIRONMENT=production\`
- All cloud provider URLs and credentials
- SMTP configuration for email alerts

### Monitoring Checklist
- [ ] Sentry DSN configured
- [ ] Cloud Prometheus configured
- [ ] Alert channels configured
- [ ] Log level set to appropriate level
- [ ] Health checks implemented
- [ ] Error boundaries in place
- [ ] Correlation IDs working
- [ ] User context tracking enabled

Your observability setup is now complete and production-ready! 🚀
`;
}

// Run the setup
if (require.main === module) {
  runSetup();
}

module.exports = { runSetup }; 