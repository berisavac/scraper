import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { getMatches } from './scrapers/matches.js';
import { getMatchDetails } from './scrapers/details.js';
import {
  getMatchListCache,
  getMatchDetailsCache,
  setCache,
  deleteCache,
  getCacheKey
} from './cache.js';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors());

// Health check
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    message: 'Flashscore Scraper API',
    endpoints: {
      matches: 'GET /matches',
      matchesRefresh: 'GET /matches/refresh',
      matchDetails: 'GET /match/:id'
    }
  });
});

// GET /matches - Lista mečeva za danas (sa cache)
app.get('/matches', async (c) => {
  try {
    // Check cache first
    const cached = getMatchListCache();
    if (cached) {
      console.log('Returning cached matches');
      return c.json({ ...cached, fromCache: true });
    }

    console.log('Fetching matches...');
    const result = await getMatches();
    console.log(`Found ${result.matches.length} matches`);

    // Save to cache
    setCache(getCacheKey('matches'), result);

    return c.json({ ...result, fromCache: false });
  } catch (error) {
    console.error('Error fetching matches:', error);
    return c.json(
      {
        error: 'Failed to fetch matches',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      500
    );
  }
});

// GET /matches/refresh - Force refresh lista mečeva
app.get('/matches/refresh', async (c) => {
  try {
    console.log('Force refreshing matches...');
    deleteCache(getCacheKey('matches'));

    const result = await getMatches();
    console.log(`Found ${result.matches.length} matches`);

    setCache(getCacheKey('matches'), result);

    return c.json({ ...result, fromCache: false });
  } catch (error) {
    console.error('Error refreshing matches:', error);
    return c.json(
      {
        error: 'Failed to refresh matches',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      500
    );
  }
});

// GET /match/:id - Detalji utakmice (sa cache)
app.get('/match/:id', async (c) => {
  const matchId = c.req.param('id');

  if (!matchId) {
    return c.json({ error: 'Match ID is required' }, 400);
  }

  try {
    // Check cache first
    const cached = getMatchDetailsCache(matchId);
    if (cached) {
      console.log(`Returning cached match details for: ${matchId}`);
      return c.json({ ...cached, fromCache: true });
    }

    console.log(`Fetching match details for: ${matchId}`);
    const result = await getMatchDetails(matchId);

    // Save to cache
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

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: 'Not Found',
      message: 'The requested endpoint does not exist'
    },
    404
  );
});

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json(
    {
      error: 'Internal Server Error',
      message: err.message
    },
    500
  );
});

// Start server
const PORT = parseInt(process.env.PORT || '3000');

console.log(`Starting Flashscore Scraper API on port ${PORT}...`);

serve({
  fetch: app.fetch,
  port: PORT
}, (info) => {
  console.log(`Server running at http://localhost:${info.port}`);
});
