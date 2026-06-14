CREATE TABLE `wb_cron_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`task_type` text NOT NULL,
	`payload` text DEFAULT '{}' NOT NULL,
	`cron_expression` text,
	`next_run_at` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`last_run_at` text,
	`last_error` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `wb_user_permissions` (
	`user_id` text NOT NULL,
	`permission_id` text NOT NULL,
	PRIMARY KEY(`permission_id`, `user_id`),
	FOREIGN KEY (`user_id`) REFERENCES `wb_users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`permission_id`) REFERENCES `wb_permissions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_wb_cron_jobs_run` ON `wb_cron_jobs` (`status`,`next_run_at`);--> statement-breakpoint
CREATE INDEX `idx_wb_cron_jobs_type` ON `wb_cron_jobs` (`task_type`);--> statement-breakpoint
CREATE INDEX `idx_wb_up_user` ON `wb_user_permissions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_wb_up_perm` ON `wb_user_permissions` (`permission_id`);