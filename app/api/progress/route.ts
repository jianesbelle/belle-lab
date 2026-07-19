import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { progress } from "../../../db/schema";

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const studentId = Number(body.studentId);
    if (!Number.isInteger(studentId) || studentId < 1) return Response.json({ error: "학생 정보가 필요합니다." }, { status: 400 });
    const values = {
      level: String(body.level ?? "기초").slice(0, 10),
      stage: Math.max(1, Math.min(5, Number(body.stage) || 1)),
      diagnosticScore: Math.max(0, Math.min(3, Number(body.diagnosticScore) || 0)),
      lyrics: String(body.lyrics ?? "").slice(0, 1200),
      theme: String(body.theme ?? "우리 동네").slice(0, 40),
      rhythm: String(body.rhythm ?? "세마치").slice(0, 20),
      tempo: Math.max(60, Math.min(140, Number(body.tempo) || 92)),
      dynamics: String(body.dynamics ?? "보통").slice(0, 20),
      timbre: String(body.timbre ?? "소리북").slice(0, 20),
      reflection: String(body.reflection ?? "").slice(0, 600),
      helpNeeded: Boolean(body.helpNeeded),
      agency: Math.max(0, Math.min(100, Number(body.agency) || 0)),
      creativity: Math.max(0, Math.min(100, Number(body.creativity) || 0)),
      communication: Math.max(0, Math.min(100, Number(body.communication) || 0)),
      responsibility: Math.max(0, Math.min(100, Number(body.responsibility) || 0)),
      updatedAt: new Date().toISOString(),
    };
    const db = getDb();
    const [saved] = await db.update(progress).set(values).where(eq(progress.studentId, studentId)).returning();
    return Response.json({ progress: saved });
  } catch {
    return Response.json({ error: "저장하지 못했어요." }, { status: 500 });
  }
}
