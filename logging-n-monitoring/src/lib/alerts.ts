import logger from './logger';
import * as Sentry from '@sentry/node';

export interface AlertContext {
  [key: string]: string | number | boolean | object | null | undefined;
}

export interface AlertConfig {
  level: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  context?: AlertContext;
  tags?: string[];
  deduplicationKey?: string; // For deduplicating similar alerts
}

export interface AlertChannel {
  name: string;
  send: (alert: AlertConfig) => Promise<void>;
}

// Rate limiting and deduplication
interface AlertState {
  lastSent: number;
  count: number;
}

class AlertDeduplicator {
  private alerts = new Map<string, AlertState>();
  private readonly windowMs = 5 * 60 * 1000; // 5 minutes
  private readonly maxAlertsPerWindow = 3;

  shouldSend(deduplicationKey: string): boolean {
    const now = Date.now();
    const state = this.alerts.get(deduplicationKey);

    if (!state) {
      this.alerts.set(deduplicationKey, { lastSent: now, count: 1 });
      return true;
    }

    // Reset if outside window
    if (now - state.lastSent > this.windowMs) {
      this.alerts.set(deduplicationKey, { lastSent: now, count: 1 });
      return true;
    }

    // Check rate limit
    if (state.count >= this.maxAlertsPerWindow) {
      return false;
    }

    // Update count
    state.count++;
    state.lastSent = now;
    return true;
  }

  // Clean up old entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, state] of this.alerts.entries()) {
      if (now - state.lastSent > this.windowMs) {
        this.alerts.delete(key);
      }
    }
  }
}

// URL validation helper
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Teams webhook alert channel
class TeamsAlertChannel implements AlertChannel {
  name = 'teams';
  private webhookUrl: string;

  constructor(webhookUrl: string) {
    if (!isValidUrl(webhookUrl)) {
      throw new Error('Invalid Teams webhook URL');
    }
    this.webhookUrl = webhookUrl;
  }

  async send(alert: AlertConfig): Promise<void> {
    try {
      const color = this.getColorForLevel(alert.level);
      const payload = {
        '@type': 'MessageCard',
        '@context': 'http://schema.org/extensions',
        themeColor: color,
        summary: alert.title,
        sections: [
          {
            activityTitle: alert.title,
            activitySubtitle: new Date().toISOString(),
            text: alert.message,
            facts: Object.entries(alert.context || {}).map(([key, value]) => ({
              name: key,
              value: typeof value === 'object' ? JSON.stringify(value) : String(value)
            }))
          }
        ]
      };

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        // Add timeout
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`Teams webhook failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      logger.error('Failed to send Teams alert', { error, alert });
      throw error; // Re-throw to allow retry logic
    }
  }

  private getColorForLevel(level: string): string {
    switch (level) {
      case 'info': return '0076D7';
      case 'warning': return 'FFA500';
      case 'error': return 'FF0000';
      case 'critical': return '8B0000';
      default: return '0076D7';
    }
  }
}

// Slack webhook alert channel
class SlackAlertChannel implements AlertChannel {
  name = 'slack';
  private webhookUrl: string;

  constructor(webhookUrl: string) {
    if (!isValidUrl(webhookUrl)) {
      throw new Error('Invalid Slack webhook URL');
    }
    this.webhookUrl = webhookUrl;
  }

  async send(alert: AlertConfig): Promise<void> {
    try {
      const color = this.getColorForLevel(alert.level);
      const payload = {
        attachments: [
          {
            color,
            title: alert.title,
            text: alert.message,
            fields: Object.entries(alert.context || {}).map(([key, value]) => ({
              title: key,
              value: typeof value === 'object' ? JSON.stringify(value) : String(value),
              short: true
            })),
            ts: Math.floor(Date.now() / 1000)
          }
        ]
      };

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        // Add timeout
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`Slack webhook failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      logger.error('Failed to send Slack alert', { error, alert });
      throw error; // Re-throw to allow retry logic
    }
  }

  private getColorForLevel(level: string): string {
    switch (level) {
      case 'info': return '#36a64f';
      case 'warning': return '#ffa500';
      case 'error': return '#ff0000';
      case 'critical': return '#8b0000';
      default: return '#36a64f';
    }
  }
}

// Email alert channel (using nodemailer for SMTP)
class EmailAlertChannel implements AlertChannel {
  name = 'email';
  private recipients: string[];
  private transporter: any; // Will be typed as nodemailer.Transporter when initialized

  constructor(recipients: string[]) {
    this.recipients = recipients;
    this.initializeTransporter();
  }

