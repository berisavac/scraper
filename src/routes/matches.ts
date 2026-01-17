import { Hono } from 'hono';
import pLimit from 'p-limit';
import { getMatches } from '../scrapers/matches.js';
import { getMatchDetails } from '../scrapers/details.js';
import { ALLOWED_LEAGUES, BLOCKED_COMPETITIONS } from '../types.js';
import type { MatchSummary } from '../types.js';
import {
  createJob,
  getJob,
  getAllJobs,
  updateJobStatus,
  updateJobProgress,
  cleanupOldJobs
} from '../job-manager.js';

function filterMatches(matches: MatchSummary[]): { filtered: MatchSummary[]; blockedCount: number } {
  // First: filter by allowed leagues
  const allowedMatches = matches.filter((match) => {
    const leagueLower = match.league.toLowerCase();

    return ALLOWED_LEAGUES.some((allowed) => {
      // Champions League can be under different countries, use partial match
      if (allowed === 'liga prvaka' || allowed === 'champions league') {
        return leagueLower.includes(allowed);
      }
      // For all other leagues, require EXACT match with country
      return leagueLower === allowed;
    });
  });

  // Then: filter out blocked competitions
  const filtered = allowedMatches.filter((match) => {
    const leagueLower = match.league.toLowerCase();
    return !BLOCKED_COMPETITIONS.some((blocked) => leagueLower.includes(blocked.toLowerCase()));
  });

  return {
    filtered,
    blockedCount: allowedMatches.length - filtered.length
  };
}
import {
  getMatchListCache,
  setCache,
  deleteCache,
  getCacheKey,
  clearAllMatchCache
} from '../cache.js';

const matches = new Hono();

