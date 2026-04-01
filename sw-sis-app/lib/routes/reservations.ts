import { FastifyInstance } from "fastify";
import { db } from "@/db";
import * as s from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function reservationsRoutes(app: FastifyInstance) {
  // --- RESERVATIONS ---
  app.get("/api/reservations", async () => {
    return await db
      .select({
        id: s.subjectReservations.id,
        studentName: sql<string>`${s.students.firstName} || ' ' || ${s.students.lastName}`,
        subjectCode: s.subjects.code,
        subjectTitle: s.subjects.title,
      })
      .from(s.subjectReservations)
      .innerJoin(s.students, eq(s.subjectReservations.studentId, s.students.id))
      .innerJoin(s.subjects, eq(s.subjectReservations.subjectId, s.subjects.id));
  });

  app.post("/api/reservations", async (request, reply) => {
    const { studentId, subjectId } = request.body as { studentId: string; subjectId: string };

    const [student] = await db.select().from(s.students).where(eq(s.students.id, studentId));
    const [subject] = await db.select().from(s.subjects).where(eq(s.subjects.id, subjectId));

    if (!student || !subject) return reply.status(404).send({ message: "Not found" });
    if (student.courseId !== subject.courseId) {
      return reply.status(400).send({ message: "Subject doesn't match student's course." });
    }

    // PREREQUISITE CHECK
    const prereqs = await db
      .select({ id: s.subjects.id, code: s.subjects.code })
      .from(s.subjectPrerequisites)
      .innerJoin(s.subjects, eq(s.subjectPrerequisites.prerequisiteSubjectId, s.subjects.id))
      .where(eq(s.subjectPrerequisites.subjectId, subjectId));

    if (prereqs.length > 0) {
      const passed = await db
        .select()
        .from(s.grades)
        .where(and(eq(s.grades.studentId, studentId), eq(s.grades.remarks, "PASSED")));

      const passedIds = new Set(passed.map((p) => p.subjectId));
      const missing = prereqs.filter((p) => !passedIds.has(p.id));

      if (missing.length > 0) {
        return reply.status(400).send({
          message: `Missing prerequisites: [${missing.map((m) => m.code).join(", ")}]`,
        });
      }
    }

    try {
      await db.insert(s.subjectReservations).values({ studentId, subjectId });
      return { success: true };
    } catch {
      return reply.status(400).send({ message: "Already reserved." });
    }
  });

  app.delete("/api/reservations/:id", async (request) => {
    const { id } = request.params as { id: string };
    await db.delete(s.subjectReservations).where(eq(s.subjectReservations.id, id));
    return { success: true };
  });
}
