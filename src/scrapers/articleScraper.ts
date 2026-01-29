import { getPage } from '../browser-manager.js';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

interface Article {
  title: string;
  content: string;
  url: string;
}

export async function scrapeArticle(url: string): Promise<Article | null> {
  let page = null;

  try {
    page = await getPage();
    await page.goto(url, { timeout: 30000 });
    await page.waitForLoadState('domcontentloaded');

    const html = await page.content();
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      return null;
    }

    return {
      title: article.title || '',
      content: (article.textContent || '').slice(0, 5000),
      url: url
    };
  } catch (error) {
    console.error('Article scrape error:', error);
    return null;
  } finally {
    if (page) await page.close();
  }
}
