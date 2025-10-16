#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('☁️  Cloud Prometheus Configuration Generator');
console.log('===========================================\n');

const cloudProviders = {
  'grafana-cloud': {
    name: 'Grafana Cloud',
    description: 'Managed Grafana and Prometheus in the cloud',
    steps: [
      '1. Sign up at https://grafana.com/cloud',
      '2. Create a new stack',
      '3. Go to "Prometheus" section',
      '4. Copy the "Remote Write URL"',
      '5. Copy the "Username" and "API Key"',
      '6. Note your Grafana URL for dashboard linking'
    ],
    envVars: {
      'GRAFANA_CLOUD_URL': 'your_grafana_cloud_prometheus_url',
      'GRAFANA_CLOUD_USERNAME': 'your_username',
      'GRAFANA_CLOUD_API_KEY': 'your_api_key',
      'GRAFANA_URL': 'your_grafana_url',
      'GRAFANA_DASHBOARD_UID': 'your_dashboard_uid'
    },
    configFile: 'grafana-cloud-config.js',
    dashboardQueries: [
      'rate(http_requests_total[5m])',
      'rate(http_request_errors_total[5m])',
      'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))',
      'count by (user_id) (http_requests_total)'
    ]
  },
  'aws-prometheus': {
    name: 'AWS Managed Prometheus',
    description: 'Amazon Managed Service for Prometheus',
    steps: [
      '1. Go to AWS Console → Amazon Managed Service for Prometheus',
      '2. Create a new workspace',
      '3. Note the workspace ID and region',
      '4. Create an IAM user with PrometheusRemoteWrite permissions',
      '5. Get the access key and secret',
      '6. Configure AWS credentials'
    ],
    envVars: {
      'AWS_PROMETHEUS_WORKSPACE_ID': 'your_workspace_id',
      'AWS_PROMETHEUS_REGION': 'your_aws_region',
      'AWS_ACCESS_KEY_ID': 'your_access_key',
      'AWS_SECRET_ACCESS_KEY': 'your_secret_key',
      'GRAFANA_URL': 'your_grafana_url',
      'GRAFANA_DASHBOARD_UID': 'your_dashboard_uid'
    },
    configFile: 'aws-prometheus-config.js',
    dashboardQueries: [
      'rate(http_requests_total[5m])',
      'rate(http_request_errors_total[5m])',
      'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))',
      'count by (user_id) (http_requests_total)'
    ]
  },
  'google-cloud': {
    name: 'Google Cloud Operations',
    description: 'Google Cloud Monitoring with Prometheus',
    steps: [
      '1. Go to Google Cloud Console → Monitoring',
      '2. Enable Cloud Monitoring API',
      '3. Create a new workspace',
      '4. Set up Prometheus integration',
      '5. Get the project ID and credentials',
      '6. Download service account JSON'
    ],
    envVars: {
      'GOOGLE_CLOUD_PROJECT_ID': 'your_project_id',
      'GOOGLE_APPLICATION_CREDENTIALS': 'path/to/service-account.json',
      'GRAFANA_URL': 'your_grafana_url',
      'GRAFANA_DASHBOARD_UID': 'your_dashboard_uid'
    },
    configFile: 'google-cloud-config.js',
    dashboardQueries: [
      'rate(http_requests_total[5m])',
      'rate(http_request_errors_total[5m])',
      'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))',
      'count by (user_id) (http_requests_total)'
    ]
  },
  'datadog': {
    name: 'Datadog',
    description: 'Datadog APM and monitoring',
    steps: [
      '1. Sign up for Datadog account',
      '2. Get your API key and app key',
      '3. Configure Prometheus remote write endpoint',
      '4. Set up custom metrics',
      '5. Configure dashboards'
    ],
    envVars: {
      'DATADOG_API_KEY': 'your_datadog_api_key',
      'DATADOG_APP_KEY': 'your_datadog_app_key',
      'DATADOG_SITE': 'datadoghq.com',
      'GRAFANA_URL': 'your_grafana_url',
      'GRAFANA_DASHBOARD_UID': 'your_dashboard_uid'
    },
    configFile: 'datadog-config.js',
    dashboardQueries: [
      'rate(http_requests_total[5m])',
      'rate(http_request_errors_total[5m])',
      'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))',
      'count by (user_id) (http_requests_total)'
    ]
  },
  'new-relic': {
    name: 'New Relic',
    description: 'New Relic APM and monitoring',
    steps: [
      '1. Sign up for New Relic account',
      '2. Get your license key',
      '3. Configure Prometheus remote write endpoint',
      '4. Set up custom metrics',
      '5. Configure dashboards'
    ],
    envVars: {
      'NEW_RELIC_LICENSE_KEY': 'your_new_relic_license_key',
      'NEW_RELIC_ACCOUNT_ID': 'your_account_id',
      'GRAFANA_URL': 'your_grafana_url',
      'GRAFANA_DASHBOARD_UID': 'your_dashboard_uid'
    },
    configFile: 'new-relic-config.js',
    dashboardQueries: [
      'rate(http_requests_total[5m])',
      'rate(http_request_errors_total[5m])',
      'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))',
      'count by (user_id) (http_requests_total)'
    ]
  }
};

