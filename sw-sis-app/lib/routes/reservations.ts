import { FastifyInstance } from "fastify";
import { db } from "@/db";
import * as s from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { checkPrerequisites } from "./utils";

export async function reservationsRoutes(app: FastifyInstance) {
  // --- RESERVATIONS ---
  app.get("/api/reservations", { onRequest: [app.authenticate] }, async () => {
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

  app.post("/api/reservations", { onRequest: [app.authenticate] }, async (request, reply) => {
    const { studentId, subjectId } = request.body as { studentId: string; subjectId: string };

    // Optimized: select only needed columns
    const [student, subject] = await Promise.all([
      db.select({ id: s.students.id, courseId: s.students.courseId }).from(s.students).where(eq(s.students.id, studentId)).limit(1),
      db.select({ id: s.subjects.id, courseId: s.subjects.courseId }).from(s.subjects).where(eq(s.subjects.id, subjectId)).limit(1),
    ]);

    if (!student.length || !subject.length) {
      return reply.status(404).send({ message: "Not found" });
    }

    if (student[0].courseId !== subject[0].courseId) {
      return reply.status(400).send({ message: "Subject doesn't match student's course." });
    }

    // Check prerequisites using shared utility
    const prereqCheck = await checkPrerequisites(studentId, subjectId);
    if (!prereqCheck.valid) {
      return reply.status(400).send({
        message: `Missing prerequisites: [${prereqCheck.missing?.join(", ")}]`,
      });
    }

    try {
      await db.insert(s.subjectReservations).values({ studentId, subjectId });
      return { success: true };
    } catch {
      return reply.status(400).send({ message: "Already reserved." });
    }
  });

  app.delete("/api/reservations/:id", { onRequest: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    await db.delete(s.subjectReservations).where(eq(s.subjectReservations.id, id));
    return { success: true };
  });
}
