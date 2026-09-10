ALTER TABLE `review_threads` ADD `width` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `review_threads` ADD `height` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `review_threads` ADD `selection_type` text DEFAULT 'point' NOT NULL;