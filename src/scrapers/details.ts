import { chromium, Browser, Page } from 'playwright';
import {
  MatchDetailsResponse,
  TeamInfo,
  StandingsInfo,
  FormMatch,
  H2HMatch
} from '../types.js';

const FLASHSCORE_BASE = 'https://www.flashscore.com';
const TIMEOUT = 30000;
const MAX_RETRIES = 2;

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function closeAllPopups(page: Page): Promise<void> {
  try {
    // Cookie consent
    const cookieSelectors = [
      '#onetrust-accept-btn-handler',
      'button[id*="accept"]',
      'button:has-text("Accept")',
    ];

    for (const selector of cookieSelectors) {
      try {
        const button = await page.$(selector);
        if (button && await button.isVisible()) {
          await button.click();
          await delay(500);
          break;
        }
      } catch { /* next */ }
    }

    // Close "I understand" popup
    await page.locator('button:has-text("I understand")').click().catch(() => {});
    await delay(300);

    // Close any other popups/modals
    await page.locator('button:has-text("Close")').click().catch(() => {});
    await page.locator('[class*="close"]').first().click().catch(() => {});

    // Press Escape to close remaining modals
    await page.keyboard.press('Escape');
    await delay(300);
  } catch {
    // Ignore popup errors
  }
}

async function clickTab(page: Page, tabName: string): Promise<boolean> {
  try {
    // Try link with text
    const selectors = [
      `a:has-text("${tabName}")`,
      `button:has-text("${tabName}")`,
      `[class*="tabs"] >> text="${tabName}"`,
      `[class*="subTabs"] >> text="${tabName}"`,
    ];

    for (const selector of selectors) {
      try {
        const tab = await page.$(selector);
        if (tab && await tab.isVisible()) {
          await tab.click();
          await delay(1500);
          return true;
        }
      } catch { /* next */ }
    }

    // Try text locator
    try {
      await page.getByText(tabName, { exact: false }).first().click();
      await delay(1500);
      return true;
    } catch { /* next */ }

    return false;
  } catch {
    return false;
  }
}

async function getMatchDetailsWithRetry(matchId: string): Promise<MatchDetailsResponse> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await scrapeMatchDetails(matchId);
    } catch (error) {
      lastError = error as Error;
      console.error(`Attempt ${attempt} failed:`, error);
      if (attempt < MAX_RETRIES) await delay(2000);
    }
  }

  throw lastError || new Error('Failed to scrape match details');
}

async function scrapeMatchDetails(matchId: string): Promise<MatchDetailsResponse> {
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page: Page = await browser.newPage();
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

    const matchUrl = `${FLASHSCORE_BASE}/match/${matchId}/`;
    await page.goto(matchUrl, { waitUntil: 'networkidle', timeout: TIMEOUT });
    await delay(2000);

    await closeAllPopups(page);
    await delay(1000);

    // Get basic info including team names
    const basicInfo = await scrapeBasicInfo(page);

    // Try STANDINGS tab (may not exist)
    const standings = await scrapeStandings(page, basicInfo.homeTeam.name, basicInfo.awayTeam.name);

    // H2H tab - get h2h and form data
    const { h2h, homeForm, awayForm } = await scrapeH2HData(
      page,
      basicInfo.homeTeam.name,
      basicInfo.awayTeam.name
    );

    return {
      id: matchId,
      ...basicInfo,
      standings,
      homeForm,
      awayForm,
      h2h
    };

  } finally {
    if (browser) await browser.close();
  }
}

