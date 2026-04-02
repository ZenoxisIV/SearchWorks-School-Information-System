import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { db } from "@/db";
import * as s from "@/db/schema";
import { ilike, eq, inArray, and } from "drizzle-orm";
import { isCircularPrerequisite } from "./utils";

export async function subjectsRoutes(app: FastifyInstance) {
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
        const circular = await isCircularPrerequisite(prerequisiteSubjectId, id);
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
                and(
                    eq(s.subjectPrerequisites.subjectId, id),
                    eq(s.subjectPrerequisites.prerequisiteSubjectId, prereqId),
                ),
            );
        return { message: "Prerequisite removed" };
    });
}
