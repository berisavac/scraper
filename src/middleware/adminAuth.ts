import { Context, Next } from 'hono';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export const adminAuth = async (c: Context, next: Next) => {
  const payload = c.get('jwtPayload');

  if (!payload || !payload.sub) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, payload.sub))
    .limit(1);

  if (!user || !user.isAdmin) {
    return c.json({ error: 'Forbidden: Admin access required' }, 403);
  }

  await next();
};
