import { FastifyInstance } from "fastify";
import { db } from "@/db";
import * as s from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function gradesRoutes(app: FastifyInstance) {
  // --- GRADES ---
  app.get("/api/grades", { onRequest: [app.authenticate] }, async (request) => {
    const { courseId, subjectId, studentId } = request.query as {
      courseId?: string;
      subjectId?: string;
      studentId?: string;
    };

    const filters = [];
    if (courseId) filters.push(eq(s.grades.courseId, courseId));
    if (subjectId) filters.push(eq(s.grades.subjectId, subjectId));
    if (studentId) filters.push(eq(s.grades.studentId, studentId));

    return db
      .select({
        id: s.grades.id,
        studentId: s.grades.studentId,
        studentName: sql<string>`${s.students.firstName} || ' ' || ${s.students.lastName}`,
        courseCode: s.courses.code,
        subjectId: s.grades.subjectId,
        subjectCode: s.subjects.code,
        subjectTitle: s.subjects.title,
        courseId: s.grades.courseId,
        prelim: s.grades.prelim,
        midterm: s.grades.midterm,
        finals: s.grades.finals,
        finalGrade: s.grades.finalGrade,
        remarks: s.grades.remarks,
      })
      .from(s.grades)
      .innerJoin(s.students, eq(s.grades.studentId, s.students.id))
      .innerJoin(s.subjects, eq(s.grades.subjectId, s.subjects.id))
      .innerJoin(s.courses, eq(s.grades.courseId, s.courses.id))
      .where(filters.length > 0 ? and(...filters) : undefined);
  });

  app.post("/api/grades", { onRequest: [app.authenticate] }, async (request, reply) => {
    const body = request.body as any;
    const { id: userId } = (request as any).user;

    const values = {
      studentId: body.studentId,
      subjectId: body.subjectId,
      courseId: body.courseId,
      prelim: body.prelim,
      midterm: body.midterm,
      finals: body.finals,
      finalGrade: body.finalGrade,
      remarks: Number(body.finalGrade) <= 3.0 ? "PASSED" : "FAILED",
      encodedByUserId: userId,
    };

    const result = await db
      .insert(s.grades)
      .values(values)
      .onConflictDoUpdate({
        target: [s.grades.studentId, s.grades.subjectId, s.grades.courseId],
        set: values,
      })
      .returning();

    return result[0];
  });

  app.patch("/api/grades/:id", { onRequest: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;

    const updated = await db
      .update(s.grades)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(s.grades.id, id))
      .returning();

    if (!updated.length) return reply.status(404).send({ message: "Grade record not found" });
    return updated[0];
  });
}