// GET /api/matches - Lista mečeva za danas (sa cache)
matches.get('/', async (c) => {
  try {
    const cached = getMatchListCache();
    if (cached) {
      console.log('Returning cached matches');
      const { filtered, blockedCount } = filterMatches(cached.matches);
      if (blockedCount > 0) {
        console.log(`Blocked ${blockedCount} youth/reserve matches`);
      }
      return c.json({ ...cached, matches: filtered, fromCache: true });
    }

    console.log('Fetching matches...');
    const result = await getMatches();
    console.log(`Found ${result.matches.length} matches`);

    setCache(getCacheKey('matches'), result);

    const { filtered, blockedCount } = filterMatches(result.matches);
    if (blockedCount > 0) {
      console.log(`Blocked ${blockedCount} youth/reserve matches`);
    }

    return c.json({ ...result, matches: filtered, fromCache: false });
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

// GET /api/matches/refresh - Force refresh lista mečeva
matches.get('/refresh', async (c) => {
  try {
    console.log('Force refreshing matches...');
    deleteCache(getCacheKey('matches'));

    const result = await getMatches();
    console.log(`Found ${result.matches.length} matches`);

    setCache(getCacheKey('matches'), result);

    const { filtered, blockedCount } = filterMatches(result.matches);
    if (blockedCount > 0) {
      console.log(`Blocked ${blockedCount} youth/reserve matches`);
    }

    return c.json({ ...result, matches: filtered, fromCache: false });
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

// GET /api/matches/refresh-all - Briši cache i scrape sve
matches.get('/refresh-all', async (c) => {
  const limit = pLimit(3);

  try {
    const deletedCount = clearAllMatchCache();
    console.log(`Cleared ${deletedCount} cache entries`);

    console.log('Fetching fresh match list...');
    const matchList = await getMatches();
    setCache(getCacheKey('matches'), matchList);

    const { filtered: filteredMatches, blockedCount } = filterMatches(matchList.matches);

    if (blockedCount > 0) {
      console.log(`Blocked ${blockedCount} youth/reserve matches`);
    }
    console.log(`Scraping ${filteredMatches.length} matches from allowed leagues...`);

    const errors: string[] = [];
    const scrapedLeagues = new Set<string>();

    const tasks = filteredMatches.map((match) =>
      limit(async () => {
        try {
          console.log(`Scraping match: ${match.id} (${match.league})`);
          const details = await getMatchDetails(match.id);
          setCache(getCacheKey('match', match.id), details);
          scrapedLeagues.add(match.league);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`${match.id}: ${errorMsg}`);
          console.error(`Error scraping match ${match.id}:`, errorMsg);
        }
      })
    );

    await Promise.all(tasks);

    return c.json({
      deprecated: true,
      warning: 'This endpoint is deprecated. Use POST /api/matches/scrape-all instead.',
      matches: filteredMatches,
      totalScraped: filteredMatches.length - errors.length,
      leagues: Array.from(scrapedLeagues),
      errors,
      fromCache: false
    });
  } catch (error) {
    console.error('Error in /api/matches/refresh-all:', error);
    return c.json(
      {
        error: 'Failed to refresh all matches',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      500
    );
  }
});

// GET /api/matches/all - Scrape svih mečeva iz dozvoljenih liga
matches.get('/all', async (c) => {
  const limit = pLimit(3);

  try {
    let matchList = getMatchListCache();
    if (!matchList) {
      console.log('Fetching matches for all-leagues scrape...');
      matchList = await getMatches();
      setCache(getCacheKey('matches'), matchList);
    }

    const { filtered: filteredMatches, blockedCount } = filterMatches(matchList.matches);

    if (blockedCount > 0) {
      console.log(`Blocked ${blockedCount} youth/reserve matches`);
    }
    console.log(`Scraping ${filteredMatches.length} matches from allowed leagues...`);

    const errors: string[] = [];
    const scrapedLeagues = new Set<string>();

    const tasks = filteredMatches.map((match) =>
      limit(async () => {
        try {
          console.log(`Scraping match: ${match.id} (${match.league})`);
          const details = await getMatchDetails(match.id);
          setCache(getCacheKey('match', match.id), details);
          scrapedLeagues.add(match.league);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`${match.id}: ${errorMsg}`);
          console.error(`Error scraping match ${match.id}:`, errorMsg);
        }
      })
    );

    await Promise.all(tasks);

    return c.json({
      deprecated: true,
      warning: 'This endpoint is deprecated. Use POST /api/matches/scrape-all instead.',
      totalScraped: filteredMatches.length - errors.length,
      leagues: Array.from(scrapedLeagues),
      errors
    });
  } catch (error) {
    console.error('Error in /api/matches/all:', error);
    return c.json(
      {
        error: 'Failed to scrape all leagues',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      500
    );
  }
});

// Background scraping function
async function runScrapingJob(jobId: string, forceRefresh: boolean = false): Promise<void> {
  const limit = pLimit(3);

  try {
    updateJobStatus(jobId, 'running');

    // Get or fetch match list
    let matchList = forceRefresh ? null : getMatchListCache();
    if (!matchList) {
      if (forceRefresh) {
        clearAllMatchCache();
        console.log(`[Job ${jobId}] Cleared all cache entries`);
      }
      console.log(`[Job ${jobId}] Fetching match list...`);
      matchList = await getMatches();
      setCache(getCacheKey('matches'), matchList);
    }

    const { filtered: filteredMatches, blockedCount } = filterMatches(matchList.matches);
    if (blockedCount > 0) {
      console.log(`[Job ${jobId}] Blocked ${blockedCount} youth/reserve matches`);
    }

    const total = filteredMatches.length;
    console.log(`[Job ${jobId}] Scraping ${total} matches...`);
    updateJobProgress(jobId, 0, total);

    const errors: string[] = [];
    const scrapedLeagues = new Set<string>();
    let current = 0;

    const tasks = filteredMatches.map((match) =>
      limit(async () => {
        try {
          console.log(`[Job ${jobId}] Scraping match: ${match.id} (${match.league})`);
          const details = await getMatchDetails(match.id);
          setCache(getCacheKey('match', match.id), details);
          scrapedLeagues.add(match.league);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`${match.id}: ${errorMsg}`);
          console.error(`[Job ${jobId}] Error scraping match ${match.id}:`, errorMsg);
        } finally {
          current++;
          updateJobProgress(jobId, current, total);
        }
      })
    );

    await Promise.all(tasks);

    updateJobStatus(jobId, 'completed', {
      result: {
        totalScraped: filteredMatches.length - errors.length,
        leagues: Array.from(scrapedLeagues),
        errors
      }
    });

    console.log(`[Job ${jobId}] Completed: ${filteredMatches.length - errors.length}/${total} matches scraped`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Job ${jobId}] Failed:`, errorMsg);
    updateJobStatus(jobId, 'failed', { error: errorMsg });
  }
}

// POST /api/matches/scrape-all - Start background scraping job
matches.post('/scrape-all', async (c) => {
  // Clean up old jobs periodically
  cleanupOldJobs();

  const job = createJob();
  console.log(`Starting scrape job: ${job.id}`);

  // Fire-and-forget: start scraping in background
  runScrapingJob(job.id, false).catch((err) => {
    console.error(`Job ${job.id} failed unexpectedly:`, err);
  });

  return c.json({
    jobId: job.id,
    status: job.status
  });
});

// GET /api/matches/jobs/:jobId - Get job status
matches.get('/jobs/:jobId', async (c) => {
  const jobId = c.req.param('jobId');
  const job = getJob(jobId);

  if (!job) {
    return c.json({ error: 'Job not found' }, 404);
  }

  return c.json({
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    result: job.result,
    error: job.error,
    startedAt: job.startedAt.toISOString(),
    completedAt: job.completedAt?.toISOString()
  });
});

// GET /api/matches/jobs - List all jobs
matches.get('/jobs', async (c) => {
  const jobs = getAllJobs();

  return c.json({
    jobs: jobs.map((job) => ({
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      startedAt: job.startedAt.toISOString(),
      completedAt: job.completedAt?.toISOString()
    }))
  });
});

export default matches;
