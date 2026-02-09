ALTER TABLE `documents` ADD `privacy_level` text DEFAULT 'PRIVATE' NOT NULL;--> statement-breakpoint
ALTER TABLE `entities` ADD `privacy_level` text DEFAULT 'PRIVATE' NOT NULL;--> statement-breakpoint
ALTER TABLE `relations` ADD `privacy_level` text DEFAULT 'PRIVATE' NOT NULL;