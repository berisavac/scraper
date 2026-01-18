import { Hono } from 'hono';
import { db, sqlite } from '../db/index.js';
import { tickets, ticketBets } from '../db/schema.js';
import { eq, and, gte, sql, desc, inArray } from 'drizzle-orm';
import { jwtAuth } from '../middleware/jwtAuth.js';

const ticketsRouter = new Hono();

// Apply JWT auth to all routes
ticketsRouter.use('/*', jwtAuth);

// POST / - Create Ticket
ticketsRouter.post('/', async (c) => {
  try {
    const userId = c.get('jwtPayload').sub;
    const body = await c.req.json();

    // Validation
    const { stake, totalOdds, bets } = body;


    if (!stake || !totalOdds || !bets) {
      return c.json({
        error: 'Missing required fields: stake, totalOdds, bets'
      }, 400);
    }

    if (typeof stake !== 'number' || stake <= 0) {
      return c.json({
        error: 'Invalid stake: must be a positive number'
      }, 400);
    }

    if (typeof totalOdds !== 'number' || totalOdds < 1.0) {
      return c.json({
        error: 'Invalid totalOdds: must be a number >= 1.0'
      }, 400);
    }

    if (!Array.isArray(bets) || bets.length === 0) {
      return c.json({
        error: 'Bets must be a non-empty array'
      }, 400);
    }

    // Validate each bet
    for (const bet of bets) {
      if (!bet.matchId || !bet.homeTeam || !bet.awayTeam || !bet.betType || !bet.odds) {
        return c.json({
          error: 'Each bet must have matchId, homeTeam, awayTeam, betType, and odds'
        }, 400);
      }

      if (typeof bet.odds !== 'number' || bet.odds < 1.0) {
        return c.json({
          error: 'Each bet odds must be a number >= 1.0'
        }, 400);
      }
    }

    // Optional: Verify totalOdds matches product of bet odds
    const calculatedOdds = bets.reduce((acc, bet) => acc * bet.odds, 1);
    if (Math.abs(calculatedOdds - totalOdds) > 0.01) {
      return c.json({
        error: `Total odds mismatch: expected ${calculatedOdds.toFixed(2)}, got ${totalOdds}`
      }, 400);
    }

    // Create ticket and bets in transaction
    const result = sqlite.transaction(() => {
      const [newTicket] = db
        .insert(tickets)
        .values({
          userId,
          totalOdds,
          stake,
          status: 'pending'
        })
        .returning()
        .all();

      // Insert bets one by one to avoid Drizzle bulk insert issues
      const insertedBets = [];
      for (const bet of bets) {
        const [inserted] = db
          .insert(ticketBets)
          .values({
            ticketId: newTicket.id,
            matchId: bet.matchId,
            homeTeam: bet.homeTeam,
            awayTeam: bet.awayTeam,
            betType: bet.betType,
            odds: bet.odds
          })
          .returning()
          .all();
        insertedBets.push(inserted);
      }

      return { ticket: newTicket, bets: insertedBets };
    })();



    return c.json(result, 201);
  } catch (error) {
    console.error('Create ticket error:', error);
    return c.json({
      error: 'Failed to create ticket',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// GET / - List User's Tickets
ticketsRouter.get('/', async (c) => {
  try {
    const userId = c.get('jwtPayload').sub;
    const period = c.req.query('period') || 'all';

    // Validate period
    const validPeriods = ['today', 'week', '7days', 'month', '30days', 'all'];
    if (!validPeriods.includes(period)) {
      return c.json({
        error: `Invalid period: must be one of ${validPeriods.join(', ')}`
      }, 400);
    }

    // Build where conditions
    const whereConditions = [eq(tickets.userId, userId)];

    // Add date filter based on period
    if (period !== 'all') {
      const now = new Date();
      let startDate: Date;

      if (period === 'today') {
        // Start of current day (00:00:00)
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (period === 'week' || period === '7days') {
        // Last 7 days from now
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (period === 'month' || period === '30days') {
        // Last 30 days from now
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else {
        startDate = new Date(0); // Should not reach here due to validation
      }

      whereConditions.push(gte(tickets.createdAt, startDate));
    }

    // Query tickets with betsCount subquery
    const userTickets = db
      .select({
        id: tickets.id,
        totalOdds: tickets.totalOdds,
        stake: tickets.stake,
        status: tickets.status,
        createdAt: tickets.createdAt,
        betsCount: sql<number>`(
          SELECT COUNT(*)
          FROM ${ticketBets}
          WHERE ${ticketBets.ticketId} = ${tickets.id}
        )`
      })
      .from(tickets)
      .where(and(...whereConditions))
      .orderBy(desc(tickets.createdAt))
      .all();

    // If there are tickets, fetch all bets for them
    if (userTickets.length > 0) {
      const ticketIds = userTickets.map(t => t.id);

      // Fetch all bet details for these tickets
      const betsResult = db
        .select()
        .from(ticketBets)
        .where(inArray(ticketBets.ticketId, ticketIds))
        .all();

      // Group bets by ticketId
      const betsByTicket: Record<number, typeof betsResult> = {};
      for (const bet of betsResult) {
        if (!betsByTicket[bet.ticketId]) {
          betsByTicket[bet.ticketId] = [];
        }
        betsByTicket[bet.ticketId].push(bet);
      }

      // Merge full bet data into tickets
      const ticketsWithBets = userTickets.map(ticket => ({
        ...ticket,
        bets: betsByTicket[ticket.id] || [],
      }));

      return c.json({ tickets: ticketsWithBets });
    }

    return c.json({ tickets: userTickets });
  } catch (error) {
    console.error('List tickets error:', error);
    return c.json({
      error: 'Failed to list tickets',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// GET /:id - Ticket Details
ticketsRouter.get('/:id', async (c) => {
  try {
    const userId = c.get('jwtPayload').sub;
    const ticketId = parseInt(c.req.param('id'));

    if (isNaN(ticketId)) {
      return c.json({
        error: 'Invalid ticket ID: must be a number'
      }, 400);
    }

    // Fetch ticket
    const [ticket] = db
      .select()
      .from(tickets)
      .where(eq(tickets.id, ticketId))
      .limit(1)
      .all();

    if (!ticket) {
      return c.json({ error: 'Ticket not found' }, 404);
    }

    // Ownership check
    if (ticket.userId !== userId) {
      return c.json({ error: 'Forbidden: You do not own this ticket' }, 403);
    }

    // Fetch associated bets
    const bets = db
      .select()
      .from(ticketBets)
      .where(eq(ticketBets.ticketId, ticketId))
      .all();

    return c.json({ ticket, bets });
  } catch (error) {
    console.error('Get ticket details error:', error);
    return c.json({
      error: 'Failed to get ticket details',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// PATCH /:id - Update Status
ticketsRouter.patch('/:id', async (c) => {
  try {
    const userId = c.get('jwtPayload').sub;
    const ticketId = parseInt(c.req.param('id'));

    if (isNaN(ticketId)) {
      return c.json({
        error: 'Invalid ticket ID: must be a number'
      }, 400);
    }

    const body = await c.req.json();
    const { status } = body;

    // Validate status
    const validStatuses = ['pending', 'won', 'lost'];
    if (!status || !validStatuses.includes(status)) {
      return c.json({
        error: `Invalid status: must be one of ${validStatuses.join(', ')}`
      }, 400);
    }

    // Fetch ticket for ownership check
    const [ticket] = db
      .select()
      .from(tickets)
      .where(eq(tickets.id, ticketId))
      .limit(1)
      .all();

    if (!ticket) {
      return c.json({ error: 'Ticket not found' }, 404);
    }

    // Ownership check
    if (ticket.userId !== userId) {
      return c.json({ error: 'Forbidden: You do not own this ticket' }, 403);
    }

    // Update ticket status
    const [updatedTicket] = db
      .update(tickets)
      .set({ status })
      .where(eq(tickets.id, ticketId))
      .returning()
      .all();

    return c.json({ ticket: updatedTicket });
  } catch (error) {
    console.error('Update ticket status error:', error);
    return c.json({
      error: 'Failed to update ticket status',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// DELETE /:id - Delete Ticket
ticketsRouter.delete('/:id', async (c) => {
  try {
    const userId = c.get('jwtPayload').sub;
    const ticketId = parseInt(c.req.param('id'));

    if (isNaN(ticketId)) {
      return c.json({
        error: 'Invalid ticket ID: must be a number'
      }, 400);
    }

    // Fetch ticket for ownership check
    const [ticket] = db
      .select()
      .from(tickets)
      .where(eq(tickets.id, ticketId))
      .limit(1)
      .all();

    if (!ticket) {
      return c.json({ error: 'Ticket not found' }, 404);
    }

    // Ownership check
    if (ticket.userId !== userId) {
      return c.json({ error: 'Forbidden: You do not own this ticket' }, 403);
    }

    // Delete ticket (CASCADE will auto-delete ticketBets)
    db.delete(tickets)
      .where(eq(tickets.id, ticketId))
      .run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Delete ticket error:', error);
    return c.json({
      error: 'Failed to delete ticket',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

export default ticketsRouter;
