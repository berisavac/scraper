import { Hono } from 'hono';
import { enrichMatch } from '../analysis/webEnrichment.js';

const matchNews = new Hono();

// GET /api/match-news?home=Manchester+United&away=Liverpool
matchNews.get('/', async (c) => {
  const home = c.req.query('home');
  const away = c.req.query('away');

  if (!home || !away) {
    return c.json({ error: 'Missing home or away parameter' }, 400);
  }

  const articles = await enrichMatch(home, away);

  return c.json({
    home,
    away,
    articles
  });
});

export default matchNews;
