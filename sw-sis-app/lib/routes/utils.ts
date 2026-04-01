import { db } from "@/db";
import * as s from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Check if a student meets all prerequisite requirements for a subject
 * Returns { valid: true } if all prerequisites are met
 * Returns { valid: false, missing: [...codes] } if prerequisites are missing
 */
export async function checkPrerequisites(studentId: string, subjectId: string): Promise<{ valid: boolean; missing?: string[] }> {
  const prereqs = await db
    .select({ id: s.subjects.id, code: s.subjects.code })
    .from(s.subjectPrerequisites)
    .innerJoin(s.subjects, eq(s.subjectPrerequisites.prerequisiteSubjectId, s.subjects.id))
    .where(eq(s.subjectPrerequisites.subjectId, subjectId));

  if (prereqs.length === 0) {
    return { valid: true };
  }

  // Fetch passed grades in single query
  const passed = await db
    .select({ subjectId: s.grades.subjectId })
    .from(s.grades)
    .where(and(eq(s.grades.studentId, studentId), eq(s.grades.remarks, "PASSED")));

  const passedIds = new Set(passed.map((p) => p.subjectId));
  const missing = prereqs.filter((p) => !passedIds.has(p.id)).map((p) => p.code);

  return {
    valid: missing.length === 0,
    missing: missing.length > 0 ? missing : undefined,
  };
}

/**
 * Iterative circular dependency checker for prerequisites
 * Uses BFS to avoid stack overflow from recursive calls
 */
export async function isCircularPrerequisite(startId: string, targetId: string): Promise<boolean> {
  const visited = new Set<string>();
  const queue = [startId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    const prereqs = await db
      .select({ prerequisiteSubjectId: s.subjectPrerequisites.prerequisiteSubjectId })
      .from(s.subjectPrerequisites)
      .where(eq(s.subjectPrerequisites.subjectId, current));

    for (const row of prereqs) {
      if (row.prerequisiteSubjectId === targetId) return true;
      queue.push(row.prerequisiteSubjectId);
    }
  }
  return false;
}