function validateProvider(provider) {
  if (!cloudProviders[provider]) {
    console.log('❌ Unknown provider. Available options:');
    Object.entries(cloudProviders).forEach(([key, config]) => {
      console.log(`  - ${key}: ${config.name} - ${config.description}`);
    });
    return false;
  }
  return true;
}

function generateConfig(provider) {
  const config = cloudProviders[provider];
  
  console.log(`📋 Generating configuration for ${config.name}...\n`);

  // Generate environment variables
  const envContent = Object.entries(config.envVars)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  // Generate configuration file
  const configContent = generateConfigFile(provider, config);

  // Generate dashboard queries
  const queriesContent = generateDashboardQueries(config.dashboardQueries);

  // Write files
  fs.writeFileSync(`${provider}-env.txt`, envContent);
  fs.writeFileSync(config.configFile, configContent);
  fs.writeFileSync(`${provider}-dashboard-queries.txt`, queriesContent);

  console.log('✅ Generated files:');
  console.log(`  - ${provider}-env.txt (environment variables)`);
  console.log(`  - ${config.configFile} (configuration)`);
  console.log(`  - ${provider}-dashboard-queries.txt (dashboard queries)`);
  
  console.log('\n📋 Setup steps:');
  config.steps.forEach(step => console.log(`  ${step}`));
  
  console.log('\n🔧 Next steps:');
  console.log(`1. Copy variables from ${provider}-env.txt to your .env.local`);
  console.log(`2. Update the values with your actual credentials`);
  console.log(`3. Import and use ${config.configFile} in your app`);
  console.log(`4. Use the dashboard queries in your Grafana dashboards`);
  
  console.log('\n📊 Dashboard Setup:');
  console.log('1. Go to your Grafana instance');
  console.log('2. Create a new dashboard');
  console.log('3. Add panels using the queries from the generated file');
  console.log('4. Set up variables for filtering (e.g., request_id)');
}

