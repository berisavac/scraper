import { Hono } from 'hono';
import { getMozzartOdds } from '../scrapers/odds.js';
import { getMatchListCache } from '../cache.js';
import {
  setOddsCache,
  getOddsCache,
  getOddsByMatchId,
  clearOddsCache
} from '../cache-odds.js';
import { matchTeams } from '../utils/teamMapping.js';
import type { MatchedOdds, MozzartMatch } from '../types.js';

const odds = new Hono();

// odds.get('/test-scrape', async (c) => {
//   const { getMozzartOdds } = await import('../scrapers/odds.js');
//   const odds = await getMozzartOdds();
//   return c.json({ total: odds.length, odds });
// });



// POST /scraper/odds - Scrape Mozzart odds and match with Flashscore cache
odds.post('/scraper/odds', async (c) => {
  try {
    console.log('[Odds] Starting Mozzart odds scraping...');

    // Get cached Flashscore matches
    const flashscoreData = getMatchListCache();
    if (!flashscoreData || flashscoreData.matches.length === 0) {
      return c.json({
        error: 'No Flashscore matches in cache',
        message: 'Please scrape Flashscore matches first via GET /api/matches'
      }, 400);
    }

    console.log(`[Odds] Found ${flashscoreData.matches.length} Flashscore matches in cache`);

    // Scrape Mozzart odds
    const mozzartMatches = await getMozzartOdds();
    console.log(`[Odds] Scraped ${mozzartMatches.length} Mozzart matches`);

    // Match Mozzart odds with Flashscore matches
    const matched: MatchedOdds[] = [];
    const unmatched: MozzartMatch[] = [];
    const scrapedAt = new Date().toISOString();

    for (const mozzMatch of mozzartMatches) {
      let foundMatch = false;

      for (const fsMatch of flashscoreData.matches) {
        const isMatch = matchTeams(
          fsMatch.homeTeam.name,
          fsMatch.awayTeam.name,
          mozzMatch.homeTeam,
          mozzMatch.awayTeam
        );

        if (isMatch) {
          const matchedOdds: MatchedOdds = {
            matchId: fsMatch.id,
            flashscoreHome: fsMatch.homeTeam.name,
            flashscoreAway: fsMatch.awayTeam.name,
            mozzartHome: mozzMatch.homeTeam,
            mozzartAway: mozzMatch.awayTeam,
            odds: mozzMatch.odds,
            scrapedAt
          };

          matched.push(matchedOdds);
          foundMatch = true;
          break;
        }
      }

      if (!foundMatch) {
        unmatched.push(mozzMatch);
      }
    }

    // Log unmatched teams for adding to TEAM_ALIASES
    if (unmatched.length > 0) {
      console.log('[Odds] Unmatched Mozzart teams:');
      unmatched.forEach((m) => {
        console.log(`  - ${m.homeTeam} vs ${m.awayTeam}`);
      });
    }

    console.log(`[Odds] Matching complete: ${matched.length} matched, ${unmatched.length} unmatched`);

    // Sync to remote or store locally
    const remoteApiUrl = process.env.REMOTE_API_URL;

    if (remoteApiUrl && matched.length > 0) {
      // Send to remote VPS
      try {
        const response = await fetch(`${remoteApiUrl}/api/import-odds`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.API_KEY || ''
          },
          body: JSON.stringify(matched)
        });

        if (!response.ok) {
          console.error(`[Odds] Failed to sync to remote: ${response.status}`);
        } else {
          console.log(`[Odds] Synced ${matched.length} odds to remote`);
        }
      } catch (syncError) {
        console.error('[Odds] Error syncing to remote:', syncError);
      }
    } else {
      // Local storage (when not using remote sync)
      for (const matchedOdds of matched) {
        setOddsCache(matchedOdds.matchId, {
          flashscoreHome: matchedOdds.flashscoreHome,
          flashscoreAway: matchedOdds.flashscoreAway,
          mozzartHome: matchedOdds.mozzartHome,
          mozzartAway: matchedOdds.mozzartAway,
          odds: matchedOdds.odds,
          scrapedAt: matchedOdds.scrapedAt
        });
      }
    }

    return c.json({
      success: true,
      matched,
      unmatched,
      totalMozzart: mozzartMatches.length,
      totalFlashscore: flashscoreData.matches.length,
      matchedCount: matched.length
    });
  } catch (error) {
    console.error('[Odds] Error scraping odds:', error);
    return c.json({
      error: 'Failed to scrape odds',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// POST /import-odds - Import odds from remote scraper (used by VPS)
odds.post('/import-odds', async (c) => {
  try {
    const oddsArray: MatchedOdds[] = await c.req.json();

    // Validacija: mora biti array
    if (!Array.isArray(oddsArray)) {
      return c.json({ error: 'Expected array of MatchedOdds' }, 400);
    }

    // Upis svakog entry-ja u cache
    for (const item of oddsArray) {
      setOddsCache(item.matchId, {
        flashscoreHome: item.flashscoreHome,
        flashscoreAway: item.flashscoreAway,
        mozzartHome: item.mozzartHome,
        mozzartAway: item.mozzartAway,
        odds: item.odds,
        scrapedAt: item.scrapedAt
      });
    }

    console.log(`[Odds] Imported ${oddsArray.length} odds from remote`);

    return c.json({
      success: true,
      imported: oddsArray.length
    });
  } catch (error) {
    console.error('[Odds] Error importing odds:', error);
    return c.json({
      error: 'Failed to import odds',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// GET / - Return all cached odds
odds.get('/', async (c) => {
  try {
    const cachedOdds = getOddsCache();
    return c.json({
      success: true,
      count: cachedOdds.length,
      odds: cachedOdds
    });
  } catch (error) {
    console.error('[Odds] Error getting cached odds:', error);
    return c.json({
      error: 'Failed to get cached odds',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// GET /:matchId - Return odds for specific match
odds.get('/:matchId', async (c) => {
  try {
    const matchId = c.req.param('matchId');
    const matchOdds = getOddsByMatchId(matchId);

    if (!matchOdds) {
      return c.json({
        error: 'Odds not found',
        message: `No odds found for match ID: ${matchId}`
      }, 404);
    }

    console.log('matchOdds', matchOdds);

    return c.json({
      success: true,
      ...matchOdds
    });
  } catch (error) {
    console.error('[Odds] Error getting match odds:', error);
    return c.json({
      error: 'Failed to get match odds',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// DELETE /clear - Clear all cached odds
odds.delete('/clear', async (c) => {
  try {
    const clearedCount = clearOddsCache();
    console.log(`[Odds] Cleared ${clearedCount} cached odds entries`);

    return c.json({
      success: true,
      message: `Cleared ${clearedCount} odds entries`
    });
  } catch (error) {
    console.error('[Odds] Error clearing odds cache:', error);
    return c.json({
      error: 'Failed to clear odds cache',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

export default odds;
