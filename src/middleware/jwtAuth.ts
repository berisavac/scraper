import { jwt } from 'hono/jwt';
import type { Context, Next } from 'hono';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

const jwtMiddleware = jwt({
  secret: process.env.JWT_SECRET,
  alg: 'HS256',
});

// Custom wrapper to return 401 instead of 500 for JWT errors
export const jwtAuth = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');
  console.log('🔑 Auth header received:', authHeader);
  try {
    await jwtMiddleware(c, next);
  } catch (error) {
    console.error('JWT authentication error:', error);
    return c.json(
      {
        error: 'Unauthorized',
        message: error instanceof Error ? error.message : 'Invalid or missing token'
      },
      401
    );
  }
};
