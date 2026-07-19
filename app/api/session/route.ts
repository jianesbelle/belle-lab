import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { progress, students } from "../../../db/schema";

async function hashPin(studentNo: string, pin: string) {
  const bytes = new TextEncoder().encode(`sorigyeol:${studentNo}:${pin}`);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { studentNo?: string; nickname?: string; pin?: string };
    const studentNo = body.studentNo?.trim() ?? "";
    const nickname = body.nickname?.trim() ?? "";
    const pin = body.pin?.trim() ?? "";
    if (!/^[0-9]{2,12}$/.test(studentNo) || nickname.length < 1 || nickname.length > 12 || !/^[0-9]{4}$/.test(pin)) {
      return Response.json({ error: "학번, 별명, 4자리 비밀번호를 확인해 주세요." }, { status: 400 });
    }
    const db = getDb();
    const pinHash = await hashPin(studentNo, pin);
    const [existing] = await db.select().from(students).where(eq(students.studentNo, studentNo)).limit(1);
    if (existing) {
      if (existing.pinHash !== pinHash) return Response.json({ error: "비밀번호가 맞지 않아요." }, { status: 401 });
      const [saved] = await db.select().from(progress).where(eq(progress.studentId, existing.id)).limit(1);
      return Response.json({ student: existing, progress: saved ?? null });
    }
    const [student] = await db.insert(students).values({ studentNo, nickname, pinHash }).returning();
    await db.insert(progress).values({ studentId: student.id });
    return Response.json({ student, progress: null, created: true }, { status: 201 });
  } catch {
    return Response.json({ error: "학습실에 연결하지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
