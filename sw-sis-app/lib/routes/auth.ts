import { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import { db } from "@/db";
import * as s from "@/db/schema";
import { eq } from "drizzle-orm";

export async function authRoutes(app: FastifyInstance) {
  // --- AUTH ROUTES ---

  // Login - Issues JWT token as secure httpOnly cookie
  app.post("/api/auth/login", async (request, reply) => {
    const { email, password } = request.body as any;

    if (!email || !password) {
      return reply.status(400).send({ message: "Email and password required" });
    }

    try {
      // Optimized: select only needed columns and use LIMIT 1
      const users = await db
        .select({ id: s.users.id, email: s.users.email, passwordHash: s.users.passwordHash, role: s.users.role })
        .from(s.users)
        .where(eq(s.users.email, email))
        .limit(1);

      if (!users.length) {
        return reply.status(401).send({ message: "Invalid credentials" });
      }

      const passwordMatch = await bcrypt.compare(password, users[0].passwordHash);
      if (!passwordMatch) {
        return reply.status(401).send({ message: "Invalid credentials" });
      }

      // Sign JWT with user ID, email, and role
      const token = app.jwt.sign({ id: users[0].id, email: users[0].email, role: users[0].role });

      // Set secure httpOnly cookie
      return reply
        .setCookie("token", token, {
          path: "/",
          httpOnly: true, // Prevents JavaScript from accessing the cookie
          secure: process.env.NODE_ENV === "production", // HTTPS only in production
          sameSite: "lax", // CSRF protection
          maxAge: 86400, // 1 day in seconds
        })
        .send({ message: "Login successful", user: { id: users[0].id, email: users[0].email, role: users[0].role } });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ message: "Server error during login" });
    }
  });

  // Logout - Clears the auth cookie
  app.post("/api/auth/logout", async (request, reply) => {
    return reply.clearCookie("token", { path: "/" }).send({ message: "Logged out successfully" });
  });

  // Verify - Check if current session is valid (protected endpoint)
  app.get("/api/auth/verify", { onRequest: [app.authenticate] }, async (request) => {
    // If authentication middleware passed, request.user contains the JWT payload
    const user = request.user as any;
    return {
      valid: true,
      user: {
        id: user.id,
        email: user.email,
      },
    };
  });

  // Get current user info (protected endpoint)
  app.get("/api/auth/me", { onRequest: [app.authenticate] }, async (request) => {
    const user = request.user as any;
    const userRecord = await db
      .select({ id: s.users.id, email: s.users.email, role: s.users.role })
      .from(s.users)
      .where(eq(s.users.id, user.id))
      .limit(1);

    if (!userRecord.length) {
      return { user: null };
    }

    return { user: userRecord[0] };
  });
}
