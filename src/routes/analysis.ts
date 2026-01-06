import { Hono } from 'hono';
import { getAnalysisCache, setAnalysisCache } from '../analysis-cache.js';

const analysis = new Hono();

// GET /api/analysis-cache/:matchId
analysis.get('/:matchId', (c) => {
  const matchId = c.req.param('matchId');
  const cached = getAnalysisCache(matchId);

  if (!cached) {
    return c.json({ error: 'Not found' }, 404);
  }

  return c.json(cached);
});

// POST /api/analysis-cache/:matchId
analysis.post('/:matchId', async (c) => {
  const matchId = c.req.param('matchId');
  const body = await c.req.json<{ steps: Array<{ step: string; content: string }> }>();

  setAnalysisCache(matchId, body.steps);

  return c.json({ ok: true });
});

export default analysis;
