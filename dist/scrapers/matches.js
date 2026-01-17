import { chromium } from 'playwright';
import { ALLOWED_LEAGUES } from '../types.js';
const FLASHSCORE_URL = 'https://www.flashscore.com/';
const TIMEOUT = 30000;
const MAX_RETRIES = 2;
async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function extractMatchIdFromUrl(url) {
    // Extract mid= query param
    const midMatch = url.match(/mid=([^&]+)/);
    if (midMatch)
        return midMatch[1];
    // Fallback: extract from path
    const pathMatch = url.match(/\/match\/([^/]+)/);
    if (pathMatch)
        return pathMatch[1];
    return '';
}
async function closeCookiePopup(page) {
    try {
        const cookieSelectors = [
            '#onetrust-accept-btn-handler',
            'button[id*="accept"]',
            'button[class*="accept"]',
            '[aria-label*="Accept"]',
            '[aria-label*="Agree"]',
            'button:has-text("Accept")',
            'button:has-text("I Accept")',
            'button:has-text("Accept All")',
            'button:has-text("Agree")',
            '.onetrust-close-btn-handler',
        ];
        for (const selector of cookieSelectors) {
            try {
                const button = await page.$(selector);
                if (button && await button.isVisible()) {
                    await button.click();
                    await delay(1000);
                    return;
                }
            }
            catch {
                // Try next
            }
        }
    }
    catch {
        // Ignore cookie popup errors
    }
}
async function scrapeMatchesWithRetry() {
    let lastError = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            return await scrapeMatches();
        }
        catch (error) {
            lastError = error;
            console.error(`Attempt ${attempt} failed:`, error);
            if (attempt < MAX_RETRIES) {
                await delay(2000);
            }
        }
    }
    throw lastError || new Error('Failed to scrape matches');
}
async function scrapeMatches() {
    let browser = null;
    try {
        browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
        });
        await page.goto(FLASHSCORE_URL, {
            waitUntil: 'networkidle',
            timeout: TIMEOUT
        });
        await delay(2000);
        // Close cookie popup
        await closeCookiePopup(page);
        await delay(1500);
        // Scrape using correct selectors
        const scrapedData = await page.evaluate((allowedLeagues) => {
            const results = [];
            let currentCountry = '';
            let currentLeague = '';
            // Get all league headers and matches from entire document
            const allElements = document.querySelectorAll('.headerLeague__wrapper, .event__match');
            allElements.forEach(el => {
                // League header
                if (el.classList.contains('headerLeague__wrapper')) {
                    const countryEl = el.querySelector('.headerLeague__category-text');
                    const leagueEl = el.querySelector('.headerLeague__title-text');
                    currentCountry = countryEl?.textContent?.trim() || '';
                    currentLeague = leagueEl?.textContent?.trim() || '';
                    return;
                }
                // Match row
                if (el.classList.contains('event__match')) {
                    // Check if league is allowed
                    const fullLeague = `${currentCountry}: ${currentLeague}`.toLowerCase();
                    const isAllowed = allowedLeagues.some(allowed => {
                        // Champions League can be under different countries, use partial match
                        if (allowed === 'liga prvaka' || allowed === 'champions league') {
                            return fullLeague.includes(allowed);
                        }
                        // For all other leagues, require EXACT match with country
                        return fullLeague === allowed;
                    });
                    if (!isAllowed)
                        return;
                    // Get match link and ID
                    const linkEl = el.querySelector('a.eventRowLink');
                    const href = linkEl?.getAttribute('href') || '';
                    // Extract match ID from URL (mid= param)
                    const midMatch = href.match(/mid=([^&]+)/);
                    const matchId = midMatch ? midMatch[1] : '';
                    // Get teams - using the specific selector
                    const homeEl = el.querySelector('.event__homeParticipant .wcl-name_jjfMf');
                    const awayEl = el.querySelector('.event__awayParticipant .wcl-name_jjfMf');
                    // Fallback selectors if specific ones don't work
                    const homeTeamName = homeEl?.textContent?.trim() ||
                        el.querySelector('.event__homeParticipant')?.textContent?.trim() || '';
                    const awayTeamName = awayEl?.textContent?.trim() ||
                        el.querySelector('.event__awayParticipant')?.textContent?.trim() || '';
                    // Get team logos
                    const homeLogoEl = el.querySelector('.event__homeParticipant img[data-testid="wcl-participantLogo"]');
                    const awayLogoEl = el.querySelector('.event__awayParticipant img[data-testid="wcl-participantLogo"]');
                    const homeTeam = { name: homeTeamName, logo: homeLogoEl?.src };
                    const awayTeam = { name: awayTeamName, logo: awayLogoEl?.src };
                    // Get time/status (stage for live/finished, time for scheduled)
                    const stageEl = el.querySelector('.event__stage--block');
                    const timeEl = el.querySelector('.event__time');
                    const time = stageEl?.textContent?.trim() || timeEl?.textContent?.trim() || '';
                    // Get score (if match has started)
                    const homeScoreEl = el.querySelector('.event__score--home');
                    const awayScoreEl = el.querySelector('.event__score--away');
                    const homeScore = homeScoreEl?.textContent?.trim() || '';
                    const awayScore = awayScoreEl?.textContent?.trim() || '';
                    const score = homeScore && awayScore ? `${homeScore}-${awayScore}` : '-';
                    if (homeTeam.name && awayTeam.name && matchId) {
                        results.push({
                            id: matchId,
                            league: `${currentCountry}: ${currentLeague}`,
                            homeTeam,
                            awayTeam,
                            time,
                            url: href || `/match/${matchId}/`,
                            score
                        });
                    }
                }
            });
            return results;
        }, ALLOWED_LEAGUES);
        return scrapedData;
    }
    finally {
        if (browser) {
            await browser.close();
        }
    }
}
export async function getMatches() {
    const matches = await scrapeMatchesWithRetry();
    const today = new Date().toISOString().split('T')[0];
    return {
        date: today,
        matches
    };
}