async function scrapeBasicInfo(page: Page): Promise<{
  league: string;
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  time: string;
  date: string;
  score?: string;
}> {
  return await page.evaluate(() => {
    // League - skip, already available from /matches endpoint
    const league = '';

    // Home team
    const homeEl = document.querySelector('.duelParticipant__home .participant__participantName');
    const homeName = homeEl?.textContent?.trim() || '';
    const homeLogoEl = document.querySelector('.duelParticipant__home img') as HTMLImageElement;

    // Away team
    const awayEl = document.querySelector('.duelParticipant__away .participant__participantName');
    const awayName = awayEl?.textContent?.trim() || '';
    const awayLogoEl = document.querySelector('.duelParticipant__away img') as HTMLImageElement;

    // Time/Date
    const dateTimeEl = document.querySelector('.duelParticipant__startTime');
    const dateTime = dateTimeEl?.textContent?.trim() || '';

    // Score
    const scoreEl = document.querySelector('.detailScore__wrapper');
    let score: string | undefined;
    if (scoreEl) {
      const spans = scoreEl.querySelectorAll('span');
      if (spans.length >= 2) {
        score = `${spans[0]?.textContent?.trim() || ''}-${spans[spans.length-1]?.textContent?.trim() || ''}`;
      }
    }

    return {
      league,
      homeTeam: { name: homeName, logo: homeLogoEl?.src },
      awayTeam: { name: awayName, logo: awayLogoEl?.src },
      time: dateTime,
      date: new Date().toISOString().split('T')[0],
      score
    };
  });
}

async function scrapeStandings(page: Page, homeTeamName: string, awayTeamName: string): Promise<{
  home: StandingsInfo | null;
  away: StandingsInfo | null;
}> {
  try {
    // Check if STANDINGS tab exists
    const standingsTab = page.locator('button[data-testid="wcl-tab"]', { hasText: 'Standings' });

    const tabCount = await standingsTab.count();
    if (tabCount === 0) {
      return { home: null, away: null };
    }

    await standingsTab.first().click();
    await page.waitForTimeout(2000);

    // Scrape standings using specific selectors
    const rows = await page.locator('.ui-table__row').all();

    let homeStandings: StandingsInfo | null = null;
    let awayStandings: StandingsInfo | null = null;

    for (const row of rows) {
      try {
        const teamName = await row.locator('.tableCellParticipant__name').textContent() || '';
        const teamNameLower = teamName.toLowerCase().trim();
        const homeNameLower = homeTeamName.toLowerCase();
        const awayNameLower = awayTeamName.toLowerCase();

        // Check if this row is for home or away team
        const isHomeTeam = teamNameLower.includes(homeNameLower) || homeNameLower.includes(teamNameLower);
        const isAwayTeam = teamNameLower.includes(awayNameLower) || awayNameLower.includes(teamNameLower);

        if (!isHomeTeam && !isAwayTeam) continue;

        const position = parseInt(await row.locator('.tableCellRank').textContent() || '0');
        const cells = await row.locator('.table__cell--value').all();

        if (cells.length >= 7) {
          const mp = parseInt(await cells[0].textContent() || '0');
          const w = parseInt(await cells[1].textContent() || '0');
          const d = parseInt(await cells[2].textContent() || '0');
          const l = parseInt(await cells[3].textContent() || '0');
          const goals = await cells[4].textContent() || '0:0';
          const [goalsFor, goalsAgainst] = goals.split(':').map(n => parseInt(n) || 0);
          const pts = parseInt(await cells[6].textContent() || '0');

          const standings: StandingsInfo = {
            position,
            played: mp,
            won: w,
            drawn: d,
            lost: l,
            goalsFor,
            goalsAgainst,
            points: pts
          };

          if (isHomeTeam && !homeStandings) {
            homeStandings = standings;
          }
          if (isAwayTeam && !awayStandings) {
            awayStandings = standings;
          }
        }
      } catch {
        // Skip row on error
      }
    }

    return { home: homeStandings, away: awayStandings };
  } catch {
    return { home: null, away: null };
  }
}