  private async initializeTransporter(): Promise<void> {
    // Initialize nodemailer if SMTP config is available
    if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
      try {
        const nodemailer = await import('nodemailer');
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });
      } catch (error) {
        logger.warn('Failed to initialize email transporter', { error });
      }
    }
  }

  async send(alert: AlertConfig): Promise<void> {
    try {
      if (!this.transporter) {
        // Fallback to logging if SMTP not configured
        logger.info('Email alert would be sent', {
          recipients: this.recipients,
          alert
        });
        return;
      }

      const color = this.getColorForLevel(alert.level);
      const contextHtml = Object.entries(alert.context || {})
        .map(([key, value]) => `<tr><td><strong>${key}:</strong></td><td>${typeof value === 'object' ? JSON.stringify(value) : String(value)}</td></tr>`)
        .join('');

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: ${color}; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">${alert.title}</h1>
          </div>
          <div style="padding: 20px; background-color: #f9f9f9;">
            <p style="font-size: 16px; line-height: 1.5;">${alert.message}</p>
            ${contextHtml ? `
              <h3>Context:</h3>
              <table style="width: 100%; border-collapse: collapse;">
                ${contextHtml}
              </table>
            ` : ''}
            <hr style="margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">
              Sent at: ${new Date().toISOString()}<br>
              Level: ${alert.level.toUpperCase()}
            </p>
          </div>
        </div>
      `;

      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: this.recipients.join(', '),
        subject: `[${alert.level.toUpperCase()}] ${alert.title}`,
        html
      };

      await this.transporter.sendMail(mailOptions);
      logger.info('Email alert sent successfully', { recipients: this.recipients });
    } catch (error) {
      logger.error('Failed to send email alert', { error, alert });
    }
  }

  private getColorForLevel(level: string): string {
    switch (level) {
      case 'info': return '#0076D7';
      case 'warning': return '#FFA500';
      case 'error': return '#FF0000';
      case 'critical': return '#8B0000';
      default: return '#0076D7';
    }
  }
}

// Alert manager
class AlertManager {
  private channels: AlertChannel[] = [];
  private deduplicator = new AlertDeduplicator();

  constructor() {
    // Initialize channels based on environment variables
    if (process.env.TEAMS_WEBHOOK_URL) {
      this.channels.push(new TeamsAlertChannel(process.env.TEAMS_WEBHOOK_URL));
    }

    if (process.env.SLACK_WEBHOOK_URL) {
      this.channels.push(new SlackAlertChannel(process.env.SLACK_WEBHOOK_URL));
    }

    if (process.env.ALERT_EMAIL_RECIPIENTS) {
      const recipients = process.env.ALERT_EMAIL_RECIPIENTS.split(',');
      this.channels.push(new EmailAlertChannel(recipients));
    }

    // Clean up deduplicator every 10 minutes
    setInterval(() => this.deduplicator.cleanup(), 10 * 60 * 1000);
  }

  async sendAlert(alert: AlertConfig): Promise<void> {
    // Check deduplication
    const dedupKey = alert.deduplicationKey || `${alert.level}:${alert.title}`;
    if (!this.deduplicator.shouldSend(dedupKey)) {
      logger.debug('Alert deduplicated', { dedupKey, alert });
      return;
    }

    // Always log the alert
    logger.log(alert.level, `ALERT: ${alert.title}`, {
      message: alert.message,
      context: alert.context,
      tags: alert.tags
    });

    // Send to Sentry for critical errors
    if (alert.level === 'critical' || alert.level === 'error') {
      Sentry.captureMessage(alert.title, {
        level: alert.level === 'critical' ? 'fatal' : 'error',
        extra: {
          message: alert.message,
          context: alert.context,
          tags: alert.tags
        }
      });
    }

    // Send to all configured channels with retry logic
    const promises = this.channels.map(async (channel) => {
      const maxRetries = 3;
      let lastError: Error | null = null;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          await channel.send(alert);
          return; // Success, exit retry loop
        } catch (error) {
          lastError = error as Error;
          if (attempt < maxRetries) {
            // Exponential backoff: 1s, 2s, 4s
            const delay = Math.pow(2, attempt - 1) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
            logger.warn(`Retrying alert via ${channel.name} (attempt ${attempt + 1}/${maxRetries})`, { error });
          }
        }
      }
      
      // All retries failed
      logger.error(`Failed to send alert via ${channel.name} after ${maxRetries} attempts`, { 
        error: lastError,
        alert 
      });
    });

    await Promise.allSettled(promises);
  }

  // Convenience methods
  async info(title: string, message: string, context?: AlertContext): Promise<void> {
    await this.sendAlert({ level: 'info', title, message, context });
  }

  async warning(title: string, message: string, context?: AlertContext): Promise<void> {
    await this.sendAlert({ level: 'warning', title, message, context });
  }

  async error(title: string, message: string, context?: AlertContext): Promise<void> {
    await this.sendAlert({ level: 'error', title, message, context });
  }

  async critical(title: string, message: string, context?: AlertContext): Promise<void> {
    await this.sendAlert({ level: 'critical', title, message, context });
  }
}

// Export singleton instance
export const alertManager = new AlertManager();

// Export convenience functions
export const sendAlert = (alert: AlertConfig) => alertManager.sendAlert(alert);
export const sendInfo = (title: string, message: string, context?: AlertContext) => 
  alertManager.info(title, message, context);
export const sendWarning = (title: string, message: string, context?: AlertContext) => 
  alertManager.warning(title, message, context);
export const sendError = (title: string, message: string, context?: AlertContext) => 
  alertManager.error(title, message, context);
export const sendCritical = (title: string, message: string, context?: AlertContext) => 
  alertManager.critical(title, message, context); 