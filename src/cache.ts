import { MatchListResponse, MatchDetailsResponse } from './types.js';

interface CacheEntry<T> {
  data: T;
  date: string;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function parseMatchTime(timeStr: string): number {
  // Format: "05.01.2026 17:00" or just "17:00"
  if (!timeStr) return Date.now();

  try {
    if (timeStr.includes('.')) {
      const [datePart, timePart] = timeStr.split(' ');
      const [day, month, year] = datePart.split('.');
      const [hours, minutes] = (timePart || '00:00').split(':');
      return new Date(+year, +month - 1, +day, +hours, +minutes).getTime();
    } else if (timeStr.includes(':')) {
      // Just time, assume today
      const [hours, minutes] = timeStr.split(':');
      const today = new Date();
      today.setHours(+hours, +minutes, 0, 0);
      return today.getTime();
    }
  } catch {
    // Fallback
  }
  return Date.now();
}

function isStale(cachedDate: string): boolean {
  return cachedDate !== getToday();
}

function shouldRefreshMatchList(
  cachedData: MatchListResponse,
  cacheTimestamp: number
): boolean {
  const now = Date.now();
  const cacheAge = now - cacheTimestamp;

  // Proveri da li je bilo koji meč počeo POSLE keširanja
  for (const match of cachedData.matches) {
    const matchStart = parseMatchTime(match.time);

    // Meč počeo posle keširanja = treba refresh
    if (matchStart < now && matchStart > cacheTimestamp) {
      return true;
    }
  }

  // Fallback: ako je prošlo više od 30 min, osveži svakako
  return cacheAge > 30 * 60 * 1000;
}

export function getMatchListCache(): MatchListResponse | null {
  const cacheKey = `matches-${getToday()}`;
  console.log('cacheKey', cacheKey);
  const cached = cache.get(cacheKey);
  console.log('cached', cached);

  if (!cached || isStale(cached.date)) {
    cache.delete(cacheKey);
    return null;
  }

  if (shouldRefreshMatchList(cached.data, cached.timestamp)) {
    cache.delete(cacheKey);
    return null;
  }

  return cached.data;
}

function getMatchDetailsTTL(matchTime: string, score: string | undefined): number {
  const now = Date.now();
  const matchStart = parseMatchTime(matchTime);

  // Nije počeo - keširaj do početka meča
  if (now < matchStart) {
    return matchStart - now;
  }

  // Završen (ima score i prošlo 2h+ od početka)
  if (score && now > matchStart + 2 * 60 * 60 * 1000) {
    return 60 * 60 * 1000; // 1 sat
  }

  // Live - kratki TTL
  return 15 * 60 * 1000; // 15 min
}

export function getMatchDetailsCache(id: string): MatchDetailsResponse | null {
  const cacheKey = `match-${id}`;
  const cached = cache.get(cacheKey);

  if (!cached || isStale(cached.date)) {
    cache.delete(cacheKey);
    return null;
  }

  const ttl = getMatchDetailsTTL(cached.data.time, cached.data.score);

  if (Date.now() - cached.timestamp > ttl) {
    cache.delete(cacheKey);
    return null;
  }

  return cached.data;
}

export function setCache<T>(key: string, data: T): void {
  cache.set(key, {
    data,
    date: getToday(),
    timestamp: Date.now()
  });
}

export function deleteCache(key: string): void {
  cache.delete(key);
}

export function getCacheKey(type: 'matches' | 'match', id?: string): string {
  if (type === 'matches') {
    return `matches-${getToday()}`;
  }
  return `match-${id}`;
}
