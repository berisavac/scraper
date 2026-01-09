import { searchLinks } from '../scrapers/webSearch';
import { scrapeArticle } from '../scrapers/articleScraper';

export async function enrichMatch(homeTeam: string, awayTeam: string): Promise<string> {
  const query = `${homeTeam} vs ${awayTeam} preview team news injuries`;

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
