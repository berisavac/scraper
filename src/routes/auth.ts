import { Hono } from 'hono';
import bcrypt from 'bcrypt';
import { sign } from 'hono/jwt';
import { db, sqlite } from '../db/index.js';
import { users, inviteCodes } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { jwtAuth } from '../middleware/jwtAuth.js';

const auth = new Hono();

// POST /api/auth/register - User registration
auth.post('/register', async (c) => {
  try {
    const body = await c.req.json();
    const { username, password, inviteCode } = body;

    // Validate input
    if (!username || !password) {
      return c.json({ error: 'Username and password are required' }, 400);
    }

    // Validate invite code is provided
    if (!inviteCode) {
      return c.json({ error: 'Invite code is required' }, 400);
    }

    // Validate username format (3-20 chars, alphanumeric + underscore)
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return c.json(
        {
          error:
            'Username must be 3-20 characters long and contain only letters, numbers, and underscores'
        },
        400
      );
    }

    // Validate password length
    if (password.length < 8) {
      return c.json(
        { error: 'Password must be at least 8 characters long' },
        400
      );
    }

    // Validate invite code exists and is not used
    const [invite] = await db
      .select()
      .from(inviteCodes)
      .where(eq(inviteCodes.code, inviteCode.trim()))
      .limit(1);

    if (!invite) {
      return c.json({ error: 'Invalid invite code' }, 400);
    }

    if (invite.usedBy !== null) {
      return c.json({ error: 'This invite code has already been used' }, 409);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Use transaction to atomically create user and mark invite code as used
    const result = sqlite.transaction(() => {
      // Insert user into database
      const [newUser] = db
        .insert(users)
        .values({
          username,
          passwordHash
        })
        .returning()
        .all();

      // Mark invite code as used
      db.update(inviteCodes)
        .set({
          usedBy: newUser.id,
          usedAt: new Date()
        })
        .where(eq(inviteCodes.id, invite.id))
        .run();

      return newUser;
    })();

    // Return user without password hash
    return c.json(
      {
        user: {
          id: result.id,
          username: result.username,
          createdAt: result.createdAt
        }
      },
      201
    );
  } catch (error) {
    console.error('Registration error:', error);

    // Check for unique constraint violation
    if (
      error instanceof Error &&
      error.message.includes('UNIQUE constraint failed')
    ) {
      return c.json({ error: 'Username already exists' }, 409);
    }

    return c.json(
      {
        error: 'Failed to register user',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      500
    );
  }
});

// POST /api/auth/login - User authentication
auth.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const { username, password } = body;

    // Validate input
    if (!username || !password) {
      return c.json({ error: 'Username and password are required' }, 400);
    }

    // Query user from database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);


    // Check if user exists and password is correct
    // Use generic error message to prevent user enumeration
    if (!user) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const payload = {
      sub: user.id,
      username: user.username,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 // 7 days
    };

    const token = await sign(payload, jwtSecret, 'HS256');

    // Return token and user info
    return c.json({
      token,
      user: {
        id: user.id,
        username: user.username
      }
    });
  } catch (error) {
    console.error('Login error:', error);

    return c.json(
      {
        error: 'Failed to login',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      500
    );
  }
});

// GET /api/auth/me - Get current user (protected)
auth.get('/me', jwtAuth, async (c) => {
  try {
    // Get JWT payload from context (set by jwtAuth middleware)
    const payload = c.get('jwtPayload');

    if (!payload || !payload.sub) {
      return c.json({ error: 'Invalid token payload' }, 401);
    }

    // Query fresh user data from database
    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        createdAt: users.createdAt
      })
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1);

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({ user });
  } catch (error) {
    console.error('Get current user error:', error);

    return c.json(
      {
        error: 'Failed to get user',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      500
    );
  }
});

export default auth;
