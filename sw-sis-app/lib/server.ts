import Fastify, { FastifyRequest, FastifyReply } from "fastify";
import jwt from "@fastify/jwt";
import cookie from "@fastify/cookie";
import bcrypt from "bcrypt";
import { db } from "@/db";
import * as s from "@/db/schema";
import { ilike, eq, inArray, and, sql } from "drizzle-orm";

declare module "fastify" {
    export interface FastifyInstance {
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }
}

// --- CIRCULAR PREREQUISITE CHECKER ---
async function isCircular(startId: string, targetId: string): Promise<boolean> {
    const current = await db.select().from(s.subjectPrerequisites).where(eq(s.subjectPrerequisites.subjectId, startId));

    for (const row of current) {
        if (row.prerequisiteSubjectId === targetId) return true;
        if (await isCircular(row.prerequisiteSubjectId, targetId)) return true;
    }
    return false;
}

export const app = Fastify({ logger: true });

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error("CRITICAL: JWT_SECRET environment variable is not defined!");
}

app.register(cookie);

app.register(jwt, {
    secret: JWT_SECRET,
    cookie: {
        cookieName: "token",
        signed: false,
    },
});

app.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        // Looks for token in Cookies OR Authorization Header
        await request.jwtVerify();
    } catch (err) {
        reply.status(401).send({ message: "Session expired or invalid" });
    }
});

// --- AUTH ROUTES ---
app.post("/api/auth/login", async (request, reply) => {
    const { email, password } = request.body as any;
    const users = await db.select().from(s.users).where(eq(s.users.email, email));

    if (!users.length || !(await bcrypt.compare(password, users[0].passwordHash))) {
        return reply.status(401).send({ message: "Invalid credentials" });
    }

    const token = app.jwt.sign({ id: users[0].id, email: users[0].email });

    return reply
        .setCookie("token", token, {
            path: "/",
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 86400, // 1 day
        })
        .send({ message: "Login successful", user: { email: users[0].email } });
});

app.post("/api/auth/logout", async (request, reply) => {
    return reply.clearCookie("token", { path: "/" }).send({ message: "Logged out" });
});

