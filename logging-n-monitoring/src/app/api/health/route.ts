import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { httpRequestTotal, httpRequestDuration } from '@/lib/metrics';
import os from 'os';

export async function GET(request: NextRequest) {
  const start = Date.now();
  
  try {
    // Real system stats
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    const uptime = os.uptime();

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime,
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || 'unknown',
      memory: {
        total: totalMem,
        free: freeMem,
        used: usedMem,
        usedPercent: Number(((usedMem / totalMem) * 100).toFixed(2)),
      },
      cpu: {
        count: cpus.length,
        model: cpus[0]?.model,
        speed: cpus[0]?.speed,
        loadAvg,
      },
    };

    const duration = Date.now() - start;
    
    // Log health check
    logger.info('Health check performed', {
      duration,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });

    // Record metrics
    httpRequestTotal.labels('GET', '/api/health', '200').inc();
    httpRequestDuration.labels('GET', '/api/health', '200').observe(duration / 1000);

    return NextResponse.json(health, { status: 200 });
  } catch (error) {
    const duration = Date.now() - start;
    
    logger.error('Health check failed', { error, duration });
    
    // Record error metrics
    httpRequestTotal.labels('GET', '/api/health', '500').inc();
    httpRequestDuration.labels('GET', '/api/health', '500').observe(duration / 1000);

    return NextResponse.json(
      { status: 'unhealthy', error: 'Health check failed' },
      { status: 500 }
    );
  }
} 