function generateConfigFile(provider, config) {
  switch (provider) {
    case 'grafana-cloud':
      return `// Grafana Cloud Prometheus Configuration
const { write } = require('prom-client');

// Configure remote write to Grafana Cloud
const remoteWriteConfig = {
  url: process.env.GRAFANA_CLOUD_URL,
  headers: {
    'Authorization': 'Basic ' + Buffer.from(
      process.env.GRAFANA_CLOUD_USERNAME + ':' + process.env.GRAFANA_CLOUD_API_KEY
    ).toString('base64'),
    'Content-Type': 'application/x-protobuf'
  }
};

// Send metrics to Grafana Cloud every 15 seconds
setInterval(async () => {
  try {
    const metrics = await require('prom-client').register.metrics();
    await write(remoteWriteConfig, metrics);
  } catch (error) {
    console.error('Failed to send metrics to Grafana Cloud:', error);
  }
}, 15000);

module.exports = { remoteWriteConfig };
`;

    case 'aws-prometheus':
      return `// AWS Managed Prometheus Configuration
const { write } = require('prom-client');
const crypto = require('crypto');

// AWS SigV4 signature helper
function createSignature(stringToSign, secretKey, dateStamp, region, service) {
  const kDate = crypto.createHmac('sha256', 'AWS4' + secretKey).update(dateStamp).digest();
  const kRegion = crypto.createHmac('sha256', kDate).update(region).digest();
  const kService = crypto.createHmac('sha256', kRegion).update(service).digest();
  const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
  return crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');
}

// Configure remote write to AWS Prometheus
const remoteWriteConfig = {
  url: \`https://aps-workspaces.\${process.env.AWS_PROMETHEUS_REGION}.amazonaws.com/workspaces/\${process.env.AWS_PROMETHEUS_WORKSPACE_ID}/api/v1/remote_write\`,
  headers: {
    'Content-Type': 'application/x-protobuf'
  }
};

// Add AWS SigV4 headers
function addAwsHeaders(config) {
  const accessKey = process.env.AWS_ACCESS_KEY_ID;
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_PROMETHEUS_REGION;
  
  if (!accessKey || !secretKey || !region) {
    throw new Error('AWS credentials not configured');
  }
  
  const now = new Date();
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStamp = now.toISOString().replace(/[:-]|\\.\\d{3}/g, '');
  
  const service = 'aps';
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = \`\${dateStamp}/\${region}/\${service}/aws4_request\`;
  
  const signedHeaders = 'content-type;host;x-amz-date';
  const canonicalHeaders = \`content-type:application/x-protobuf\\nhost:\${new URL(config.url).host}\\nx-amz-date:\${timeStamp}\\n\`;
  
  const canonicalRequest = \`POST\\n/api/v1/remote_write\\n\\n\${canonicalHeaders}\\n\${signedHeaders}\\nUNSIGNED-PAYLOAD\`;
  const stringToSign = \`\${algorithm}\\n\${timeStamp}\\n\${credentialScope}\\n\${crypto.createHash('sha256').update(canonicalRequest).digest('hex')}\`;
  
  const signature = createSignature(stringToSign, secretKey, dateStamp, region, service);
  const authorizationHeader = \`\${algorithm} Credential=\${accessKey}/\${credentialScope}, SignedHeaders=\${signedHeaders}, Signature=\${signature}\`;
  
  config.headers['Authorization'] = authorizationHeader;
  config.headers['X-Amz-Date'] = timeStamp;
  
  return config;
}

// Send metrics to AWS Prometheus every 15 seconds
setInterval(async () => {
  try {
    const metrics = await require('prom-client').register.metrics();
    const configWithAuth = addAwsHeaders({...remoteWriteConfig});
    await write(configWithAuth, metrics);
  } catch (error) {
    console.error('Failed to send metrics to AWS Prometheus:', error);
  }
}, 15000);

module.exports = { remoteWriteConfig };
`;

    case 'google-cloud':
      return `// Google Cloud Operations Configuration
const { write } = require('prom-client');

// Configure remote write to Google Cloud
const remoteWriteConfig = {
  url: \`https://monitoring.googleapis.com/v1/projects/\${process.env.GOOGLE_CLOUD_PROJECT_ID}/metrics:write\`,
  headers: {
    'Content-Type': 'application/x-protobuf'
  }
};

// Add Google Cloud authentication
async function addGoogleAuth(config) {
  try {
    const { GoogleAuth } = require('google-auth-library');
    const auth = new GoogleAuth({
      keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes: ['https://www.googleapis.com/auth/monitoring.write']
    });
    
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    
    config.headers['Authorization'] = \`Bearer \${token.token}\`;
    return config;
  } catch (error) {
    console.error('Failed to get Google Cloud auth token:', error);
    throw error;
  }
}

// Send metrics to Google Cloud every 15 seconds
setInterval(async () => {
  try {
    const metrics = await require('prom-client').register.metrics();
    const configWithAuth = await addGoogleAuth({...remoteWriteConfig});
    await write(configWithAuth, metrics);
  } catch (error) {
    console.error('Failed to send metrics to Google Cloud:', error);
  }
}, 15000);

module.exports = { remoteWriteConfig };
`;

    case 'datadog':
      return `// Datadog Configuration
const { write } = require('prom-client');

// Configure remote write to Datadog
const remoteWriteConfig = {
  url: \`https://api.\${process.env.DATADOG_SITE}/api/v1/series\`,
  headers: {
    'Content-Type': 'application/json',
    'DD-API-KEY': process.env.DATADOG_API_KEY,
    'DD-APP-KEY': process.env.DATADOG_APP_KEY
  }
};

// Convert Prometheus metrics to Datadog format
function convertToDatadogFormat(metricsText) {
  const lines = metricsText.split('\\n');
  const series = [];
  
  for (const line of lines) {
    if (line.startsWith('#') || !line.trim()) continue;
    
    const match = line.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)({[^}]*})?\s+([0-9.]+)/);
    if (match) {
      const [, metric, labels, value] = match;
      const tags = [];
      
      if (labels) {
        const labelMatches = labels.matchAll(/([a-zA-Z_][a-zA-Z0-9_]*)=["']([^"']*)["']/g);
        for (const [, key, val] of labelMatches) {
          tags.push(\`\${key}:\${val}\`);
        }
      }
      
      series.push({
        metric: metric.replace(/:/g, '.'),
        points: [[Math.floor(Date.now() / 1000), parseFloat(value)]],
        tags: tags
      });
    }
  }
  
  return { series };
}

// Send metrics to Datadog every 15 seconds
setInterval(async () => {
  try {
    const metrics = await require('prom-client').register.metrics();
    const datadogData = convertToDatadogFormat(metrics);
    
    const response = await fetch(remoteWriteConfig.url, {
      method: 'POST',
      headers: remoteWriteConfig.headers,
      body: JSON.stringify(datadogData)
    });
    
    if (!response.ok) {
      throw new Error(\`Datadog API error: \${response.status}\`);
    }
  } catch (error) {
    console.error('Failed to send metrics to Datadog:', error);
  }
}, 15000);

module.exports = { remoteWriteConfig };
`;

    case 'new-relic':
      return `// New Relic Configuration
const { write } = require('prom-client');

// Configure remote write to New Relic
const remoteWriteConfig = {
  url: \`https://metric-api.newrelic.com/metric/v1\`,
  headers: {
    'Content-Type': 'application/json',
    'Api-Key': process.env.NEW_RELIC_LICENSE_KEY
  }
};

// Convert Prometheus metrics to New Relic format
function convertToNewRelicFormat(metricsText) {
  const lines = metricsText.split('\\n');
  const metrics = [];
  
  for (const line of lines) {
    if (line.startsWith('#') || !line.trim()) continue;
    
    const match = line.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)({[^}]*})?\s+([0-9.]+)/);
    if (match) {
      const [, metric, labels, value] = match;
      const attributes = {};
      
      if (labels) {
        const labelMatches = labels.matchAll(/([a-zA-Z_][a-zA-Z0-9_]*)=["']([^"']*)["']/g);
        for (const [, key, val] of labelMatches) {
          attributes[key] = val;
        }
      }
      
      metrics.push({
        name: metric.replace(/:/g, '.'),
        type: 'gauge',
        value: parseFloat(value),
        timestamp: Math.floor(Date.now() / 1000),
        attributes: attributes
      });
    }
  }
  
  return {
    metrics: metrics
  };
}

// Send metrics to New Relic every 15 seconds
setInterval(async () => {
  try {
    const metrics = await require('prom-client').register.metrics();
    const newRelicData = convertToNewRelicFormat(metrics);
    
    const response = await fetch(remoteWriteConfig.url, {
      method: 'POST',
      headers: remoteWriteConfig.headers,
      body: JSON.stringify(newRelicData)
    });
    
    if (!response.ok) {
      throw new Error(\`New Relic API error: \${response.status}\`);
    }
  } catch (error) {
    console.error('Failed to send metrics to New Relic:', error);
  }
}, 15000);

module.exports = { remoteWriteConfig };
`;

    default:
      return '';
  }
}

