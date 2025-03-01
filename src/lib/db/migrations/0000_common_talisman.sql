CREATE TABLE `access_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`proxy_host_id` integer NOT NULL,
	`timestamp` integer NOT NULL,
	`ip_address` text NOT NULL,
	`method` text NOT NULL,
	`path` text NOT NULL,
	`status_code` integer NOT NULL,
	`user_agent` text,
	`response_time` integer
);
--> statement-breakpoint
CREATE TABLE `proxy_hosts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`domain` text NOT NULL,
	`target_host` text NOT NULL,
	`target_port` integer NOT NULL,
	`ssl_enabled` integer DEFAULT true NOT NULL,
	`force_ssl` integer DEFAULT true NOT NULL,
	`http2_support` integer DEFAULT true NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`advanced_config` text,
	`basic_auth_enabled` integer DEFAULT false NOT NULL,
	`basic_auth_username` text,
	`basic_auth_password` text,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);