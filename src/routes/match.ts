import { Hono } from 'hono';
import { getMatchDetails } from '../scrapers/details.js';
import {
  getMatchDetailsCache,
  setCache,
  getCacheKey
} from '../cache.js';

const match = new Hono();

// GET /api/match/:id - Detalji utakmice (sa cache)
match.get('/:id', async (c) => {
  const matchId = c.req.param('id');

  console.log('matchId', matchId);

  if (!matchId) {
    return c.json({ error: 'Match ID is required' }, 400);
  }

  try {
    const cached = getMatchDetailsCache(matchId);
    console.log('cached', cached);
    if (cached) {
      console.log(`Returning cached match details for: ${matchId}`);
      return c.json({ ...cached, fromCache: true });
    }

    console.log(`Fetching match details for: ${matchId}`);
    const result = await getMatchDetails(matchId);

    setCache(getCacheKey('match', matchId), result);

    return c.json({ ...result, fromCache: false });
  } catch (error) {
    console.error(`Error fetching match ${matchId}:`, error);

    if (error instanceof Error && error.message.includes('not found')) {
      return c.json({ error: 'Match not found', matchId }, 404);
    }

    return c.json(
      {
        error: 'Failed to fetch match details',
        matchId,
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      500
    );
  }
});

export default match;
