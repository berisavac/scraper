import { Hono } from 'hono';
import {
  getAnalysisCache,
  setAnalysisCache,
  deleteAnalysisCache,
  clearAllAnalysisCache,
  getAnalysisCacheStats
} from '../analysis-cache.js';

const analysis = new Hono();

// GET /api/analysis-cache/stats
analysis.get('/stats', (c) => {
  const stats = getAnalysisCacheStats();
  return c.json({ success: true, data: stats });
});

// DELETE /api/analysis-cache/all
analysis.delete('/all', (c) => {
  const deletedCount = clearAllAnalysisCache();
  console.log(`[Analysis Cache] Cleared all cache: ${deletedCount} entries`);
  return c.json({
    success: true,
    message: 'Cleared all analysis cache',
    deletedCount
  });
});

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

// DELETE /api/analysis-cache/:matchId
analysis.delete('/:matchId', (c) => {
  const matchId = c.req.param('matchId');
  const deleted = deleteAnalysisCache(matchId);

  console.log(`[Analysis Cache] Delete ${matchId}: ${deleted ? 'success' : 'not found'}`);

  return c.json({
    success: true,
    message: deleted
      ? `Cache cleared for match ${matchId}`
      : `No cache found for match ${matchId}`,
    matchId,
    existed: deleted
  });
});

export default analysis;
