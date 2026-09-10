CREATE TABLE `review_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`request_id` text NOT NULL,
	`thread_id` integer NOT NULL,
	`visitor_id` text NOT NULL,
	`name` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`thread_id`) REFERENCES `review_threads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `review_messages_request_id_unique` ON `review_messages` (`request_id`);--> statement-breakpoint
CREATE INDEX `idx_review_messages_thread_id` ON `review_messages` (`thread_id`,`id`);--> statement-breakpoint
CREATE TABLE `review_rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`window` integer NOT NULL,
	`count` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_review_rate_window` ON `review_rate_limits` (`window`);--> statement-breakpoint
CREATE TABLE `review_reactions` (
	`message_id` integer NOT NULL,
	`visitor_id` text NOT NULL,
	`emoji` text NOT NULL,
	PRIMARY KEY(`message_id`, `visitor_id`, `emoji`),
	FOREIGN KEY (`message_id`) REFERENCES `review_messages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `review_threads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`request_id` text NOT NULL,
	`page` text NOT NULL,
	`anchor` text NOT NULL,
	`anchor_label` text NOT NULL,
	`x` integer NOT NULL,
	`y` integer NOT NULL,
	`created_at` integer NOT NULL,
	`resolved` integer DEFAULT 0 NOT NULL,
	`resolved_by` text,
	`resolved_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `review_threads_request_id_unique` ON `review_threads` (`request_id`);--> statement-breakpoint
CREATE INDEX `idx_review_threads_page_id` ON `review_threads` (`page`,`id`);