import { FastifyInstance } from "fastify";
import { db } from "@/db";
import * as s from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { logAudit, computeChanges } from "@/lib/audit";
import { calculateFinalGrade } from "@/lib/grades";

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

    // Check if grade already exists for this student/subject/course
    const existingGrade = await db
      .select()
      .from(s.grades)
      .where(
        and(
          eq(s.grades.studentId, body.studentId),
          eq(s.grades.subjectId, body.subjectId),
          eq(s.grades.courseId, body.courseId),
        ),
      )
      .limit(1);

    const isUpdate = existingGrade.length > 0;

    // Calculate final grade using weighted average
    const { finalGrade, remarks } = calculateFinalGrade(body.prelim, body.midterm, body.finals);

    const values = {
      studentId: body.studentId,
      subjectId: body.subjectId,
      courseId: body.courseId,
      prelim: body.prelim,
      midterm: body.midterm,
      finals: body.finals,
      finalGrade,
      remarks,
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

    // Log the appropriate action
    const gradeId = result[0].id;
    if (isUpdate) {
      // Log UPDATE with before/after values
      const fieldsToTrack = ["prelim", "midterm", "finals", "finalGrade", "remarks"];
      const changes = computeChanges(existingGrade[0], values, fieldsToTrack);
      await logAudit({
        userId,
        action: "UPDATE",
        entityType: "grade",
        entityId: gradeId,
        changes,
      });
    } else {
      // Log CREATE with new values
      await logAudit({
        userId,
        action: "CREATE",
        entityType: "grade",
        entityId: gradeId,
        changes: {
          prelim: { old: null, new: body.prelim },
          midterm: { old: null, new: body.midterm },
          finals: { old: null, new: body.finals },
          finalGrade: { old: null, new: finalGrade },
          remarks: { old: null, new: remarks },
        },
      });
    }

    return result[0];
  });

  app.patch("/api/grades/:id", { onRequest: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;
    const { id: userId } = (request as any).user;

    // Fetch old grade for audit log
    const oldGrade = await db
      .select()
      .from(s.grades)
      .where(eq(s.grades.id, id))
      .limit(1);

    if (!oldGrade.length) {
      return reply.status(404).send({ message: "Grade record not found" });
    }

    const updated = await db
      .update(s.grades)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(s.grades.id, id))
      .returning();

    // Log the UPDATE operation if there were actual changes
    const fieldsToTrack = ["prelim", "midterm", "finals", "finalGrade", "remarks"];
    const changes = computeChanges(oldGrade[0], updated[0], fieldsToTrack);

    if (Object.keys(changes).length > 0) {
      await logAudit({
        userId,
        action: "UPDATE",
        entityType: "grade",
        entityId: id,
        changes,
      });
    }

    return updated[0];
  });
}
