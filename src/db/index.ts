import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';

// Create SQLite database instance
export const sqlite: InstanceType<typeof Database> = new Database('./data/local.db');

// Enable critical SQLite pragmas
sqlite.pragma('foreign_keys = ON'); // Foreign keys disabled by default in SQLite!
sqlite.pragma('journal_mode = WAL'); // Better concurrency

// Initialize Drizzle with schema for type-safe queries
export const db = drizzle(sqlite, { schema });
