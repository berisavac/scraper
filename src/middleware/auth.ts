import type { Context, Next } from 'hono';

export async function authMiddleware(c: Context, next: Next) {
  // Skip auth for healthcheck
  if (c.req.path === '/' && c.req.method === 'GET') {
    return next();
  }

  // Skip auth for public auth endpoints
  if (c.req.path === '/api/auth/register' && c.req.method === 'POST') {
    return next();
  }
  if (c.req.path === '/api/auth/login' && c.req.method === 'POST') {
    return next();
  }
  // Skip API key auth for JWT-protected endpoints
  if (c.req.path === '/api/auth/me' && c.req.method === 'GET') {
    return next();
  }
  // Skip API key auth for invite endpoints (they use JWT)
  if (c.req.path.startsWith('/api/invites')) {
    return next();
  }
  // Skip API key auth for tickets endpoints (they use JWT)
  if (c.req.path.startsWith('/api/tickets')) {
    return next();
  }

  const apiKey = process.env.API_KEY;
  const providedKey = c.req.header('x-api-key');

  if (!apiKey || providedKey !== apiKey) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  return next();
}
