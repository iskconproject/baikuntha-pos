CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`parent_id` text,
	`keywords` text,
	`is_active` integer DEFAULT true,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`parent_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `category_name_idx` ON `categories` (`name`);--> statement-breakpoint
CREATE INDEX `category_parent_idx` ON `categories` (`parent_id`);--> statement-breakpoint
CREATE TABLE `product_search_fts` (
	`rowid` integer PRIMARY KEY NOT NULL,
	`product_id` text,
	`content` text
);
--> statement-breakpoint
CREATE TABLE `product_variants` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text,
	`name` text NOT NULL,
	`price` real NOT NULL,
	`stock_quantity` integer DEFAULT 0,
	`attributes` text,
	`keywords` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `variant_product_idx` ON `product_variants` (`product_id`);--> statement-breakpoint
CREATE INDEX `variant_price_idx` ON `product_variants` (`price`);--> statement-breakpoint
CREATE INDEX `variant_stock_idx` ON `product_variants` (`stock_quantity`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`base_price` real NOT NULL,
	`category_id` text,
	`keywords` text,
	`metadata` text,
	`is_active` integer DEFAULT true,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `product_name_idx` ON `products` (`name`);--> statement-breakpoint
CREATE INDEX `product_category_idx` ON `products` (`category_id`);--> statement-breakpoint
CREATE INDEX `product_price_idx` ON `products` (`base_price`);--> statement-breakpoint
CREATE TABLE `search_analytics` (
	`id` text PRIMARY KEY NOT NULL,
	`query` text NOT NULL,
	`result_count` integer NOT NULL,
	`clicked_product_id` text,
	`user_id` text,
	`timestamp` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`clicked_product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `search_query_idx` ON `search_analytics` (`query`);--> statement-breakpoint
CREATE INDEX `search_user_idx` ON `search_analytics` (`user_id`);--> statement-breakpoint
CREATE INDEX `search_timestamp_idx` ON `search_analytics` (`timestamp`);--> statement-breakpoint
CREATE TABLE `sync_metadata` (
	`id` text PRIMARY KEY NOT NULL,
	`table_name` text NOT NULL,
	`last_sync_at` integer,
	`sync_version` integer DEFAULT 0,
	`conflict_count` integer DEFAULT 0,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `sync_table_idx` ON `sync_metadata` (`table_name`);--> statement-breakpoint
CREATE INDEX `sync_version_idx` ON `sync_metadata` (`sync_version`);--> statement-breakpoint
CREATE TABLE `transaction_items` (
	`id` text PRIMARY KEY NOT NULL,
	`transaction_id` text,
	`product_id` text,
	`variant_id` text,
	`quantity` integer NOT NULL,
	`unit_price` real NOT NULL,
	`total_price` real NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `item_transaction_idx` ON `transaction_items` (`transaction_id`);--> statement-breakpoint
CREATE INDEX `item_product_idx` ON `transaction_items` (`product_id`);--> statement-breakpoint
CREATE INDEX `item_variant_idx` ON `transaction_items` (`variant_id`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`subtotal` real NOT NULL,
	`tax` real DEFAULT 0,
	`discount` real DEFAULT 0,
	`total` real NOT NULL,
	`payment_method` text NOT NULL,
	`payment_reference` text,
	`status` text DEFAULT 'completed' NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `transaction_user_idx` ON `transactions` (`user_id`);--> statement-breakpoint
CREATE INDEX `transaction_status_idx` ON `transactions` (`status`);--> statement-breakpoint
CREATE INDEX `transaction_sync_idx` ON `transactions` (`sync_status`);--> statement-breakpoint
CREATE INDEX `transaction_date_idx` ON `transactions` (`created_at`);--> statement-breakpoint
CREATE INDEX `transaction_payment_idx` ON `transactions` (`payment_method`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`pin_hash` text NOT NULL,
	`role` text NOT NULL,
	`is_active` integer DEFAULT true,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP,
	`last_login_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE INDEX `username_idx` ON `users` (`username`);--> statement-breakpoint
CREATE INDEX `role_idx` ON `users` (`role`);