CREATE TABLE `userTable` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`age` integer NOT NULL,
	`email` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `userTable_name_unique` ON `userTable` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `userTable_email_unique` ON `userTable` (`email`);