// Re-export job types for convenience
export type {
  JobStatus,
  JobProgress,
  ScrapeAllResult,
  Job
} from './job-manager.js';

// Match List Response
export interface MatchListResponse {
  date: string; // "2026-01-05"
  matches: MatchSummary[];
}

export interface MatchSummary {
  id: string;           // match ID iz URL-a (npr. "6FtLgwuC")
  league: string;       // "England - Premier League"
  homeTeam: TeamInfo;   // { name: "Leicester", logo: "https://..." }
  awayTeam: TeamInfo;   // { name: "West Brom", logo: "https://..." }
  time: string;         // "15:00" ili status ako je live/finished
  url: string;          // relativan URL ka meču
  score: string;        // "2-1" ili "-" ako meč nije počeo
}

// Match Details Response
export interface MatchDetailsResponse {
  id: string;
  league: string;
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  time: string;
  date: string;
  score?: string;
  standings: {
    home: StandingsInfo | null;
    away: StandingsInfo | null;
  };
  homeForm: FormMatch[];
  awayForm: FormMatch[];
  h2h: H2HMatch[];
}

export interface TeamInfo {
  name: string;
  logo?: string;
}

export interface StandingsInfo {
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export interface FormMatch {
  date: string;
  opponent: string;
  result: string;      // "2-1"
  outcome: "W" | "D" | "L";
  isHome: boolean;
}

export interface H2HMatch {
  date: string;
  homeTeam: string;
  awayTeam: string;
  score: string;
}

// Allowed leagues filter (partial match, case-insensitive)
export const ALLOWED_LEAGUES = [
  "england",
  "spain",
  "germany",
  "italy",
  "france",
  "netherlands",
  "champions league"
];

// Blocked youth/reserve competitions
export const BLOCKED_COMPETITIONS = [
  'primavera',
  'serie b',
  'serie d',
  'laliga2',
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
];
