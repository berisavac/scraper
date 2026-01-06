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
