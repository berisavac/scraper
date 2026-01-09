const ALLOWED_DOMAINS = [
  'skysports.com',
  'bbc.com/sport',
  'espn.com',
  'goal.com',
  'sportsmole.co.uk',
  'football-italia.net',
  'sempremilan.com',
  'thisisanfield.com'
];

export async function searchLinks(query: string): Promise<string[]> {
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    console.error('[searchLinks] TAVILY_API_KEY not set');
    return [];
  }

  try {
    console.log(`[searchLinks] Searching Tavily for: ${query}`);

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query: query,
        search_depth: 'basic',
        include_domains: ALLOWED_DOMAINS,
        max_results: 5
      })
    });

    if (!response.ok) {
      throw new Error(`Tavily API error: ${response.status}`);
    }

    const data = await response.json();
    const links = data.results?.map((r: any) => r.url) || [];

    console.log(`[searchLinks] Found ${links.length} links`);
    links.forEach((link: string, i: number) =>
      console.log(`[searchLinks]   ${i + 1}. ${link}`)
    );

    return links;
  } catch (error) {
    console.error('[searchLinks] FAILED:', error);
    return [];
  }
}
