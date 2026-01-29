import { searchLinks } from '../scrapers/webSearch.js';
import { scrapeArticle } from '../scrapers/articleScraper.js';

export async function enrichMatch(homeTeam: string, awayTeam: string): Promise<string> {
  const now = new Date();
  const monthYear = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const query = `${homeTeam} vs ${awayTeam} preview prediction team news ${monthYear}`;

  const urls = await searchLinks(query);

  if (urls.length === 0) {
    return '';
  }

  const urlsToScrape = urls.slice(0, 3);
  const articles = await Promise.all(urlsToScrape.map(url => scrapeArticle(url)));

  const validArticles = articles.filter(article => article !== null);

  if (validArticles.length === 0) {
    return '';
  }

  const formatted = validArticles.map(article => `## ${article.title}
Source: ${article.url}

${article.content}

---`);

  return formatted.join('\n\n');
}