function generateDashboardQueries(queries) {
  return `# Grafana Dashboard Queries for Observability

## Request Metrics

### Request Rate
\`\`\`promql
${queries[0]}
\`\`\`

### Error Rate
\`\`\`promql
${queries[1]}
\`\`\`

### Response Time (95th percentile)
\`\`\`promql
${queries[2]}
\`\`\`

### Active Users
\`\`\`promql
${queries[3]}
\`\`\`

## Additional Useful Queries

### Request Rate by Endpoint
\`\`\`promql
rate(http_requests_total[5m]) by (route)
\`\`\`

### Error Rate by Endpoint
\`\`\`promql
rate(http_request_errors_total[5m]) by (route)
\`\`\`

### Response Time by Endpoint
\`\`\`promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) by (route)
\`\`\`

### Memory Usage
\`\`\`promql
process_resident_memory_bytes
\`\`\`

### CPU Usage
\`\`\`promql
rate(process_cpu_seconds_total[5m])
\`\`\`

### Node.js Event Loop Lag
\`\`\`promql
nodejs_eventloop_lag_seconds
\`\`\`

## Dashboard Variables

Set up these variables in your Grafana dashboard:

### Request ID Variable
- Name: \`request_id\`
- Type: \`Text box\`
- Default value: \`.*\`

### Time Range Variable
- Name: \`time_range\`
- Type: \`Interval\`
- Default value: \`5m\`

## Alert Rules

### High Error Rate Alert
\`\`\`promql
rate(http_request_errors_total[5m]) / rate(http_requests_total[5m]) > 0.05
\`\`\`

### High Response Time Alert
\`\`\`promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
\`\`\`

### Low Request Rate Alert
\`\`\`promql
rate(http_requests_total[5m]) < 1
\`\`\`
`;
}

// Main execution
const provider = process.argv[2];
if (!provider) {
  console.log('Usage: node generate-config.js <provider>');
  console.log('\nAvailable providers:');
  Object.entries(cloudProviders).forEach(([key, config]) => {
    console.log(`  - ${key}: ${config.name} - ${config.description}`);
  });
  console.log('\nExample: node generate-config.js grafana-cloud');
  console.log('\nFor more information about each provider:');
  Object.entries(cloudProviders).forEach(([key, config]) => {
    console.log(`  ${key}: ${config.steps[0]}`);
  });
} else {
  if (validateProvider(provider)) {
    generateConfig(provider);
  }
}

module.exports = { cloudProviders, generateConfig, validateProvider }; 