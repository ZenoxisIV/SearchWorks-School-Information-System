import { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

// Middleware to check admin role
const requireAdmin = async (request: any, reply: any) => {
    try {
        await request.jwtVerify();
        if (request.user?.role !== "admin") {
            return reply.status(403).send({ message: "Only admins can access user management" });
        }
    } catch (err) {
        return reply.status(401).send({ message: "Unauthorized" });
    }
};

export async function usersRoutes(app: FastifyInstance) {
    app.get("/api/users", { onRequest: [requireAdmin] }, async (request, reply) => {
        try {
            const allUsers = await db.select().from(users);
            return allUsers.map((u) => ({
                id: u.id,
                email: u.email,
                role: u.role,
                createdAt: u.createdAt,
                updatedAt: u.updatedAt,
            }));
        } catch (err: any) {
            app.log.error(err);
            return reply.status(500).send({ message: "Failed to fetch users" });
        }
    });

    app.post("/api/users", { onRequest: [requireAdmin] }, async (request, reply) => {
        try {
            const { email, password, role } = request.body as any;

            if (!email || !password || !role) {
                return reply.status(400).send({ message: "Email, password, and role are required" });
            }

            if (!["admin", "encoder"].includes(role)) {
                return reply.status(400).send({ message: "Role must be admin or encoder" });
            }

            const existingUser = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);

            if (existingUser.length > 0) {
                return reply.status(409).send({ message: "Email already exists" });
            }

            const passwordHash = await bcrypt.hash(password, 10);

            const newUser = await db
                .insert(users)
                .values({
                    email,
                    passwordHash,
                    role,
                })
                .returning();

            return reply.status(201).send({
                id: newUser[0].id,
                email: newUser[0].email,
                role: newUser[0].role,
                createdAt: newUser[0].createdAt,
            });
        } catch (err: any) {
            app.log.error(err);
            return reply.status(500).send({ message: "Failed to create user" });
        }
    });

    // PATCH /api/users/:id - Update user role (admin only)
    app.patch("/api/users/:id", { onRequest: [requireAdmin] }, async (request: any, reply) => {
        try {
            const { id } = request.params;
            const { role } = request.body as any;

            if (!role || !["admin", "encoder"].includes(role)) {
                return reply.status(400).send({ message: "Role must be admin or encoder" });
            }

            const user = await db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1);

            if (!user.length) {
                return reply.status(404).send({ message: "User not found" });
            }

            const updated = await db.update(users).set({ role }).where(eq(users.id, id)).returning();

            return updated[0];
        } catch (err: any) {
            app.log.error(err);
            return reply.status(500).send({ message: "Failed to update user" });
        }
    });

    app.delete("/api/users/:id", { onRequest: [requireAdmin] }, async (request: any, reply) => {
        try {
            const { id } = request.params;

            const user = await db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1);

            if (!user.length) {
                return reply.status(404).send({ message: "User not found" });
            }

            if (request.user?.id === id) {
                return reply.status(400).send({ message: "Cannot delete your own account" });
            }

            await db.delete(users).where(eq(users.id, id));

            return reply.status(204).send();
        } catch (err: any) {
            app.log.error(err);
            return reply.status(500).send({ message: "Failed to delete user" });
        }
    });

    // DELETE /api/users - Bulk delete users (admin only)
    app.delete("/api/users", { onRequest: [requireAdmin] }, async (request: any, reply) => {
        try {
            const { userIds } = request.body as any;

            if (!Array.isArray(userIds) || userIds.length === 0) {
                return reply.status(400).send({ message: "userIds must be a non-empty array" });
            }

            if (userIds.includes(request.user?.id as string)) {
                return reply.status(400).send({ message: "Cannot delete your own account" });
            }

            await db.delete(users).where(inArray(users.id, userIds));

            return reply.status(204).send();
        } catch (err: any) {
            app.log.error(err);
            return reply.status(500).send({ message: "Failed to delete users" });
        }
    });
}
