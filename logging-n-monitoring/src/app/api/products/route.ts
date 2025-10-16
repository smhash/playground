import { NextRequest } from 'next/server';
import { withMonitoring } from '@/lib/withMonitoring';
import { getUserFromHeaders } from '@/auth/getUserFromHeaders';

const products = [
  { id: 1, name: 'Brooks Men\'s Ghost Max 2', price: 149.99, image: '/shoe1.png' },
  { id: 2, name: 'Brooks Men\'s Revel 7', price: 109.99, image: '/shoe2.png' },
  { id: 3, name: 'Brooks Men\'s Ghost 16', price: 139.99, image: '/shoe3.png' },
];

async function productsHandler(req: NextRequest) {
  const user = await getUserFromHeaders(req);
  // Pass user to withMonitoring via customLabels or context if needed
  (req as any).user = user; // TypeScript workaround for demo
  return Response.json(products);
}

export const GET = withMonitoring(productsHandler, {
  route: '/api/products',
  alertOnError: true,
  logRequestBody: false,
  logResponseBody: false,
}); 