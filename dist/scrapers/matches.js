import { chromium } from 'playwright';
import { ALLOWED_LEAGUES } from '../types.js';
const FLASHSCORE_URL = 'https://www.flashscore.com/';
const TIMEOUT = 30000;
const MAX_RETRIES = 2;
async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function isAllowedLeague(leagueName) {
    return ALLOWED_LEAGUES.some(allowed => leagueName.toLowerCase().includes(allowed.toLowerCase().replace(': ', ' - ').replace(':', '')));
}
function extractMatchId(url) {
    // URL format: /match/xxxxx/ or similar
    const match = url.match(/\/match\/([^/]+)/);
    if (match)
        return match[1];
    // Alternative: extract from event ID
    const eventMatch = url.match(/\/([A-Za-z0-9]{8})\/?$/);
    if (eventMatch)
        return eventMatch[1];
    return url;
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
        // Set user agent to avoid bot detection
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
        });
        await page.goto(FLASHSCORE_URL, {
            waitUntil: 'networkidle',
            timeout: TIMEOUT
        });
        // Wait for matches to load
        await page.waitForSelector('.sportName', { timeout: TIMEOUT });
        // Small delay to ensure all dynamic content is loaded
        await delay(2000);
        const matches = [];
        // Get all league sections (each league has its events)
        const leagueSections = await page.$$('.sportName.soccer');
        if (leagueSections.length === 0) {
            // Alternative: try to find events directly
            const events = await page.$$('[class*="event__"]');
            console.log(`Found ${events.length} events directly`);
        }
        // Scrape matches by evaluating in page context
        const scrapedData = await page.evaluate((allowedLeagues) => {
            const results = [];
            // Find all league headers and their matches
            const leagueHeaders = document.querySelectorAll('.event__header');
            leagueHeaders.forEach(header => {
                const leagueNameEl = header.querySelector('.event__title--name');
                const countryEl = header.querySelector('.event__title--type');
                if (!leagueNameEl)
                    return;
                const leagueName = leagueNameEl.textContent?.trim() || '';
                const country = countryEl?.textContent?.trim() || '';
                const fullLeagueName = country ? `${country}: ${leagueName}` : leagueName;
                // Check if this league is in our allowed list
                const isAllowed = allowedLeagues.some(allowed => {
                    const normalizedAllowed = allowed.toLowerCase();
                    const normalizedFull = fullLeagueName.toLowerCase();
                    return normalizedFull.includes(normalizedAllowed.replace(': ', ' ')) ||
                        normalizedFull.includes(normalizedAllowed);
                });
                if (!isAllowed)
                    return;
                // Get all matches for this league (siblings until next header)
                let sibling = header.nextElementSibling;
                while (sibling && !sibling.classList.contains('event__header')) {
                    if (sibling.classList.contains('event__match')) {
                        const homeTeamEl = sibling.querySelector('.event__participant--home');
                        const awayTeamEl = sibling.querySelector('.event__participant--away');
                        const timeEl = sibling.querySelector('.event__time');
                        const linkEl = sibling.querySelector('a') || sibling;
                        const homeTeam = homeTeamEl?.textContent?.trim() || '';
                        const awayTeam = awayTeamEl?.textContent?.trim() || '';
                        const time = timeEl?.textContent?.trim() || '';
                        // Get match ID from element ID or data attribute
                        const matchId = sibling.id?.replace('g_1_', '') ||
                            sibling.getAttribute('data-id') ||
                            '';
                        // Construct URL
                        const url = matchId ? `/match/${matchId}/` : '';
                        if (homeTeam && awayTeam && matchId) {
                            results.push({
                                id: matchId,
                                league: fullLeagueName,
                                homeTeam,
                                awayTeam,
                                time,
                                url
                            });
                        }
                    }
                    sibling = sibling.nextElementSibling;
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
