interface AnalysisCacheEntry {
  createdAt: string;
  steps: Array<{ step: string; content: string }>;
}

const analysisCache = new Map<string, AnalysisCacheEntry>();

export function getAnalysisCache(matchId: string): AnalysisCacheEntry | null {
  return analysisCache.get(matchId) || null;
}

export function setAnalysisCache(
  matchId: string,
  steps: Array<{ step: string; content: string }>
): void {
  analysisCache.set(matchId, {
    createdAt: new Date().toISOString(),
    steps
  });
}

export function deleteAnalysisCache(matchId: string): boolean {
  return analysisCache.delete(matchId);
}

export function clearAllAnalysisCache(): number {
  const count = analysisCache.size;
  analysisCache.clear();
  return count;
}

export function getAnalysisCacheStats(): { totalCached: number; matchIds: string[] } {
  return {
    totalCached: analysisCache.size,
    matchIds: Array.from(analysisCache.keys())
  };
}
