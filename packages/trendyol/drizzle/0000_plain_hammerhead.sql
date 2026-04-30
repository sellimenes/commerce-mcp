CREATE TABLE `api_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ts` integer NOT NULL,
	`tool_name` text NOT NULL,
	`request` text,
	`response` text,
	`latency_ms` integer,
	`error` text
);
--> statement-breakpoint
CREATE INDEX `api_logs_ts_idx` ON `api_logs` (`ts`);--> statement-breakpoint
CREATE TABLE `batch_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`status` text NOT NULL,
	`item_count` integer NOT NULL,
	`results` text,
	`created_at` integer NOT NULL,
	`completed_at` integer
);
--> statement-breakpoint
CREATE INDEX `batch_requests_status_idx` ON `batch_requests` (`status`);--> statement-breakpoint
CREATE TABLE `brands` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`parent_id` integer
);
--> statement-breakpoint
CREATE TABLE `claims` (
	`id` text PRIMARY KEY NOT NULL,
	`package_id` integer NOT NULL,
	`order_line_item_id` integer NOT NULL,
	`product_main_id` text NOT NULL,
	`product_name` text,
	`status` text NOT NULL,
	`reason` text NOT NULL,
	`customer_note` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`package_id`) REFERENCES `shipment_packages`(`package_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `claims_status_idx` ON `claims` (`status`);--> statement-breakpoint
CREATE INDEX `claims_created_at_idx` ON `claims` (`created_at`);--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`package_id` integer NOT NULL,
	`order_line_item_id` integer NOT NULL,
	`product_main_id` text NOT NULL,
	`barcode` text NOT NULL,
	`product_name` text NOT NULL,
	`quantity` integer NOT NULL,
	`price` real NOT NULL,
	`status` text DEFAULT 'Created' NOT NULL,
	FOREIGN KEY (`package_id`) REFERENCES `shipment_packages`(`package_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `order_items_package_idx` ON `order_items` (`package_id`);--> statement-breakpoint
CREATE TABLE `products` (
	`product_main_id` text PRIMARY KEY NOT NULL,
	`barcode` text NOT NULL,
	`stock_code` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`brand_id` integer NOT NULL,
	`category_id` integer NOT NULL,
	`list_price` real NOT NULL,
	`sale_price` real NOT NULL,
	`quantity` integer DEFAULT 0 NOT NULL,
	`approved` integer DEFAULT false NOT NULL,
	`vat_rate` integer DEFAULT 20 NOT NULL,
	`dimensional_weight` real DEFAULT 1 NOT NULL,
	`attributes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_barcode_unique` ON `products` (`barcode`);--> statement-breakpoint
CREATE INDEX `products_barcode_idx` ON `products` (`barcode`);--> statement-breakpoint
CREATE INDEX `products_stock_code_idx` ON `products` (`stock_code`);--> statement-breakpoint
CREATE INDEX `products_approved_idx` ON `products` (`approved`);--> statement-breakpoint
CREATE TABLE `questions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_main_id` text NOT NULL,
	`customer_name` text NOT NULL,
	`text` text NOT NULL,
	`answer` text,
	`status` text DEFAULT 'WAITING_FOR_ANSWER' NOT NULL,
	`created_at` integer NOT NULL,
	`answered_at` integer,
	FOREIGN KEY (`product_main_id`) REFERENCES `products`(`product_main_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `questions_status_idx` ON `questions` (`status`);--> statement-breakpoint
CREATE INDEX `questions_created_at_idx` ON `questions` (`created_at`);--> statement-breakpoint
CREATE TABLE `shipment_packages` (
	`package_id` integer PRIMARY KEY NOT NULL,
	`order_id` integer NOT NULL,
	`order_number` text NOT NULL,
	`status` text NOT NULL,
	`customer_name` text NOT NULL,
	`total_price` real NOT NULL,
	`currency` text DEFAULT 'TRY' NOT NULL,
	`cargo_tracking_number` text,
	`cargo_provider_code` text,
	`cargo_provider_name` text,
	`shipment_address` text,
	`created_at` integer NOT NULL,
	`last_modified_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `shipment_packages_status_idx` ON `shipment_packages` (`status`);--> statement-breakpoint
CREATE INDEX `shipment_packages_created_at_idx` ON `shipment_packages` (`created_at`);--> statement-breakpoint
CREATE TABLE `shipment_providers` (
	`id` integer PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`tax_number` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shipment_providers_code_unique` ON `shipment_providers` (`code`);