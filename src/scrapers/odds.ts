import { chromium, Browser, Page } from 'playwright';
import { MozzartMatch, MozzartOdds } from '../types.js';

const MOZZART_URL = 'https://www.mozzartbet.com/sr/kladjenje/sport/1?date=today';
const TIMEOUT = 30000;
const MAX_RETRIES = 2;

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function closePopup(page: Page): Promise<void> {
  try {
    const popupSelectors = [
      'button[class*="close"]',
      'button[aria-label*="Close"]',
      'button[aria-label*="Zatvori"]',
      '.modal-close',
      '.popup-close',
      '[data-dismiss="modal"]',
      'button:has-text("Zatvori")',
      'button:has-text("Close")',
      '.btn-close',
      'button.close',
    ];

    for (const selector of popupSelectors) {
      try {
        const button = await page.$(selector);
        if (button && await button.isVisible()) {
          await button.click();
          console.log('[Mozzart] Closed popup with selector:', selector);
          await delay(500);
          return;
        }
      } catch {
        // Try next selector
      }
    }
  } catch {
    // Ignore popup errors
  }
}

async function acceptCookies(page: Page): Promise<void> {
  try {
    const cookieSelectors = [
      'button[id*="accept"]',
      'button[class*="accept"]',
      'button:has-text("Prihvati")',
      'button:has-text("Prihvatam")',
      'button:has-text("Accept")',
      'button:has-text("Accept All")',
      '#onetrust-accept-btn-handler',
      '.cookie-accept',
    ];

    for (const selector of cookieSelectors) {
      try {
        const button = await page.$(selector);
        if (button && await button.isVisible()) {
          await button.click();
          console.log('[Mozzart] Accepted cookies with selector:', selector);
          await delay(500);
          return;
        }
      } catch {
        // Try next selector
      }
    }
  } catch {
    // Ignore cookie errors
  }
}

async function scrapeMozzartOddsWithRetry(): Promise<MozzartMatch[]> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await scrapeMozzartOdds();
    } catch (error) {
      lastError = error as Error;
      console.error(`[Mozzart] Attempt ${attempt} failed:`, error);
      if (attempt < MAX_RETRIES) {
        await delay(2000);
      }
    }
  }

  throw lastError || new Error('Failed to scrape Mozzart odds');
}

