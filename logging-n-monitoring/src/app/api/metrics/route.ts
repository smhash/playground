import { NextRequest, NextResponse } from 'next/server';
import { getMetrics } from '@/lib/metrics';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const metrics = await getMetrics();
    
    logger.info('Metrics endpoint accessed', {
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });

    return new NextResponse(metrics, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'Cache-Control': 'no-cache'
      }
    });
  } catch (error) {
    logger.error('Failed to get metrics', { error });
    return NextResponse.json(
      { error: 'Failed to get metrics' },
      { status: 500 }
    );
  }
} 