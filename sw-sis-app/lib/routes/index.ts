import { FastifyInstance } from "fastify";
import { authRoutes } from "./auth";
import { studentsRoutes } from "./students";
import { coursesRoutes } from "./courses";
import { subjectsRoutes } from "./subjects";
import { reservationsRoutes } from "./reservations";
import { gradesRoutes } from "./grades";

/**
 * Register all route modules with the Fastify app.
 * Routes are registered in dependency order to ensure proper initialization.
 */
export async function registerRoutes(app: FastifyInstance) {
  // Auth first (login/logout are most foundational)
  await app.register(authRoutes);

  // Data routes (non-dependent)
  await app.register(coursesRoutes);
  await app.register(subjectsRoutes);
  await app.register(studentsRoutes);

  // Dependent routes (depend on subjects and students)
  await app.register(reservationsRoutes);
  await app.register(gradesRoutes);
}
