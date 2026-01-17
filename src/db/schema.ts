import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

// Users table - User authentication
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Predictions table - User predictions with FK to users
export const predictions = sqliteTable('predictions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  matchId: text('match_id').notNull(),
  predictionType: text('prediction_type').notNull(),
  predictedValue: text('predicted_value').notNull(),
  confidence: integer('confidence').notNull(),
  actualResult: text('actual_result'),
  isCorrect: integer('is_correct', { mode: 'boolean' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Chat Messages table - Chat history with FK to users
export const chatMessages = sqliteTable('chat_messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  matchId: text('match_id').notNull(),
  role: text('role').notNull(),
  content: text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Match Pipeline Data table - Pipeline stages for match analysis
export const matchPipelineData = sqliteTable('match_pipeline_data', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  matchId: text('match_id').notNull().unique(),
  rawScrape: text('raw_scrape'), // JSON text
  enrichedData: text('enriched_data'), // JSON text
  webValidation: text('web_validation'), // JSON text
  synthesisOutcome: text('synthesis_outcome'), // AI response
  synthesisGoals: text('synthesis_goals'), // AI response
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Invite Codes table - Invite codes for user registration
export const inviteCodes = sqliteTable('invite_codes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
  usedBy: integer('used_by').references(() => users.id, { onDelete: 'set null' }),
  usedAt: integer('used_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Tickets table - Betting slips/tickets
export const tickets = sqliteTable('tickets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  totalOdds: real('total_odds').notNull(),
  stake: real('stake').notNull(),
  status: text('status').notNull().default('pending'), // 'pending' | 'won' | 'lost'
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => ({
  userIdIdx: index('idx_tickets_user_id').on(table.userId),
  statusIdx: index('idx_tickets_status').on(table.status),
}));

// Ticket Bets table - Individual bets on a ticket
export const ticketBets = sqliteTable('ticket_bets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ticketId: integer('ticket_id')
    .notNull()
    .references(() => tickets.id, { onDelete: 'cascade' }),
  matchId: text('match_id').notNull(),
  homeTeam: text('home_team').notNull(),
  awayTeam: text('away_team').notNull(),
  betType: text('bet_type').notNull(), // '1', 'X', '2', 'GG', 'Over 2.5', etc.
  odds: real('odds').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => ({
  ticketIdIdx: index('idx_ticket_bets_ticket_id').on(table.ticketId),
}));

// TypeScript types for type safety
export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type Prediction = InferSelectModel<typeof predictions>;
export type NewPrediction = InferInsertModel<typeof predictions>;

export type ChatMessage = InferSelectModel<typeof chatMessages>;
export type NewChatMessage = InferInsertModel<typeof chatMessages>;

export type MatchPipelineData = InferSelectModel<typeof matchPipelineData>;
export type NewMatchPipelineData = InferInsertModel<typeof matchPipelineData>;

export type InviteCode = InferSelectModel<typeof inviteCodes>;
export type NewInviteCode = InferInsertModel<typeof inviteCodes>;

export type Ticket = InferSelectModel<typeof tickets>;
export type NewTicket = InferInsertModel<typeof tickets>;

export type TicketBet = InferSelectModel<typeof ticketBets>;
export type NewTicketBet = InferInsertModel<typeof ticketBets>;
