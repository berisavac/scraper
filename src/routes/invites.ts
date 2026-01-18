import { Hono } from 'hono';
import { db } from '../db/index.js';
import { inviteCodes, users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { jwtAuth } from '../middleware/jwtAuth.js';
import { adminAuth } from '../middleware/adminAuth.js';
import { generateInviteCode } from '../utils/inviteCode.js';

const invites = new Hono();

// POST /api/invites - Generate invite code (admin only)
invites.post('/', jwtAuth, adminAuth, async (c) => {
  try {
    const payload = c.get('jwtPayload');
    const userId = payload.sub;

    // Generate unique invite code
    const code = generateInviteCode();

    // Insert invite code into database
    const [newInvite] = await db
      .insert(inviteCodes)
      .values({
        code,
        createdBy: userId
      })
      .returning();

    return c.json(
      {
        inviteCode: {
          id: newInvite.id,
          code: newInvite.code,
          createdBy: newInvite.createdBy,
          createdAt: newInvite.createdAt
        }
      },
      201
    );
  } catch (error) {
    console.error('Generate invite code error:', error);

    return c.json(
      {
        error: 'Failed to generate invite code',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      500
    );
  }
});

// GET /api/invites/mine - List my invite codes (JWT)
invites.get('/mine', jwtAuth, async (c) => {
  try {
    const payload = c.get('jwtPayload');
    const userId = payload.sub;

    // Get status filter from query params (unused, used, all)
    const status = c.req.query('status') || 'all';

    // Build query based on status filter
    let query = db
      .select({
        id: inviteCodes.id,
        code: inviteCodes.code,
        createdBy: inviteCodes.createdBy,
        usedBy: inviteCodes.usedBy,
        usedByUsername: users.username,
        usedAt: inviteCodes.usedAt,
        createdAt: inviteCodes.createdAt
      })
      .from(inviteCodes)
      .leftJoin(users, eq(inviteCodes.usedBy, users.id))
      .where(eq(inviteCodes.createdBy, userId))
      .$dynamic();

    const results = await query;
    
    // Filter results based on status
    let filteredResults = results;
    if (status === 'unused') {
      filteredResults = results.filter((r) => r.usedBy === null);
    } else if (status === 'used') {
      filteredResults = results.filter((r) => r.usedBy !== null);
    }

    return c.json({
      inviteCodes: filteredResults
    });
  } catch (error) {
    console.error('List invite codes error:', error);

    return c.json(
      {
        error: 'Failed to list invite codes',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      500
    );
  }
});

// GET /api/invites/validate/:code - Validate invite code (public)
invites.get('/validate/:code', async (c) => {
  try {
    const code = c.req.param('code');

    // Query invite code
    const [invite] = await db
      .select()
      .from(inviteCodes)
      .where(eq(inviteCodes.code, code.trim()))
      .limit(1);

    // Check if code exists
    if (!invite) {
      return c.json({
        valid: false,
        reason: 'not_found'
      });
    }

    // Check if code has been used
    if (invite.usedBy !== null) {
      return c.json({
        valid: false,
        reason: 'already_used'
      });
    }

    // Code is valid
    return c.json({
      valid: true
    });
  } catch (error) {
    console.error('Validate invite code error:', error);

    return c.json(
      {
        error: 'Failed to validate invite code',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      500
    );
  }
});

export default invites;
