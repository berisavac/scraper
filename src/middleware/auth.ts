import type { Context, Next } from 'hono';

export async function authMiddleware(c: Context, next: Next) {
  // Skip auth for healthcheck
  if (c.req.path === '/' && c.req.method === 'GET') {
    return next();
  }

  const apiKey = process.env.API_KEY;
  const providedKey = c.req.header('x-api-key');

  if (!apiKey || providedKey !== apiKey) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  return next();
}
