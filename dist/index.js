import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { authMiddleware } from './middleware/auth.js';
import matchesRoutes from './routes/matches.js';
import matchRoutes from './routes/match.js';
import analysisRoutes from './routes/analysis.js';
const app = new Hono();
// Middleware
app.use('*', logger());
app.use('*', cors());
app.use('*', authMiddleware);
// Health check
app.get('/', (c) => {
    return c.json({
        status: 'ok',
        message: 'Flashscore Scraper API',
        endpoints: {
            matches: 'GET /api/matches',
            matchesRefresh: 'GET /api/matches/refresh',
            matchesAll: 'GET /api/matches/all',
            matchDetails: 'GET /api/match/:id',
            analysisCache: 'GET/POST /api/analysis-cache/:matchId'
        }
    });
});
// Routes
app.route('/api/matches', matchesRoutes);
app.route('/api/match', matchRoutes);
app.route('/api/analysis-cache', analysisRoutes);
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
