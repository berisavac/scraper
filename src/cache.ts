import { MatchListResponse, MatchDetailsResponse } from './types.js';

interface CacheEntry<T> {
  data: T;
  date: string;
}

const cache = new Map<string, CacheEntry<any>>();

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function isStale(cachedDate: string): boolean {
  return cachedDate !== getToday();
}

export function getMatchListCache(): MatchListResponse | null {
  const cacheKey = `matches-${getToday()}`;
  const cached = cache.get(cacheKey);

  if (!cached || isStale(cached.date)) {
    cache.delete(cacheKey);
    return null;
  }

  return cached.data;
}

export function getMatchDetailsCache(id: string): MatchDetailsResponse | null {
  const cacheKey = `match-${id}`;
  const cached = cache.get(cacheKey);

  if (!cached || isStale(cached.date)) {
    cache.delete(cacheKey);
    return null;
  }

  return cached.data;
}

export function setCache<T>(key: string, data: T): void {
  cache.set(key, {
    data,
    date: getToday()
  });
}

export function deleteCache(key: string): void {
  cache.delete(key);
}

export function clearAllMatchCache(): number {
  let deleted = 0;
  for (const key of cache.keys()) {
    if (key.startsWith('match-') || key.startsWith('matches-')) {
      cache.delete(key);
      deleted++;
    }
  }
  return deleted;
}

export function getCacheKey(type: 'matches' | 'match', id?: string): string {
  if (type === 'matches') {
    return `matches-${getToday()}`;
  }
  return `match-${id}`;
}
