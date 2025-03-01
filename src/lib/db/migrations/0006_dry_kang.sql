PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`action_type` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` integer,
	`changes` text NOT NULL,
	`user_id` integer,
	`created_at` integer
);
--> statement-breakpoint
INSERT INTO `__new_audit_logs`("id", "action_type", "entity_type", "entity_id", "changes", "user_id", "created_at") SELECT "id", "action_type", "entity_type", "entity_id", "changes", "user_id", "created_at" FROM `audit_logs`;--> statement-breakpoint
DROP TABLE `audit_logs`;--> statement-breakpoint
ALTER TABLE `__new_audit_logs` RENAME TO `audit_logs`;--> statement-breakpoint
PRAGMA foreign_keys=ON;