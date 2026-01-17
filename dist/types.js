// Allowed leagues filter (exact match with country, case-insensitive)
export const ALLOWED_LEAGUES = [
    "england: premier league",
    "england: championship",
    "france: ligue 1",
    "italy: serie a",
    "germany: bundesliga",
    "spain: laliga",
    "belgium: jupiler pro league",
    "netherlands: eredivisie",
    "switzerland: super league", // ONLY Switzerland, NOT Greece/Turkey
    "liga prvaka", // Champions League (hrvatski naziv)
    "champions league" // Champions League (engleski naziv)
];
// BLOCKED_COMPETITIONS is the single source of truth for league exclusions
// All entries should be lowercase for consistent matching
// These are applied AFTER ALLOWED_LEAGUES filtering to catch unwanted variations
export const BLOCKED_COMPETITIONS = [
    'primavera',
    'serie b',
    'serie d',
    'laliga2',
    'ligue 2',
    '2. bundesliga',
    '3. liga', // Germany - 3. Liga (3rd division)
    'premier league cup',
    'premier league 2',
    'u18',
    'u19',
    'u21',
    'u23',
    'youth',
    'reserve',
    'reserves',
    'women',
    'women\'s super league',
    'super league 2',
    'amateur',
    'regional',
    'group a',
    'group b',
    'group c',
    'group 1',
    'group 2',
    'eerste divisie',
    'tweede divisie',
    'derde divisie',
    'keuken kampioen',
    'nifl', // Northern Ireland Football League
    'first division', // Generic minor leagues
    'second division',
    'third division',
    'tt premier league', // Trinidad and Tobago
    'premier division', // Generic name for minor leagues
];
