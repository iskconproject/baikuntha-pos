CREATE TABLE `scheduled_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`report_type` text NOT NULL,
	`frequency` text NOT NULL,
	`format` text NOT NULL,
	`recipients` text,
	`filters` text,
	`is_active` integer DEFAULT true,
	`next_run` integer NOT NULL,
	`last_run` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP,
	`created_by` text,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `scheduled_report_type_idx` ON `scheduled_reports` (`report_type`);--> statement-breakpoint
CREATE INDEX `scheduled_report_frequency_idx` ON `scheduled_reports` (`frequency`);--> statement-breakpoint
CREATE INDEX `scheduled_report_active_idx` ON `scheduled_reports` (`is_active`);--> statement-breakpoint
CREATE INDEX `scheduled_report_next_run_idx` ON `scheduled_reports` (`next_run`);--> statement-breakpoint
CREATE INDEX `scheduled_report_created_by_idx` ON `scheduled_reports` (`created_by`);--> statement-breakpoint
CREATE TABLE `user_activity` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`action` text NOT NULL,
	`target_user_id` text,
	`details` text,
	`ip_address` text,
	`user_agent` text,
	`timestamp` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`target_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `activity_user_idx` ON `user_activity` (`user_id`);--> statement-breakpoint
CREATE INDEX `activity_action_idx` ON `user_activity` (`action`);--> statement-breakpoint
CREATE INDEX `activity_timestamp_idx` ON `user_activity` (`timestamp`);--> statement-breakpoint
CREATE INDEX `activity_target_user_idx` ON `user_activity` (`target_user_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`parent_id` text,
	`keywords` text,
	`is_active` integer DEFAULT true,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
INSERT INTO `__new_categories`("id", "name", "description", "parent_id", "keywords", "is_active", "created_at", "updated_at") SELECT "id", "name", "description", "parent_id", "keywords", "is_active", "created_at", "updated_at" FROM `categories`;--> statement-breakpoint
DROP TABLE `categories`;--> statement-breakpoint
ALTER TABLE `__new_categories` RENAME TO `categories`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `category_name_idx` ON `categories` (`name`);--> statement-breakpoint
CREATE INDEX `category_parent_idx` ON `categories` (`parent_id`);