async function scrapeMozzartOdds(): Promise<MozzartMatch[]> {
  let browser: Browser | null = null;

  try {
    console.log('[Mozzart] Launching browser...');
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page: Page = await browser.newPage();
    await page.setViewportSize({ width: 1920, height: 1080 });

    console.log('[Mozzart] Navigating to:', MOZZART_URL);
    await page.goto(MOZZART_URL, {
      waitUntil: 'domcontentloaded',
      timeout: TIMEOUT
    });

    await delay(5000);

    // Handle popups and cookies
    await closePopup(page);
    await acceptCookies(page);
    await delay(1000);

    // Scrape main odds (1X2, double chance, goals)
    console.log('[Mozzart] Scraping main odds...');
    const matches = await page.evaluate(() => {
      const results: Array<{
        homeTeam: string;
        awayTeam: string;
        time: string;
        odds: {
          home: string;
          draw: string;
          away: string;
          homeOrDraw: string;
          homeOrAway: string;
          drawOrAway: string;
          over2_5: string;
          under2_5: string;
          over3_5: string;
        };
      }> = [];

      // Find all match containers
      const matchContainers = document.querySelectorAll('.betting-match-as-is');
      console.log('Found match containers:', matchContainers.length);

      matchContainers.forEach((container) => {
        try {
          // Get team names
          const teamElements = container.querySelectorAll('.names p');
          if (teamElements.length < 2) return;

          const homeTeam = teamElements[0]?.textContent?.trim() || '';
          const awayTeam = teamElements[1]?.textContent?.trim() || '';

          if (!homeTeam || !awayTeam) return;

          // Get time
          const timeEl = container.querySelector('.time');
          const time = timeEl?.textContent?.trim() || '';

          // Get odds - typically 9 values: 1, X, 2, 1X, 12, X2, 2+, 0-2, 3+
          const oddsElements = container.querySelectorAll('.odds-holder .font-cond');
          const oddsValues: string[] = [];

          oddsElements.forEach((el) => {
            const value = el?.textContent?.trim() || '-';
            oddsValues.push(value);
          });

          // Map odds to positions (indexes may vary, but typical order is:)
          // 0: 1 (home), 1: X (draw), 2: 2 (away)
          // 3: 1X (home or draw), 4: 12 (home or away), 5: X2 (draw or away)
          // 6: 2+ (over 2.5), 7: 0-2 (under 2.5), 8: 3+ (over 3.5)
          const odds = {
            home: oddsValues[0] || '-',
            draw: oddsValues[1] || '-',
            away: oddsValues[2] || '-',
            homeOrDraw: oddsValues[3] || '-',
            homeOrAway: oddsValues[4] || '-',
            drawOrAway: oddsValues[5] || '-',
            over2_5: oddsValues[6] || '-',
            under2_5: oddsValues[7] || '-',
            over3_5: oddsValues[8] || '-',
          };

          results.push({
            homeTeam,
            awayTeam,
            time,
            odds
          });
        } catch (e) {
          console.error('Error parsing match:', e);
        }
      });

      return results;
    });

    console.log(`[Mozzart] Found ${matches.length} matches with main odds`);

    // Try to scrape GG/NG odds
    console.log('[Mozzart] Attempting to scrape GG/NG odds...');
    let ggNgOdds: Map<string, { gg: string; ng: string; gg3?: string; gg4?: string }> = new Map();

    try {
      // Look for the "Oba tima daju gol" tab and click it
      const ggTabSelectors = [
        'span.grouped-game:has-text("Oba tima daju gol")',
        'li span.grouped-game >> text="Oba tima daju gol"',
      ];

      let ggTabClicked = false;
      for (const selector of ggTabSelectors) {
        try {
          const tab = await page.$(selector);
          if (tab && await tab.isVisible()) {
            await tab.click();
            console.log('[Mozzart] Clicked GG/NG tab with selector:', selector);
            await delay(2000);
            ggTabClicked = true;
            break;
          }
        } catch {
          // Try next selector
        }
      }

      if (ggTabClicked) {
        // Aggressive scroll to load ALL matches
        console.log('[Mozzart] Scrolling to load all GG/NG matches...');

        let previousCount = 0;
        let sameCountIterations = 0;

        for (let i = 0; i < 20; i++) {
          // Scroll to bottom
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await delay(800);

          // Check how many matches are loaded
          const currentCount = await page.evaluate(() =>
            document.querySelectorAll('.betting-match-as-is').length
          );

          console.log(`[Mozzart] Scroll ${i + 1}: ${currentCount} matches loaded`);

          if (currentCount === previousCount) {
            sameCountIterations++;
            if (sameCountIterations >= 3) {
              console.log('[Mozzart] No more matches loading, stopping scroll');
              break;
            }
          } else {
            sameCountIterations = 0;
          }

          previousCount = currentCount;
        }

        // Scroll back to top
        await page.evaluate(() => window.scrollTo(0, 0));
        await delay(500);

        // Scrape GG/NG odds
        const ggMatches = await page.evaluate(() => {
          const results: Array<{
            homeTeam: string;
            awayTeam: string;
            gg: string;
            ng: string;
            gg3: string;
            gg4: string;
          }> = [];

          const matchContainers = document.querySelectorAll('.betting-match-as-is');

          matchContainers.forEach((container) => {
            try {
              const teamElements = container.querySelectorAll('.names p');
              if (teamElements.length < 2) return;

              const homeTeam = teamElements[0]?.textContent?.trim() || '';
              const awayTeam = teamElements[1]?.textContent?.trim() || '';

              if (!homeTeam || !awayTeam) return;

              // GG/NG odds: GG, NG, GG3+, GG4+
              const oddsElements = container.querySelectorAll('.odds-holder .font-cond');
              const gg = oddsElements[0]?.textContent?.trim() || '-';
              const ng = oddsElements[1]?.textContent?.trim() || '-';
              const gg3 = oddsElements[2]?.textContent?.trim() || '-';
              const gg4 = oddsElements[3]?.textContent?.trim() || '-';

              results.push({ homeTeam, awayTeam, gg, ng, gg3, gg4 });
            } catch {
              // Skip this match
            }
          });

          return results;
        });

        // Normalize function for fuzzy matching between tabs
        const normalize = (name: string): string =>
          name.toLowerCase()
            .replace(/\s+/g, ' ')
            .replace(/fc |afc |sc |fk |nk |rsc |kv |kvc |kaa |krc /gi, '')
            .trim();

        // Build a map for quick lookup with normalized keys
        ggMatches.forEach((m) => {
          const key = `${normalize(m.homeTeam)}|${normalize(m.awayTeam)}`;
          ggNgOdds.set(key, { gg: m.gg, ng: m.ng, gg3: m.gg3, gg4: m.gg4 });
        });

        console.log(`[Mozzart] Found GG/NG odds for ${ggNgOdds.size} matches`);
      } else {
        console.log('[Mozzart] GG/NG tab not found, skipping');
      }
    } catch (e) {
      console.log('[Mozzart] Could not scrape GG/NG odds:', e);
    }

    // Merge GG/NG odds with main odds using normalized matching
    const normalize = (name: string): string =>
      name.toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/fc |afc |sc |fk |nk |rsc |kv |kvc |kaa |krc /gi, '')
        .trim();

    const finalMatches: MozzartMatch[] = matches.map((m) => {
      const key = `${normalize(m.homeTeam)}|${normalize(m.awayTeam)}`;
      const ggNg = ggNgOdds.get(key);

      return {
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        time: m.time,
        odds: {
          ...m.odds,
          gg: ggNg?.gg,
          ng: ggNg?.ng,
          gg3: ggNg?.gg3,
          gg4: ggNg?.gg4
        }
      };
    });

    console.log(`[Mozzart] Scraping complete. Total matches: ${finalMatches.length}`);
    return finalMatches;

  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export async function getMozzartOdds(): Promise<MozzartMatch[]> {
  return await scrapeMozzartOddsWithRetry();
}
