import Fastify, { FastifyRequest, FastifyReply } from "fastify";
import jwt from "@fastify/jwt";
import cookie from "@fastify/cookie";
import bcrypt from "bcrypt";
import { db } from "@/db";
import * as s from "@/db/schema";
import { ilike, eq } from "drizzle-orm";

declare module "fastify" {
    export interface FastifyInstance {
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }
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
app.get("/api/students", { onRequest: [app.authenticate] }, async (req) => {
    const { search } = req.query as { search?: string };
    return db
        .select()
        .from(s.students)
        .where(search ? ilike(s.students.firstName, `%${search}%`) : undefined);
});

app.post('/api/students', { onRequest: [app.authenticate] }, async (request, reply) => {
  try {
    const body = request.body as any;
    
    // Simple validation
    if (!body.firstName || !body.lastName || !body.email) {
      return reply.status(400).send({ message: "Missing required fields" });
    }

    // Generate a unique student number (e.g., 2026-1711900000)
    const studentNo = `2026-${Date.now().toString().slice(-6)}`; // ! Note: Need a more robust generation strategy for production

    const newStudent = await db.insert(s.students).values({
      studentNo,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      birthDate: body.birthDate,
      courseId: "38468dd8-15d3-49b1-ba9e-b7281ecff469" // ! Note: Hardcoded Course ID for now
    }).returning();

    return reply.status(201).send(newStudent[0]);
  } catch (err) {
    console.error("Insert error:", err);
    return reply.status(500).send({ message: "Failed to create student" });
  }
});

app.patch('/api/students/:studentNo', { onRequest: [app.authenticate] }, async (request, reply) => {
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
        // Add courseId if it's still a required field in your schema
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