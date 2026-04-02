import { FastifyInstance } from "fastify";
import { db } from "@/db";
import * as s from "@/db/schema";
import { ilike, eq, inArray, and, sql } from "drizzle-orm";
import { checkPrerequisites } from "./utils";

export async function studentsRoutes(app: FastifyInstance) {
    app.get("/api/students", { onRequest: [app.authenticate] }, async (req) => {
        const { search } = req.query as { search?: string };
        return db
            .select()
            .from(s.students)
            .where(search ? ilike(s.students.firstName, `%${search}%`) : undefined);
    });

    app.post("/api/students", { onRequest: [app.authenticate] }, async (request, reply) => {
        try {
            const body = request.body as any;

            // Validation
            if (!body.firstName || !body.lastName || !body.email || !body.courseId) {
                return reply
                    .status(400)
                    .send({ message: "Missing required fields: firstName, lastName, email, courseId" });
            }

            // Verify course exists
            const course = await db.select().from(s.courses).where(eq(s.courses.id, body.courseId)).limit(1);
            if (!course.length) {
                return reply.status(404).send({ message: "Course not found" });
            }

            // Generate a unique student number (e.g., 2026-1711900000)
            const studentNo = `2026-${Date.now().toString().slice(-6)}`; // ! Note: Need a more robust generation strategy for production

            const newStudent = await db
                .insert(s.students)
                .values({
                    studentNo,
                    firstName: body.firstName,
                    lastName: body.lastName,
                    email: body.email,
                    birthDate: body.birthDate,
                    courseId: body.courseId,
                })
                .returning();

            return reply.status(201).send(newStudent[0]);
        } catch (err) {
            console.error("Insert error:", err);
            return reply.status(500).send({ message: "Failed to create student" });
        }
    });

    // CSV Import endpoint
    app.post("/api/students/import", { onRequest: [app.authenticate] }, async (request, reply) => {
        try {
            const body = request.body as any;

            if (!Array.isArray(body) || body.length === 0) {
                return reply.status(400).send({ message: "Invalid CSV data: expected array of student records" });
            }

            // Validate and transform records
            const records = body.map((row: any) => {
                if (!row.firstName || !row.lastName || !row.email || !row.courseId) {
                    throw new Error(`Invalid record: missing required fields (firstName, lastName, email, courseId)`);
                }
                return {
                    studentNo: `2026-${Date.now().toString().slice(-10)}-${Math.random().toString(36).substring(7)}`,
                    firstName: row.firstName,
                    lastName: row.lastName,
                    email: row.email,
                    birthDate: row.birthDate || null,
                    courseId: row.courseId,
                };
            });

            // Verify all courses exist
            const courseIds = [...new Set(records.map((r: any) => r.courseId))];
            const courses = await db
                .select({ id: s.courses.id })
                .from(s.courses)
                .where(inArray(s.courses.id, courseIds));

            if (courses.length !== courseIds.length) {
                return reply.status(404).send({ message: "One or more courses not found" });
            }

            // Insert all records
            const inserted = await db.insert(s.students).values(records).returning();

            return reply.status(201).send({
                message: `Successfully imported ${inserted.length} students`,
                students: inserted,
            });
        } catch (err: any) {
            console.error("CSV Import error:", err);
            return reply.status(400).send({ message: `Failed to import: ${err.message}` });
        }
    });

    app.patch("/api/students/:studentNo", { onRequest: [app.authenticate] }, async (request, reply) => {
        try {
            const { studentNo } = request.params as { studentNo: string };
            const body = request.body as any;

            const updatedStudent = await db
                .update(s.students)
                .set({
                    firstName: body.firstName,
                    lastName: body.lastName,
                    email: body.email,
                    birthDate: body.birthDate,
                    // ! Note: Add courseId
                })
                .where(eq(s.students.studentNo, studentNo))
                .returning();

            if (updatedStudent.length === 0) {
                return reply.status(404).send({ message: "Student not found" });
            }

            return updatedStudent[0];
        } catch (err) {
            return reply.status(500).send({ message: "Failed to update student" });
        }
    });

    // Delete a single student
    app.delete("/api/students/:studentNo", { onRequest: [app.authenticate] }, async (request, reply) => {
        try {
            const { studentNo } = request.params as { studentNo: string };
            const deleted = await db.delete(s.students).where(eq(s.students.studentNo, studentNo)).returning();

            if (deleted.length === 0) return reply.status(404).send({ message: "Student not found" });

            return { message: "Student deleted successfully" };
        } catch (err) {
            console.error(err);
            return reply.status(500).send({ message: "Failed to delete student" });
        }
    });

    // Bulk delete
    app.delete("/api/students", { onRequest: [app.authenticate] }, async (request, reply) => {
        try {
            const { studentNos } = request.body as { studentNos: string[] };

            if (!Array.isArray(studentNos) || studentNos.length === 0) {
                return reply.status(400).send({ message: "No student IDs provided" });
            }

            await db.delete(s.students).where(inArray(s.students.studentNo, studentNos));

            return { message: `Deleted ${studentNos.length} students successfully` };
        } catch (err) {
            console.error(err);
            return reply.status(500).send({ message: "Failed to delete students" });
        }
    });

    app.get("/api/students/:id/profile", { onRequest: [app.authenticate] }, async (request) => {
        const { id } = request.params as { id: string };

        const [result] = await db
            .select({
                id: s.students.id,
                studentNo: s.students.studentNo,
                firstName: s.students.firstName,
                lastName: s.students.lastName,
                email: s.students.email,
                birthDate: s.students.birthDate,
                courseId: s.students.courseId,
                courseName: s.courses.name,
            })
            .from(s.students)
            .innerJoin(s.courses, eq(s.students.courseId, s.courses.id))
            .where(eq(s.students.id, id));

        if (!result) return { student: null, reservations: [], grades: [] };

        const reservations = await db
            .select({
                id: s.subjectReservations.id,
                subjectId: s.subjects.id,
                code: s.subjects.code,
                title: s.subjects.title,
            })
            .from(s.subjectReservations)
            .innerJoin(s.subjects, eq(s.subjectReservations.subjectId, s.subjects.id))
            .where(eq(s.subjectReservations.studentId, id));

        const grades = await db
            .select({
                id: s.grades.id,
                subjectId: s.subjects.id,
                subjectCode: s.subjects.code,
                subjectTitle: s.subjects.title,

                prelim: s.grades.prelim,
                midterm: s.grades.midterm,
                finals: s.grades.finals,
                finalGrade: s.grades.finalGrade,

                remarks: s.grades.remarks,
            })
            .from(s.grades)
            .innerJoin(s.subjects, eq(s.grades.subjectId, s.subjects.id))
            .where(eq(s.grades.studentId, id));

        return {
            student: result,
            reservations,
            grades,
        };
    });

    app.post("/api/students/:id/reservations", { onRequest: [app.authenticate] }, async (request, reply) => {
        const { id } = request.params as { id: string };
        const { subjectId } = request.body as { subjectId: string };

        // Optimized: select only needed columns
        const [student, subject] = await Promise.all([
            db
                .select({ id: s.students.id, courseId: s.students.courseId })
                .from(s.students)
                .where(eq(s.students.id, id))
                .limit(1),
            db
                .select({ id: s.subjects.id, courseId: s.subjects.courseId })
                .from(s.subjects)
                .where(eq(s.subjects.id, subjectId))
                .limit(1),
        ]);

        if (!student.length || !subject.length) {
            return reply.status(404).send({ message: "Student or subject not found" });
        }

        if (student[0].courseId !== subject[0].courseId) {
            return reply.status(400).send({ message: "Subject doesn't match student's course." });
        }

        // Check prerequisites using shared utility
        const prereqCheck = await checkPrerequisites(id, subjectId);
        if (!prereqCheck.valid) {
            return reply.status(400).send({
                message: `Missing prerequisites: [${prereqCheck.missing?.join(", ")}]`,
            });
        }

        try {
            await db.insert(s.subjectReservations).values({ studentId: id, subjectId });
            return { success: true };
        } catch {
            return reply.status(400).send({ message: "Already reserved." });
        }
    });

    app.delete(
        "/api/students/:id/reservations/:reservationId",
        { onRequest: [app.authenticate] },
        async (request, reply) => {
            const { id, reservationId } = request.params as { id: string; reservationId: string };

            const deleted = await db
                .delete(s.subjectReservations)
                .where(and(eq(s.subjectReservations.id, reservationId), eq(s.subjectReservations.studentId, id)))
                .returning();

            if (!deleted.length) {
                return reply.status(404).send({ message: "Reservation not found" });
            }

            return { success: true };
        },
    );
}
