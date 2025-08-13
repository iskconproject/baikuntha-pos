ALTER TABLE `transaction_items` ADD `is_custom_variant` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `transaction_items` ADD `custom_variant_data` text;--> statement-breakpoint
CREATE INDEX `item_custom_idx` ON `transaction_items` (`is_custom_variant`);