import Fastify, { FastifyRequest, FastifyReply } from "fastify";
import jwt from "@fastify/jwt";
import cookie from "@fastify/cookie";
import { registerRoutes } from "./routes";

declare module "@fastify/jwt" {
    interface FastifyJWT {
        user: { id: string; email: string; role: string };
    }
}

export interface AuthenticatedRequest extends FastifyRequest {
    user: { id: string; email: string; role: string };
}

declare module "fastify" {
    export interface FastifyInstance {
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
        requireRole: (role: string) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }
}

export const app = Fastify({ logger: true });

const JWT_SECRET = process.env.JWT_SECRET;
const NODE_ENV = process.env.NODE_ENV || "development";

if (!JWT_SECRET) {
    throw new Error("CRITICAL: JWT_SECRET environment variable is not defined!");
}

if (JWT_SECRET.length < 32) {
    console.warn("WARNING: JWT_SECRET is less than 32 characters. For production, use a stronger secret.");
}

app.register(cookie, {
    secret: process.env.COOKIE_SECRET || JWT_SECRET,
});

app.register(jwt, {
    secret: JWT_SECRET,
    sign: {
        expiresIn: "24h",
    },
    cookie: {
        cookieName: "token",
        signed: false,
    },
});

app.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        // Verify JWT from cookie or Authorization header
        await request.jwtVerify();
    } catch (err) {
        // Log unauthorized attempts in production
        if (NODE_ENV === "production") {
            app.log.warn({ path: request.url, method: request.method }, "Unauthorized access attempt");
        }
        return reply.status(401).send({ message: "Session expired or invalid" });
    }
});

app.decorate("requireRole", (role: string) => async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        await request.jwtVerify();
        const user = request.user as { id: string; email: string; role: string };
        if (user?.role !== role && user?.role !== "admin") {
            return reply.status(403).send({ message: `Access denied. Required role: ${role}` });
        }
    } catch (err) {
        return reply.status(401).send({ message: "Session expired or invalid" });
    }
});

app.get("/api/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
});

await registerRoutes(app);
