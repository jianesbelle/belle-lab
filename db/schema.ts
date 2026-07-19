import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const students = sqliteTable("students", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studentNo: text("student_no").notNull(),
  nickname: text("nickname").notNull(),
  pinHash: text("pin_hash").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("students_student_no_idx").on(table.studentNo)]);

export const progress = sqliteTable("progress", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studentId: integer("student_id").notNull().references(() => students.id),
  level: text("level").notNull().default("기초"),
  stage: integer("stage").notNull().default(1),
  diagnosticScore: integer("diagnostic_score").notNull().default(0),
  lyrics: text("lyrics").notNull().default(""),
  theme: text("theme").notNull().default("우리 동네"),
  rhythm: text("rhythm").notNull().default("세마치"),
  tempo: integer("tempo").notNull().default(92),
  dynamics: text("dynamics").notNull().default("보통"),
  timbre: text("timbre").notNull().default("소리북"),
  reflection: text("reflection").notNull().default(""),
  helpNeeded: integer("help_needed", { mode: "boolean" }).notNull().default(false),
  agency: integer("agency").notNull().default(0),
  creativity: integer("creativity").notNull().default(0),
  communication: integer("communication").notNull().default(0),
  responsibility: integer("responsibility").notNull().default(0),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("progress_student_id_idx").on(table.studentId)]);
