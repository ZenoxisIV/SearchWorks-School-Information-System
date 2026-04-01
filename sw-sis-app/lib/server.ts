import Fastify, { FastifyRequest, FastifyReply } from "fastify";
import jwt from "@fastify/jwt";
import cookie from "@fastify/cookie";
import { registerRoutes } from "./routes";

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

// Register all route modules
await registerRoutes(app);
