import { chromium } from 'playwright';
const FLASHSCORE_BASE = 'https://www.flashscore.com';
const TIMEOUT = 30000;
const MAX_RETRIES = 2;
async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function getMatchDetailsWithRetry(matchId) {
    let lastError = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            return await scrapeMatchDetails(matchId);
        }
        catch (error) {
            lastError = error;
            console.error(`Attempt ${attempt} failed:`, error);
            if (attempt < MAX_RETRIES) {
                await delay(2000);
            }
        }
    }
    throw lastError || new Error('Failed to scrape match details');
}
async function scrapeMatchDetails(matchId) {
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
        const matchUrl = `${FLASHSCORE_BASE}/match/${matchId}/`;
        await page.goto(matchUrl, {
            waitUntil: 'networkidle',
            timeout: TIMEOUT
        });
        // Wait for match header to load
        await page.waitForSelector('.duelParticipant', { timeout: TIMEOUT });
        await delay(1500);
        // Scrape basic match info
        const basicInfo = await scrapeBasicInfo(page);
        // Scrape standings
        const standings = await scrapeStandings(page, matchId);
        // Scrape H2H
        const h2h = await scrapeH2H(page, matchId);
        // Scrape form (home form for home team, away form for away team)
        const { homeForm, awayForm } = await scrapeForm(page, matchId);
        return {
            id: matchId,
            ...basicInfo,
            standings,
            homeForm,
            awayForm,
            h2h
        };
    }
    finally {
        if (browser) {
            await browser.close();
        }
    }
}
async function scrapeBasicInfo(page) {
    return await page.evaluate(() => {
        // League info
        const leagueEl = document.querySelector('.tournamentHeader__country');
        const league = leagueEl?.textContent?.trim() || '';
        // Home team
        const homeNameEl = document.querySelector('.duelParticipant__home .participant__participantName');
        const homeLogoEl = document.querySelector('.duelParticipant__home .participant__image');
        // Away team
        const awayNameEl = document.querySelector('.duelParticipant__away .participant__participantName');
        const awayLogoEl = document.querySelector('.duelParticipant__away .participant__image');
        // Time/Date
        const dateTimeEl = document.querySelector('.duelParticipant__startTime');
        const dateTime = dateTimeEl?.textContent?.trim() || '';
        const [date, time] = dateTime.split(' ');
        // Score (if match has started/finished)
        const homeScoreEl = document.querySelector('.duelParticipant__score .detailScore__wrapper span:first-child');
        const awayScoreEl = document.querySelector('.duelParticipant__score .detailScore__wrapper span:last-child');
        const homeScore = homeScoreEl?.textContent?.trim();
        const awayScore = awayScoreEl?.textContent?.trim();
        const score = homeScore && awayScore ? `${homeScore}-${awayScore}` : undefined;
        return {
            league,
            homeTeam: {
                name: homeNameEl?.textContent?.trim() || '',
                logo: homeLogoEl?.src
            },
            awayTeam: {
                name: awayNameEl?.textContent?.trim() || '',
                logo: awayLogoEl?.src
            },
            time: time || dateTime,
            date: date || new Date().toISOString().split('T')[0],
            score
        };
    });
}
async function scrapeStandings(page, matchId) {
    try {
        // Navigate to standings tab
        const standingsUrl = `${FLASHSCORE_BASE}/match/${matchId}/#/standings`;
        await page.goto(standingsUrl, { waitUntil: 'networkidle', timeout: TIMEOUT });
        await delay(1500);
        // Try to click standings tab if exists
        const standingsTab = await page.$('[href*="standings"]');
        if (standingsTab) {
            await standingsTab.click();
            await delay(1500);
        }
        return await page.evaluate(() => {
            const parseStandingsRow = (row) => {
                const cells = row.querySelectorAll('td, .table__cell');
                if (cells.length < 8)
                    return null;
                return {
                    position: parseInt(cells[0]?.textContent?.trim() || '0'),
                    played: parseInt(cells[2]?.textContent?.trim() || '0'),
                    won: parseInt(cells[3]?.textContent?.trim() || '0'),
                    drawn: parseInt(cells[4]?.textContent?.trim() || '0'),
                    lost: parseInt(cells[5]?.textContent?.trim() || '0'),
                    goalsFor: parseInt(cells[6]?.textContent?.trim()?.split(':')[0] || '0'),
                    goalsAgainst: parseInt(cells[6]?.textContent?.trim()?.split(':')[1] || '0'),
                    points: parseInt(cells[7]?.textContent?.trim() || '0')
                };
            };
            // Find highlighted rows (current teams)
            const highlightedRows = document.querySelectorAll('.table__row--highlighted, .ui-table__row--highlighted');
            let homeStandings = null;
            let awayStandings = null;
            highlightedRows.forEach((row, index) => {
                const parsed = parseStandingsRow(row);
                if (parsed) {
                    if (index === 0)
                        homeStandings = parsed;
                    else if (index === 1)
                        awayStandings = parsed;
                }
            });
            return { home: homeStandings, away: awayStandings };
        });
    }
    catch (error) {
        console.error('Error scraping standings:', error);
        return { home: null, away: null };
    }
}
async function scrapeH2H(page, matchId) {
    try {
        // Navigate to H2H tab
        const h2hUrl = `${FLASHSCORE_BASE}/match/${matchId}/#/h2h/overall`;
        await page.goto(h2hUrl, { waitUntil: 'networkidle', timeout: TIMEOUT });
        await delay(1500);
        return await page.evaluate(() => {
            const results = [];
            // Find H2H matches
            const h2hRows = document.querySelectorAll('.h2h__row, [class*="h2h__section"] .h2h__row');
            h2hRows.forEach(row => {
                const dateEl = row.querySelector('.h2h__date');
                const homeEl = row.querySelector('.h2h__homeParticipant, .h2h__participant--home');
                const awayEl = row.querySelector('.h2h__awayParticipant, .h2h__participant--away');
                const scoreEl = row.querySelector('.h2h__result, .h2h__score');
                const date = dateEl?.textContent?.trim() || '';
                const homeTeam = homeEl?.textContent?.trim() || '';
                const awayTeam = awayEl?.textContent?.trim() || '';
                const score = scoreEl?.textContent?.trim() || '';
                if (homeTeam && awayTeam) {
                    results.push({ date, homeTeam, awayTeam, score });
                }
            });
            return results.slice(0, 10); // Limit to 10 H2H matches
        });
    }
    catch (error) {
        console.error('Error scraping H2H:', error);
        return [];
    }
}
async function scrapeForm(page, matchId) {
    try {
        // Navigate to form section
        const formUrl = `${FLASHSCORE_BASE}/match/${matchId}/#/h2h/home`;
        await page.goto(formUrl, { waitUntil: 'networkidle', timeout: TIMEOUT });
        await delay(1500);
        const homeForm = await scrapeTeamForm(page, true);
        // Navigate to away form
        const awayFormUrl = `${FLASHSCORE_BASE}/match/${matchId}/#/h2h/away`;
        await page.goto(awayFormUrl, { waitUntil: 'networkidle', timeout: TIMEOUT });
        await delay(1500);
        const awayForm = await scrapeTeamForm(page, false);
        return { homeForm, awayForm };
    }
    catch (error) {
        console.error('Error scraping form:', error);
        return { homeForm: [], awayForm: [] };
    }
}
async function scrapeTeamForm(page, isHome) {
    return await page.evaluate((isHomeTeam) => {
        const results = [];
        // Find form rows in the first section (team's recent matches)
        const formSection = document.querySelector('.h2h__section:first-child');
        if (!formSection)
            return results;
        const rows = formSection.querySelectorAll('.h2h__row');
        rows.forEach(row => {
            const dateEl = row.querySelector('.h2h__date');
            const homeEl = row.querySelector('.h2h__homeParticipant, .h2h__participant--home');
            const awayEl = row.querySelector('.h2h__awayParticipant, .h2h__participant--away');
            const scoreEl = row.querySelector('.h2h__result, .h2h__score');
            const date = dateEl?.textContent?.trim() || '';
            const homeTeam = homeEl?.textContent?.trim() || '';
            const awayTeam = awayEl?.textContent?.trim() || '';
            const score = scoreEl?.textContent?.trim() || '';
            // Determine if this team was home or away in this match
            // and what the outcome was
            const [homeGoals, awayGoals] = score.split('-').map(s => parseInt(s?.trim() || '0'));
            // For home form, we want matches where the team played at home
            // For away form, we want matches where the team played away
            const opponent = isHomeTeam ? awayTeam : homeTeam;
            const isTeamHome = isHomeTeam;
            let outcome;
            if (homeGoals === awayGoals) {
                outcome = 'D';
            }
            else if ((isTeamHome && homeGoals > awayGoals) || (!isTeamHome && awayGoals > homeGoals)) {
                outcome = 'W';
            }
            else {
                outcome = 'L';
            }
            if (opponent && score) {
                results.push({
                    date,
                    opponent,
                    result: score,
                    outcome,
                    isHome: isTeamHome
                });
            }
        });
        return results.slice(0, 5); // Last 5 matches
    }, isHome);
}
export async function getMatchDetails(matchId) {
    return await getMatchDetailsWithRetry(matchId);
}
