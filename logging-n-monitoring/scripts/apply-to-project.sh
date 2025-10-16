#!/bin/bash

# Next.js Observability Framework - Apply to Project Script
# Usage: ./scripts/apply-to-project.sh /path/to/your/project

set -e

FRAMEWORK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR="$1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Validation functions
validate_nextjs_project() {
    if [ ! -f "$TARGET_DIR/package.json" ]; then
        log_error "Target directory is not a Node.js project (no package.json found)"
        exit 1
    fi

    if ! grep -q "next" "$TARGET_DIR/package.json"; then
        log_error "Target directory is not a Next.js project (no 'next' in package.json)"
        exit 1
    fi

    if [ ! -d "$TARGET_DIR/src" ]; then
        log_error "Target directory does not have a src/ folder (required for Next.js App Router)"
        exit 1
    fi

    log_success "Target is a valid Next.js project"
}

create_backup() {
    BACKUP_DIR="$TARGET_DIR/observability-backup-$(date +%Y%m%d-%H%M%S)"
    log_info "Creating backup at: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"

    # Backup existing files if they exist
    local backup_dirs=("src/lib" "src/app/api" "src/components" "src/auth" "src/middleware.ts")
    
    for dir in "${backup_dirs[@]}"; do
        if [ -e "$TARGET_DIR/$dir" ]; then
            log_info "Backing up $dir"
            cp -r "$TARGET_DIR/$dir" "$BACKUP_DIR/"
        fi
    done

    # Backup config files
    local config_files=("sentry.client.config.ts" "sentry.server.config.ts" ".env.local")
    for file in "${config_files[@]}"; do
        if [ -f "$TARGET_DIR/$file" ]; then
            log_info "Backing up $file"
            cp "$TARGET_DIR/$file" "$BACKUP_DIR/"
        fi
    done

    log_success "Backup created at: $BACKUP_DIR"
}

copy_framework_files() {
    log_info "Copying observability framework..."

    # Create directories if they don't exist
    mkdir -p "$TARGET_DIR/src/lib"
    mkdir -p "$TARGET_DIR/src/app/api"
    mkdir -p "$TARGET_DIR/src/components"
    mkdir -p "$TARGET_DIR/src/auth"
    mkdir -p "$TARGET_DIR/scripts"
    mkdir -p "$TARGET_DIR/logs"

    # Copy lib files
    log_info "Copying lib/ files..."
    cp -r "$FRAMEWORK_DIR/src/lib/"* "$TARGET_DIR/src/lib/"

    # Copy API routes
    log_info "Copying API routes..."
    cp -r "$FRAMEWORK_DIR/src/app/api/"* "$TARGET_DIR/src/app/api/"

    # Copy components
    log_info "Copying components..."
    cp -r "$FRAMEWORK_DIR/src/components/"* "$TARGET_DIR/src/components/"

    # Copy auth files
    log_info "Copying auth/ files..."
    cp -r "$FRAMEWORK_DIR/src/auth/"* "$TARGET_DIR/src/auth/"

    # Copy middleware
    log_info "Copying middleware..."
    cp "$FRAMEWORK_DIR/src/middleware.ts" "$TARGET_DIR/src/"

    # Copy configuration files
    log_info "Copying configuration files..."
    cp "$FRAMEWORK_DIR/sentry.client.config.ts" "$TARGET_DIR/"
    cp "$FRAMEWORK_DIR/sentry.server.config.ts" "$TARGET_DIR/"
    cp "$FRAMEWORK_DIR/sentry-custom-links.json" "$TARGET_DIR/"

    # Copy scripts
    log_info "Copying scripts..."
    cp "$FRAMEWORK_DIR/scripts/setup.js" "$TARGET_DIR/scripts/"
    cp "$FRAMEWORK_DIR/scripts/generate-config.js" "$TARGET_DIR/scripts/"
    chmod +x "$TARGET_DIR/scripts/"*.js

    # Copy documentation
    log_info "Copying documentation..."
    cp "$FRAMEWORK_DIR/OBSERVABILITY.md" "$TARGET_DIR/"
    cp "$FRAMEWORK_DIR/USER_SESSION.md" "$TARGET_DIR/"

    log_success "Framework files copied successfully"
}

