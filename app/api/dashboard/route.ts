import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { progress, students } from "../../../db/schema";

export async function GET() {
  try {
    const db = getDb();
    const rows = await db.select({
      id: students.id,
      studentNo: students.studentNo,
      nickname: students.nickname,
      level: progress.level,
      stage: progress.stage,
      helpNeeded: progress.helpNeeded,
      agency: progress.agency,
      creativity: progress.creativity,
      communication: progress.communication,
      responsibility: progress.responsibility,
      updatedAt: progress.updatedAt,
    }).from(students).leftJoin(progress, eq(students.id, progress.studentId)).orderBy(desc(progress.updatedAt));
    return Response.json({ students: rows });
  } catch {
    return Response.json({ students: [] });
  }
}
