import { Hono } from 'hono';
import pLimit from 'p-limit';
import { getMatches } from '../scrapers/matches.js';
import { getMatchDetails } from '../scrapers/details.js';
import { ALLOWED_LEAGUES } from '../types.js';
import {
  getMatchListCache,
  setCache,
  deleteCache,
  getCacheKey
} from '../cache.js';

const matches = new Hono();

// GET /api/matches - Lista mečeva za danas (sa cache)
matches.get('/', async (c) => {
  try {
    const cached = getMatchListCache();
    if (cached) {
      console.log('Returning cached matches');
      return c.json({ ...cached, fromCache: true });
    }

    console.log('Fetching matches...');
    const result = await getMatches();
    console.log(`Found ${result.matches.length} matches`);

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

// GET /api/matches/refresh - Force refresh lista mečeva
matches.get('/refresh', async (c) => {
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

    const filteredMatches = matchList.matches.filter((match) =>
      ALLOWED_LEAGUES.some((league) =>
        match.league.toLowerCase().includes(league.toLowerCase())
      )
    );

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