async function scrapeH2HData(
  page: Page,
  homeTeamName: string,
  awayTeamName: string
): Promise<{
  h2h: H2HMatch[];
  homeForm: FormMatch[];
  awayForm: FormMatch[];
}> {
  const h2h: H2HMatch[] = [];
  const homeForm: FormMatch[] = [];
  const awayForm: FormMatch[] = [];

  try {
    // Click H2H tab
    await clickTab(page, 'H2H');
    await delay(1500);

    // Scrape LAST MATCHES section (h2h between teams - only matches with BOTH teams)
    const h2hMatches = await scrapeMatchRows(page, homeTeamName, awayTeamName);

    // Deduplicate by date + homeTeam + awayTeam + score
    const uniqueH2H = h2hMatches.filter((match, index, self) =>
      index === self.findIndex(m =>
        m.date === match.date &&
        m.homeTeam === match.homeTeam &&
        m.awayTeam === match.awayTeam &&
        m.score === match.score
      )
    );

    h2h.push(...uniqueH2H.slice(0, 10));

    // Get home team form - click "{TEAM} - HOME" sub-tab
    const homeTabName = `${homeTeamName.toUpperCase()} - HOME`;

    if (await clickTab(page, homeTabName) || await clickTab(page, `${homeTeamName} - HOME`)) {
      await delay(1500);
      const homeMatches = await scrapeFormRows(page, true);
      homeForm.push(...homeMatches.slice(0, 5));
    }

    // Get away team form - click "{TEAM} - AWAY" sub-tab
    const awayTabName = `${awayTeamName.toUpperCase()} - AWAY`;

    if (await clickTab(page, awayTabName) || await clickTab(page, `${awayTeamName} - AWAY`)) {
      await delay(1500);
      const awayMatches = await scrapeFormRows(page, false);
      awayForm.push(...awayMatches.slice(0, 5));
    }

  } catch {
    // H2H scraping failed silently
  }

  return { h2h, homeForm, awayForm };
}

async function scrapeMatchRows(page: Page, homeTeamName: string, awayTeamName: string): Promise<H2HMatch[]> {
  return await page.evaluate(({ homeName, awayName }: { homeName: string; awayName: string }) => {
    const results: H2HMatch[] = [];

    // Find all match rows in H2H section
    const rows = document.querySelectorAll('[class*="h2h__row"], [class*="rows__row"]');

    rows.forEach(row => {
      try {
        // Date element
        const dateEl = row.querySelector('[class*="date"]');
        const date = dateEl?.textContent?.trim() || '';

        // Teams
        const homeEl = row.querySelector('[class*="homeParticipant"], [class*="home"]');
        const awayEl = row.querySelector('[class*="awayParticipant"], [class*="away"]');

        const homeTeam = homeEl?.textContent?.trim() || '';
        const awayTeam = awayEl?.textContent?.trim() || '';

        // Score - may be in separate elements for home/away goals
        const scoreEl = row.querySelector('[class*="score"], [class*="result"]');
        let score = '';

        if (scoreEl) {
          // Try to find separate goal spans
          const goalSpans = scoreEl.querySelectorAll('span');
          if (goalSpans.length >= 2) {
            const homeGoals = goalSpans[0]?.textContent?.trim() || '';
            const awayGoals = goalSpans[goalSpans.length - 1]?.textContent?.trim() || '';
            score = `${homeGoals}-${awayGoals}`;
          } else {
            // Fallback: try to split the text
            const scoreText = scoreEl.textContent?.trim() || '';
            // If it's like "31", split in middle
            if (/^\d+$/.test(scoreText) && scoreText.length === 2) {
              score = `${scoreText[0]}-${scoreText[1]}`;
            } else if (/^\d+$/.test(scoreText) && scoreText.length > 2) {
              // Could be like "123" meaning 12-3 or 1-23, use middle split
              const mid = Math.floor(scoreText.length / 2);
              score = `${scoreText.slice(0, mid)}-${scoreText.slice(mid)}`;
            } else {
              score = scoreText;
            }
          }
        }

        // Filter: only include matches where BOTH teams are present
        const homeNameLower = homeName.toLowerCase();
        const awayNameLower = awayName.toLowerCase();
        const matchHomeLower = homeTeam.toLowerCase();
        const matchAwayLower = awayTeam.toLowerCase();

        const hasHomeTeam = matchHomeLower.includes(homeNameLower) || matchAwayLower.includes(homeNameLower);
        const hasAwayTeam = matchHomeLower.includes(awayNameLower) || matchAwayLower.includes(awayNameLower);

        if (homeTeam && awayTeam && score && hasHomeTeam && hasAwayTeam) {
          results.push({ date, homeTeam, awayTeam, score });
        }
      } catch { /* skip row */ }
    });

    return results;
  }, { homeName: homeTeamName, awayName: awayTeamName });
}

