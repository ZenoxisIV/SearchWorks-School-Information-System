import { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import { db } from "@/db";
import * as s from "@/db/schema";
import { eq } from "drizzle-orm";

export async function authRoutes(app: FastifyInstance) {
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
}
