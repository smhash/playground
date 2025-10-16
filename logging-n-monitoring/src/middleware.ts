import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Only monitor API routes
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const start = Date.now();
  const response = NextResponse.next();

  // Add response time header
  response.headers.set('X-Response-Time', `${Date.now() - start}ms`);
  
  // Preserve existing request ID or generate new one
  const existingRequestId = request.headers.get('x-request-id') || request.headers.get('X-Request-Id');
  const requestId = existingRequestId || crypto.randomUUID();
  response.headers.set('X-Request-ID', requestId);

  // Log API request (basic info for edge runtime)
  console.log(`[${new Date().toISOString()}] ${request.method} ${request.nextUrl.pathname} - ${requestId}`);

  // Note: User authentication is now handled by Kinde service
  // No need to inject mock user headers

  return response;
}

export const config = {
  matcher: ['/api/:path*']
}; 