async function scrapeFormRows(page: Page, isHome: boolean): Promise<FormMatch[]> {
  return await page.evaluate((isHomeForm: boolean) => {
    const results: FormMatch[] = [];

    // Find match rows
    const rows = document.querySelectorAll('[class*="h2h__row"], [class*="rows__row"]');

    rows.forEach(row => {
      try {
        const dateEl = row.querySelector('[class*="date"]');
        const date = dateEl?.textContent?.trim() || '';

        const homeEl = row.querySelector('[class*="homeParticipant"], [class*="home"]');
        const awayEl = row.querySelector('[class*="awayParticipant"], [class*="away"]');

        const homeTeam = homeEl?.textContent?.trim() || '';
        const awayTeam = awayEl?.textContent?.trim() || '';

        // Score - handle separate elements for goals
        const scoreEl = row.querySelector('[class*="score"], [class*="result"]');
        let homeGoals = 0;
        let awayGoals = 0;

        if (scoreEl) {
          const goalSpans = scoreEl.querySelectorAll('span');
          if (goalSpans.length >= 2) {
            homeGoals = parseInt(goalSpans[0]?.textContent?.trim() || '0');
            awayGoals = parseInt(goalSpans[goalSpans.length - 1]?.textContent?.trim() || '0');
          } else {
            const scoreText = scoreEl.textContent?.trim() || '';
            const scoreMatch = scoreText.match(/(\d+)\s*[-:]\s*(\d+)/);
            if (scoreMatch) {
              homeGoals = parseInt(scoreMatch[1]);
              awayGoals = parseInt(scoreMatch[2]);
            } else if (/^\d{2}$/.test(scoreText)) {
              // "31" -> 3-1
              homeGoals = parseInt(scoreText[0]);
              awayGoals = parseInt(scoreText[1]);
            }
          }
        }

        // W/D/L indicator - look for colored indicator or text
        const wdlEl = row.querySelector('[class*="wdl"], [class*="form"], [class*="icon"]');
        const wdlClass = wdlEl?.className || '';
        const wdlText = wdlEl?.textContent?.trim().toUpperCase() || '';

        if (homeTeam && awayTeam && (homeGoals > 0 || awayGoals > 0 || homeGoals === awayGoals)) {
          // Determine outcome
          let outcome: 'W' | 'D' | 'L';

          if (wdlText === 'W' || wdlClass.includes('win')) outcome = 'W';
          else if (wdlText === 'D' || wdlClass.includes('draw')) outcome = 'D';
          else if (wdlText === 'L' || wdlClass.includes('loss') || wdlClass.includes('lose')) outcome = 'L';
          else {
            // Calculate from score (team is always home in HOME form, away in AWAY form)
            if (homeGoals === awayGoals) outcome = 'D';
            else if (isHomeForm ? homeGoals > awayGoals : awayGoals > homeGoals) outcome = 'W';
            else outcome = 'L';
          }

          results.push({
            date,
            opponent: isHomeForm ? awayTeam : homeTeam,
            result: `${homeGoals}-${awayGoals}`,
            outcome,
            isHome: isHomeForm
          });
        }
      } catch { /* skip row */ }
    });

    return results;
  }, isHome);
}

export async function getMatchDetails(matchId: string): Promise<MatchDetailsResponse> {
  return await getMatchDetailsWithRetry(matchId);
}