setup_client_layout() {
    log_info "Setting up client layout..."

    # Check if client layout already exists
    if [ -f "$TARGET_DIR/src/app/(client)/layout.tsx" ]; then
        log_warning "Client layout already exists, backing up..."
        cp "$TARGET_DIR/src/app/(client)/layout.tsx" "$TARGET_DIR/src/app/(client)/layout.tsx.backup"
    fi

    # Create client layout with observability
    cat > "$TARGET_DIR/src/app/(client)/layout.tsx" << 'EOF'
'use client';
import { UserProvider } from '@/auth/UserProvider';
import ClientLogForwarder from '@/components/ClientLogForwarder';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <ClientLogForwarder>
        {children}
      </ClientLogForwarder>
    </UserProvider>
  );
}
EOF

    log_success "Client layout configured with observability"
}

install_dependencies() {
    log_info "Installing dependencies..."

    cd "$TARGET_DIR"

    # Core observability dependencies
    local dependencies=(
        "prom-client"
        "winston"
        "winston-daily-rotate-file"
        "@sentry/nextjs"
        "nodemailer"
    )

    # Check and install dependencies
    for dep in "${dependencies[@]}"; do
        if ! grep -q "\"$dep\"" package.json; then
            log_info "Installing $dep..."
            npm install "$dep" --save
        else
            log_success "Dependency already exists: $dep"
        fi
    done

    # Install dev dependencies
    local dev_dependencies=(
        "@types/nodemailer"
    )

    for dep in "${dev_dependencies[@]}"; do
        if ! grep -q "\"$dep\"" package.json; then
            log_info "Installing dev dependency $dep..."
            npm install "$dep" --save-dev
        else
            log_success "Dev dependency already exists: $dep"
        fi
    done

    log_success "Dependencies installed"
}

update_package_json() {
    log_info "Updating package.json scripts..."

    cd "$TARGET_DIR"

    # Read current package.json
    local package_json=$(cat package.json)
    
    # Scripts to add
    local scripts_to_add=(
        '"setup": "node scripts/setup.js"'
        '"generate-config": "node scripts/generate-config.js"'
        '"test-observability": "node scripts/test-observability.js"'
    )

    # Check if scripts section exists
    if ! echo "$package_json" | grep -q '"scripts"'; then
        # Add scripts section
        package_json=$(echo "$package_json" | sed 's/}/  "scripts": {\n  }\n}/')
    fi

    # Add each script if it doesn't exist
    for script in "${scripts_to_add[@]}"; do
        local script_name=$(echo "$script" | cut -d'"' -f2)
        if ! echo "$package_json" | grep -q "\"$script_name\""; then
            log_info "Adding script: $script_name"
            # Add script to scripts section
            package_json=$(echo "$package_json" | sed 's/"scripts": {/"scripts": {\n    '"$script"',/')
        else
            log_success "Script already exists: $script_name"
        fi
    done

    # Write updated package.json
    echo "$package_json" > package.json
    log_success "Package.json updated"
}

create_env_template() {
    log_info "Creating .env.local template..."

    cd "$TARGET_DIR"

    if [ ! -f ".env.local" ]; then
        cat > .env.local << 'EOF'
# Observability Configuration
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here
SENTRY_DSN=your_sentry_dsn_here
SENTRY_ENVIRONMENT=development

# Alerting Configuration
SLACK_WEBHOOK_URL=your_slack_webhook_url
TEAMS_WEBHOOK_URL=your_teams_webhook_url
ALERT_EMAIL_RECIPIENTS=admin@example.com

# Logging Configuration
LOG_LEVEL=info
NODE_ENV=development

# Cloud Prometheus Configuration
GRAFANA_CLOUD_URL=your_grafana_cloud_url

# Grafana Dashboard Configuration (for Sentry custom links)
GRAFANA_URL=your_grafana_url
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
EOF
        log_success "Created .env.local template"
    else
        log_warning ".env.local already exists - please review and update manually"
    fi
}

create_test_script() {
    log_info "Creating test observability script..."

    cd "$TARGET_DIR"

    cat > "scripts/test-observability.js" << 'EOF'
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
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      test.test();
      console.log(`✅ ${test.name}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}`);
      failed++;
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
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
    process.exit(1);
  }
}

testObservability().catch(console.error);
EOF

    chmod +x "scripts/test-observability.js"
    log_success "Created test observability script"
}

