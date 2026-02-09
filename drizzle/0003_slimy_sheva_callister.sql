ALTER TABLE `documents` ADD `source_type` text DEFAULT 'USER' NOT NULL;--> statement-breakpoint
ALTER TABLE `entities` ADD `source_type` text DEFAULT 'USER' NOT NULL;--> statement-breakpoint
ALTER TABLE `relations` ADD `source_type` text DEFAULT 'USER' NOT NULL;