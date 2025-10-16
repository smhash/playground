#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Observability Setup');
console.log('==============================\n');

async function testObservability() {
  const tests = [
    {
      name: 'Environment Variables',
      test: () => {
        const envFile = '.env.local';
        if (!fs.existsSync(envFile)) {
          throw new Error('.env.local file not found');
        }
        const content = fs.readFileSync(envFile, 'utf8');
        const requiredVars = [
          'NEXT_PUBLIC_SENTRY_DSN',
          'LOG_LEVEL',
          'NODE_ENV'
        ];
        
        for (const varName of requiredVars) {
          if (!content.includes(varName)) {
            throw new Error(`Missing environment variable: ${varName}`);
          }
        }
        return true;
      }
    },
    {
      name: 'Sentry Configuration',
      test: () => {
        const files = ['sentry.client.config.ts', 'sentry.server.config.ts'];
        for (const file of files) {
          if (!fs.existsSync(file)) {
            throw new Error(`Sentry config file not found: ${file}`);
          }
        }
        return true;
      }
    },
    {
      name: 'Core Libraries',
      test: () => {
        const libFiles = [
          'src/lib/logger.ts',
          'src/lib/metrics.ts',
          'src/lib/alerts.ts',
          'src/lib/sentry.ts',
          'src/lib/withMonitoring.ts',
          'src/lib/fetchWithCorrelation.ts',
          'src/lib/useSentryUser.ts'
        ];
        
        for (const file of libFiles) {
          if (!fs.existsSync(file)) {
            throw new Error(`Core library file not found: ${file}`);
          }
        }
        return true;
      }
    },
    {
      name: 'API Routes',
      test: () => {
        const apiFiles = [
          'src/app/api/health/route.ts',
          'src/app/api/metrics/route.ts'
        ];
        
        for (const file of apiFiles) {
          if (!fs.existsSync(file)) {
            throw new Error(`API route file not found: ${file}`);
          }
        }
        return true;
      }
    },
    {
      name: 'Components',
      test: () => {
        const componentFiles = [
          'src/components/ErrorBoundary.tsx',
          'src/components/ClientLogForwarder.tsx',
          'src/components/MonitoringDashboard.tsx'
        ];
        
        for (const file of componentFiles) {
          if (!fs.existsSync(file)) {
            throw new Error(`Component file not found: ${file}`);
          }
        }
        return true;
      }
    },
    {
      name: 'Authentication',
      test: () => {
        const authFiles = [
          'src/auth/kinde.ts',
          'src/auth/useKindeUser.ts',
          'src/auth/UserProvider.tsx',
          'src/auth/getUserFromHeaders.ts',
          'src/auth/index.ts'
        ];
        
        for (const file of authFiles) {
          if (!fs.existsSync(file)) {
            throw new Error(`Auth file not found: ${file}`);
          }
        }
        return true;
      }
    },
    {
      name: 'Middleware',
      test: () => {
        if (!fs.existsSync('src/middleware.ts')) {
          throw new Error('Middleware file not found');
        }
        return true;
      }
    },
    {
      name: 'Package.json Scripts',
      test: () => {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        const requiredScripts = ['setup', 'generate-config', 'test-observability'];
        
        for (const script of requiredScripts) {
          if (!packageJson.scripts || !packageJson.scripts[script]) {
            throw new Error(`Required script not found: ${script}`);
          }
        }
        return true;
      }
    },
    {
      name: 'Dependencies',
      test: () => {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        const requiredDeps = [
          'prom-client',
          'winston',
          'winston-daily-rotate-file',
          '@sentry/nextjs'
        ];
        
        const allDeps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies
        };
        
        for (const dep of requiredDeps) {
          if (!allDeps[dep]) {
            throw new Error(`Required dependency not found: ${dep}`);
          }
        }
        return true;
      }
    },
    {
      name: 'Logs Directory',
      test: () => {
        if (!fs.existsSync('logs')) {
          throw new Error('Logs directory not found');
        }
        return true;
      }
    },
    {
      name: 'Documentation',
      test: () => {
        const docs = [
          'OBSERVABILITY.md',
          'USER_SESSION.md',
          'sentry-custom-links.json'
        ];
        
        for (const doc of docs) {
          if (!fs.existsSync(doc)) {
            throw new Error(`Documentation file not found: ${doc}`);
          }
        }
        return true;
      }
    }
  ];

  let passed = 0;
  let failed = 0;
  const failures = [];

  for (const test of tests) {
    try {
      test.test();
      console.log(`✅ ${test.name}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}`);
      failed++;
      failures.push({ name: test.name, error: error.message });
    }
  }

  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! Your observability setup is complete.');
    console.log('\n📋 Next steps:');
    console.log('1. Run: npm run dev');
    console.log('2. Test endpoints:');
    console.log('   - http://localhost:3000/api/health');
    console.log('   - http://localhost:3000/api/metrics');
    console.log('3. Check logs in the logs/ directory');
    console.log('4. Configure your cloud monitoring provider:');
    console.log('   - npm run generate-config grafana-cloud');
    console.log('   - npm run generate-config aws-prometheus');
    console.log('   - npm run generate-config google-cloud');
    console.log('\n🚀 Your observability framework is ready for production!');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above:');
    failures.forEach(failure => {
      console.log(`   - ${failure.name}: ${failure.error}`);
    });
    
    console.log('\n🔧 To fix these issues:');
    console.log('1. Run: npm run setup (for interactive configuration)');
    console.log('2. Check that all files were copied correctly');
    console.log('3. Verify dependencies are installed: npm install');
    console.log('4. Ensure you have the correct Next.js project structure');
    
    process.exit(1);
  }
}

// Additional validation functions
function validateFileContent(filePath, requiredContent) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  for (const item of requiredContent) {
    if (!content.includes(item)) {
      throw new Error(`Required content not found in ${filePath}: ${item}`);
    }
  }
}

function validateDirectoryStructure() {
  const requiredDirs = [
    'src/lib',
    'src/app/api',
    'src/components',
    'src/auth',
    'scripts',
    'logs'
  ];
  
  for (const dir of requiredDirs) {
    if (!fs.existsSync(dir)) {
      throw new Error(`Required directory not found: ${dir}`);
    }
  }
}

// Run the tests
testObservability().catch(console.error);

module.exports = { testObservability }; 