create_readme() {
    log_info "Creating observability README..."

    cd "$TARGET_DIR"

    cat > "OBSERVABILITY_README.md" << 'EOF'
# 🚀 Observability Framework

This project has been enhanced with a comprehensive observability framework.

## 🎯 What's Included

### 📊 Metrics & Monitoring
- **Prometheus Metrics**: HTTP request tracking, custom metrics
- **Health Checks**: `/api/health` endpoint
- **Performance Monitoring**: Response times, error rates

### 🚨 Error Tracking
- **Sentry Integration**: Full-stack error tracking
- **Error Boundaries**: React error boundaries with fallback UI
- **User Context**: Automatic user identification in errors

### 📝 Logging
- **Structured Logging**: Winston with daily rotation
- **Correlation IDs**: Request tracing across frontend/backend
- **Log Levels**: Configurable logging levels

### 🔔 Alerting
- **Multi-channel**: Slack, Teams, Email alerts
- **Configurable**: Different alert levels and conditions
- **Sentry Integration**: Automatic error-based alerting

### 🔐 Authentication
- **Kinde Integration**: User authentication and session management
- **User Context**: Automatic user tracking in observability
- **Session Refresh**: Automatic session renewal

## 🚀 Quick Start

1. **Configure Environment**:
   ```bash
   npm run setup
   ```

2. **Start Development**:
   ```bash
   npm run dev
   ```

3. **Test Setup**:
   ```bash
   npm run test-observability
   ```

## 📚 Documentation

- **OBSERVABILITY.md**: Detailed observability documentation
- **USER_SESSION.md**: Authentication and user management
- **sentry-custom-links.json**: Sentry configuration templates

## 🔧 Configuration

Edit `.env.local` to configure:
- Sentry DSN
- Alert webhooks (Slack, Teams, Email)
- Cloud monitoring URLs
- Log levels

## 📊 Monitoring

- **Health Check**: `http://localhost:3000/api/health`
- **Metrics**: `http://localhost:3000/api/metrics`
- **Monitoring Dashboard**: `/monitoring` (if implemented)

## 🛠️ Usage Examples

### API Route Monitoring
```typescript
import { withMonitoring } from '@/lib/withMonitoring';

export const GET = withMonitoring(async (req) => {
  // Your API logic here
  return Response.json({ data: 'success' });
}, { route: '/api/my-endpoint' });
```

### Frontend Error Tracking
```typescript
import * as Sentry from '@sentry/nextjs';
import { useSentryUser } from '@/lib/useSentryUser';

export default function MyComponent() {
  const { user } = useUserInfo();
  useSentryUser(user);

  const handleError = () => {
    Sentry.captureMessage('User action', 'info');
  };
}
```

## 🔄 Backup

A backup of your original files has been created in:
`observability-backup-YYYYMMDD-HHMMSS/`

You can restore from backup if needed.

---

**Need help?** Check the documentation files or run `npm run test-observability` to verify your setup.
EOF

    log_success "Created observability README"
}

# Main execution
main() {
    echo "🚀 Next.js Observability Framework"
    echo "=================================="
    echo "Framework: $FRAMEWORK_DIR"
    echo "Target: $TARGET_DIR"
    echo ""

    # Validate input
    if [ -z "$TARGET_DIR" ]; then
        log_error "Usage: $0 /path/to/your/project"
        echo ""
        echo "Example: $0 ../my-real-app"
        exit 1
    fi

    if [ ! -d "$TARGET_DIR" ]; then
        log_error "Target directory does not exist: $TARGET_DIR"
        exit 1
    fi

    # Validate Next.js project
    validate_nextjs_project

    # Create backup
    create_backup

    # Copy framework files
    copy_framework_files

    # Setup client layout
    setup_client_layout

    # Install dependencies
    install_dependencies

    # Update package.json
    update_package_json

    # Create environment template
    create_env_template

    # Create test script
    create_test_script

    # Create README
    create_readme

    echo ""
    echo "🎉 Framework applied successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Review .env.local and add your credentials"
    echo "2. Run: npm run setup (for interactive configuration)"
    echo "3. Run: npm run dev"
    echo "4. Test your setup: npm run test-observability"
    echo ""
    echo "📚 Documentation:"
    echo "- Check OBSERVABILITY_README.md for quick start"
    echo "- Check OBSERVABILITY.md for detailed documentation"
    echo "- Check USER_SESSION.md for authentication details"
    echo ""
    echo "🔄 Backup created at: $BACKUP_DIR"
    echo "   (You can restore from backup if needed)"
    echo ""
    echo "🚀 Your project now has production-ready observability!"
}

# Run main function
main "$@" 