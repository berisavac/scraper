CREATE TABLE `ticket_bets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ticket_id` integer NOT NULL,
	`match_id` text NOT NULL,
	`home_team` text NOT NULL,
	`away_team` text NOT NULL,
	`bet_type` text NOT NULL,
	`odds` real NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_ticket_bets_ticket_id` ON `ticket_bets` (`ticket_id`);--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`total_odds` real NOT NULL,
	`stake` real NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_tickets_user_id` ON `tickets` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_tickets_status` ON `tickets` (`status`);