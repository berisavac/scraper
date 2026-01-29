import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { authMiddleware } from './middleware/auth.js';
import matchesRoutes from './routes/matches.js';
import matchRoutes from './routes/match.js';
import analysisRoutes from './routes/analysis.js';
import matchNewsRoutes from './routes/matchNews.js';
import authRoutes from './routes/auth.js';
import inviteRoutes from './routes/invites.js';
import ticketsRoutes from './routes/tickets.js';
import oddsRoutes from './routes/odds.js';
const app = new Hono();
// Middleware
app.use('*', logger());
app.use('*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
    exposeHeaders: ['Content-Length'],
    credentials: true,
}));
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
            analysisCache: 'GET/POST /api/analysis-cache/:matchId',
            matchNews: 'GET /api/match-news?home=X&away=Y',
            authRegister: 'POST /api/auth/register',
            authLogin: 'POST /api/auth/login',
            authMe: 'GET /api/auth/me (JWT protected)',
            invitesGenerate: 'POST /api/invites (JWT + Admin)',
            invitesMine: 'GET /api/invites/mine (JWT)',
            invitesValidate: 'GET /api/invites/validate/:code (public)',
            ticketsCreate: 'POST /api/tickets (JWT)',
            ticketsList: 'GET /api/tickets?period=today|week|month|all (JWT)',
            ticketDetails: 'GET /api/tickets/:id (JWT)',
            ticketUpdate: 'PATCH /api/tickets/:id (JWT)',
            ticketDelete: 'DELETE /api/tickets/:id (JWT)',
            oddsScrape: 'POST /api/scraper/odds (scrape Mozzart + match with Flashscore)',
            oddsAll: 'GET /api/odds (all cached odds)',
            oddsById: 'GET /api/odds/:matchId (odds for specific match)',
            oddsClear: 'DELETE /api/odds/clear (clear odds cache)'
        }
    });
});
// Routes
app.route('/api/matches', matchesRoutes);
app.route('/api/match', matchRoutes);
app.route('/api/analysis-cache', analysisRoutes);
app.route('/api/match-news', matchNewsRoutes);
app.route('/api/auth', authRoutes);
app.route('/api/invites', inviteRoutes);
app.route('/api/tickets', ticketsRoutes);
app.route('/api/odds', oddsRoutes);
app.route('/api', oddsRoutes);
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
