CREATE TABLE `progress` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`student_id` integer NOT NULL,
	`level` text DEFAULT '기초' NOT NULL,
	`stage` integer DEFAULT 1 NOT NULL,
	`diagnostic_score` integer DEFAULT 0 NOT NULL,
	`lyrics` text DEFAULT '' NOT NULL,
	`theme` text DEFAULT '우리 동네' NOT NULL,
	`rhythm` text DEFAULT '세마치' NOT NULL,
	`tempo` integer DEFAULT 92 NOT NULL,
	`dynamics` text DEFAULT '보통' NOT NULL,
	`timbre` text DEFAULT '소리북' NOT NULL,
	`reflection` text DEFAULT '' NOT NULL,
	`help_needed` integer DEFAULT false NOT NULL,
	`agency` integer DEFAULT 0 NOT NULL,
	`creativity` integer DEFAULT 0 NOT NULL,
	`communication` integer DEFAULT 0 NOT NULL,
	`responsibility` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `progress_student_id_idx` ON `progress` (`student_id`);--> statement-breakpoint
CREATE TABLE `students` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`student_no` text NOT NULL,
	`nickname` text NOT NULL,
	`pin_hash` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `students_student_no_idx` ON `students` (`student_no`);