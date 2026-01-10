export type { JobStatus, JobProgress, ScrapeAllResult, Job } from './job-manager.js';
export interface MatchListResponse {
    date: string;
    matches: MatchSummary[];
}
export interface MatchSummary {
    id: string;
    league: string;
    homeTeam: TeamInfo;
    awayTeam: TeamInfo;
    time: string;
    url: string;
    score: string;
}
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
    result: string;
    outcome: "W" | "D" | "L";
    isHome: boolean;
}
export interface H2HMatch {
    date: string;
    homeTeam: string;
    awayTeam: string;
    score: string;
}
export declare const ALLOWED_LEAGUES: string[];
export declare const BLOCKED_COMPETITIONS: string[];
