import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { getMatches } from './scrapers/matches.js';
import { getMatchDetails } from './scrapers/details.js';
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
            matchDetails: 'GET /match/:id'
        }
    });
});
// GET /matches - Lista mečeva za danas
app.get('/matches', async (c) => {
    try {
        console.log('Fetching matches...');
        const result = await getMatches();
        console.log(`Found ${result.matches.length} matches`);
        return c.json(result);
    }
    catch (error) {
        console.error('Error fetching matches:', error);
        return c.json({
            error: 'Failed to fetch matches',
            message: error instanceof Error ? error.message : 'Unknown error'
        }, 500);
    }
});
// GET /match/:id - Detalji utakmice
app.get('/match/:id', async (c) => {
    const matchId = c.req.param('id');
    if (!matchId) {
        return c.json({ error: 'Match ID is required' }, 400);
    }
    try {
        console.log(`Fetching match details for: ${matchId}`);
        const result = await getMatchDetails(matchId);
        return c.json(result);
    }
    catch (error) {
        console.error(`Error fetching match ${matchId}:`, error);
        // Check if it's a "not found" type error
        if (error instanceof Error && error.message.includes('not found')) {
            return c.json({
                error: 'Match not found',
                matchId
            }, 404);
        }
        return c.json({
            error: 'Failed to fetch match details',
            matchId,
            message: error instanceof Error ? error.message : 'Unknown error'
        }, 500);
    }
});
// 404 handler
app.notFound((c) => {
    return c.json({
        error: 'Not Found',
        message: 'The requested endpoint does not exist'
    }, 404);
});
// Error handler
app.onError((err, c) => {
    console.error('Unhandled error:', err);
    return c.json({
        error: 'Internal Server Error',
        message: err.message
    }, 500);
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
