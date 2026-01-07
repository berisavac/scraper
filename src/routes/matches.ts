import { Hono } from 'hono';
import pLimit from 'p-limit';
import { getMatches } from '../scrapers/matches.js';
import { getMatchDetails } from '../scrapers/details.js';
import { ALLOWED_LEAGUES, BLOCKED_COMPETITIONS } from '../types.js';
import type { MatchSummary } from '../types.js';

function filterMatches(matches: MatchSummary[]): { filtered: MatchSummary[]; blockedCount: number } {
  // First: filter by allowed leagues
  const allowedMatches = matches.filter((match) =>
    ALLOWED_LEAGUES.some((league) =>
      match.league.toLowerCase().includes(league.toLowerCase())
    )
  );

  // Then: filter out blocked competitions
  const filtered = allowedMatches.filter((match) => {
    const leagueLower = match.league.toLowerCase();
    return !BLOCKED_COMPETITIONS.some((blocked) => leagueLower.includes(blocked));
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

export default matches;