// --- PROTECTED DATA ROUTES ---
// STUDENTS
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

        // Simple validation
        if (!body.firstName || !body.lastName || !body.email) {
            return reply.status(400).send({ message: "Missing required fields" });
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
                courseId: "38468dd8-15d3-49b1-ba9e-b7281ecff469", // ! Note: Hardcoded Course ID for now
            })
            .returning();

        return reply.status(201).send(newStudent[0]);
    } catch (err) {
        console.error("Insert error:", err);
        return reply.status(500).send({ message: "Failed to create student" });
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

// COURSES
app.get("/api/courses", { onRequest: [app.authenticate] }, async (req) => {
    const { search } = req.query as { search?: string };

    return db
        .select()
        .from(s.courses)
        .where(search ? ilike(s.courses.name, `%${search}%`) : undefined);
});

app.post("/api/courses", { onRequest: [app.authenticate] }, async (request, reply) => {
    try {
        const body = request.body as any;

        if (!body.code || !body.name) {
            return reply.status(400).send({ message: "Code and name are required" });
        }

        // Check duplicate code
        const existing = await db.select().from(s.courses).where(eq(s.courses.code, body.code));

        if (existing.length) {
            return reply.status(400).send({ message: "Course code already exists" });
        }

        const newCourse = await db
            .insert(s.courses)
            .values({
                code: body.code,
                name: body.name,
                description: body.description,
            })
            .returning();

        return reply.status(201).send(newCourse[0]);
    } catch (err) {
        return reply.status(500).send({ message: "Failed to create course" });
    }
});

app.patch("/api/courses/:id", { onRequest: [app.authenticate] }, async (request, reply) => {
    try {
        const { id } = request.params as { id: string };
        const body = request.body as any;

        // Prevent duplicate code
        const existing = await db.select().from(s.courses).where(eq(s.courses.code, body.code));

        if (existing.length && existing[0].id !== id) {
            return reply.status(400).send({ message: "Course code already exists" });
        }

        const updated = await db
            .update(s.courses)
            .set({
                code: body.code,
                name: body.name,
                description: body.description,
            })
            .where(eq(s.courses.id, id))
            .returning();

        if (!updated.length) {
            return reply.status(404).send({ message: "Course not found" });
        }

        return updated[0];
    } catch {
        return reply.status(500).send({ message: "Failed to update course" });
    }
});

// Delete a single course
app.delete("/api/courses/:id", { onRequest: [app.authenticate] }, async (request, reply) => {
    try {
        const { id } = request.params as { id: string };

        await db.delete(s.courses).where(eq(s.courses.id, id));

        return { message: "Course deleted" };
    } catch {
        return reply.status(500).send({ message: "Failed to delete course" });
    }
});

// Bulk delete
app.delete("/api/courses", { onRequest: [app.authenticate] }, async (request, reply) => {
    try {
        const { ids } = request.body as { ids: string[] };

        if (!ids?.length) {
            return reply.status(400).send({ message: "No IDs provided" });
        }

        await db.delete(s.courses).where(inArray(s.courses.id, ids));

        return { message: "Courses deleted" };
    } catch {
        return reply.status(500).send({ message: "Failed to delete courses" });
    }
});

// SUBJECTS
app.get("/api/subjects", { onRequest: [app.authenticate] }, async (req) => {
    const { search } = req.query as { search?: string };

    return db
        .select()
        .from(s.subjects)
        .where(search ? ilike(s.subjects.title, `%${search}%`) : undefined);
});

app.post("/api/subjects", { onRequest: [app.authenticate] }, async (request, reply) => {
    try {
        const body = request.body as any;
        if (!body.code || !body.title || body.units === undefined) {
            return reply.status(400).send({ message: "Code, title, and units are required" });
        }

        const newSubject = await db
            .insert(s.subjects)
            .values({
                code: body.code,
                title: body.title,
                units: Number(body.units),
                courseId: "4d68eef9-2ace-4340-a1a1-f08ce65603f9", // ! Note: Hardcoded Course ID for now
            })
            .returning();

        return reply.status(201).send(newSubject[0]);
    } catch (err) {
        return reply.status(500).send({ message: "Failed to create subject" });
    }
});

app.patch("/api/subjects/:id", { onRequest: [app.authenticate] }, async (request, reply) => {
    try {
        const { id } = request.params as { id: string };
        const body = request.body as any;

        const updated = await db
            .update(s.subjects)
            .set({
                code: body.code,
                title: body.title,
                units: Number(body.units),
            })
            .where(eq(s.subjects.id, id))
            .returning();

        if (!updated.length) return reply.status(404).send({ message: "Subject not found" });
        return updated[0];
    } catch {
        return reply.status(500).send({ message: "Failed to update subject" });
    }
});

// Delete a single subject
app.delete("/api/subjects/:id", { onRequest: [app.authenticate] }, async (request, reply) => {
    try {
        const { id } = request.params as { id: string };
        await db.delete(s.subjects).where(eq(s.subjects.id, id));
        return { message: "Subject deleted" }; // ! Note: might need to cascade delete related prerequisites, reservations, etc
    } catch {
        return reply.status(500).send({ message: "Failed to delete subject" });
    }
});

// Bulk delete
app.delete("/api/subjects", { onRequest: [app.authenticate] }, async (request, reply) => {
    try {
        const { ids } = request.body as { ids: string[] };
        if (!ids?.length) return reply.status(400).send({ message: "No IDs provided" });
        await db.delete(s.subjects).where(inArray(s.subjects.id, ids));
        return { message: "Subjects deleted" };
    } catch {
        return reply.status(500).send({ message: "Failed to delete subjects" });
    }
});

// --- PREREQUISITE ROUTES ---
app.get("/api/subjects/:id/prerequisites", { onRequest: [app.authenticate] }, async (req) => {
    const { id } = req.params as { id: string };
    return db
        .select({
            id: s.subjects.id,
            code: s.subjects.code,
            title: s.subjects.title,
        })
        .from(s.subjectPrerequisites)
        .innerJoin(s.subjects, eq(s.subjectPrerequisites.prerequisiteSubjectId, s.subjects.id))
        .where(eq(s.subjectPrerequisites.subjectId, id));
});

app.post("/api/subjects/:id/prerequisites", { onRequest: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { prerequisiteSubjectId } = request.body as { prerequisiteSubjectId: string };

    if (id === prerequisiteSubjectId) {
        return reply.status(400).send({ message: "A subject cannot be its own prerequisite" });
    }

    const [targetSubject, prereqSubject] = await Promise.all([
        db.select().from(s.subjects).where(eq(s.subjects.id, id)).limit(1),
        db.select().from(s.subjects).where(eq(s.subjects.id, prerequisiteSubjectId)).limit(1),
    ]);

    if (!targetSubject[0] || !prereqSubject[0]) {
        return reply.status(404).send({ message: "Subject not found" });
    }

    // COURSE ID CHECK
    if (targetSubject[0].courseId !== prereqSubject[0].courseId) {
        return reply.status(400).send({
            message: "Prerequisites must belong to the same course.",
        });
    }

    // Circular Check
    const circular = await isCircular(prerequisiteSubjectId, id);
    if (circular) {
        return reply.status(400).send({ message: "Circular prerequisite detected!" });
    }

    try {
        await db.insert(s.subjectPrerequisites).values({
            subjectId: id,
            prerequisiteSubjectId,
        });
        return { message: "Prerequisite added" };
    } catch (err) {
        return reply.status(400).send({ message: "Prerequisite already exists" });
    }
});

app.delete("/api/subjects/:id/prerequisites/:prereqId", { onRequest: [app.authenticate] }, async (req) => {
    const { id, prereqId } = req.params as { id: string; prereqId: string };
    await db
        .delete(s.subjectPrerequisites)
        .where(
            and(eq(s.subjectPrerequisites.subjectId, id), eq(s.subjectPrerequisites.prerequisiteSubjectId, prereqId)),
        );
    return { message: "Prerequisite removed" };
});

// RESERVATIONS
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

// GRADES
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
