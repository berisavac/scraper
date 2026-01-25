import { MatchedOdds, MozzartOdds } from './types.js';

interface OddsCacheEntry {
  matchId: string;
  flashscoreHome: string;
  flashscoreAway: string;
  mozzartHome: string;
  mozzartAway: string;
  odds: MozzartOdds;
  scrapedAt: string;
}

// In-memory cache - no TTL, manual clear only
const oddsCache = new Map<string, OddsCacheEntry>();

/**
 * Set odds cache entry for a match
 */
export function setOddsCache(matchId: string, entry: Omit<OddsCacheEntry, 'matchId'>): void {
  oddsCache.set(matchId, {
    matchId,
    ...entry
  });
}

/**
 * Get all cached odds
 */
export function getOddsCache(): MatchedOdds[] {
  return Array.from(oddsCache.values()).map(entry => ({
    matchId: entry.matchId,
    flashscoreHome: entry.flashscoreHome,
    flashscoreAway: entry.flashscoreAway,
    mozzartHome: entry.mozzartHome,
    mozzartAway: entry.mozzartAway,
    odds: entry.odds,
    scrapedAt: entry.scrapedAt
  }));
}

/**
 * Get odds for a specific match
 */
export function getOddsByMatchId(matchId: string): MatchedOdds | null {
  const entry = oddsCache.get(matchId);
  if (!entry) return null;

  return {
    matchId: entry.matchId,
    flashscoreHome: entry.flashscoreHome,
    flashscoreAway: entry.flashscoreAway,
    mozzartHome: entry.mozzartHome,
    mozzartAway: entry.mozzartAway,
    odds: entry.odds,
    scrapedAt: entry.scrapedAt
  };
}

/**
 * Clear all odds cache
 * @returns number of entries cleared
 */
export function clearOddsCache(): number {
  const count = oddsCache.size;
  oddsCache.clear();
  return count;
}

/**
 * Get count of cached odds
 */
export function getOddsCacheCount(): number {
  return oddsCache.size;
}
