import { FastifyInstance } from "fastify";
import { db } from "@/db";
import * as s from "@/db/schema";
import { ilike, eq, inArray } from "drizzle-orm";

export async function coursesRoutes(app: FastifyInstance) {
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

  app.get("/api/courses/:id/subjects", { onRequest: [app.authenticate] }, async (req) => {
    const { id } = req.params as { id: string };

    const subjects = await db
      .select({
        id: s.subjects.id,
        code: s.subjects.code,
        title: s.subjects.title,
      })
      .from(s.subjects)
      .where(eq(s.subjects.courseId, id));

    const subjectsWithPrereqs = await Promise.all(
      subjects.map(async (sub) => {
        const prereqs = await db
          .select({
            prerequisiteSubjectId: s.subjects.id,
            prerequisiteCode: s.subjects.code,
          })
          .from(s.subjectPrerequisites)
          .innerJoin(s.subjects, eq(s.subjectPrerequisites.prerequisiteSubjectId, s.subjects.id))
          .where(eq(s.subjectPrerequisites.subjectId, sub.id));

        return {
          ...sub,
          prerequisites: prereqs,
        };
      }),
    );

    return subjectsWithPrereqs;
  });
}
