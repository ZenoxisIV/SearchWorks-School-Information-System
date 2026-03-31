import Fastify from 'fastify';
import { db } from '@/db';
import * as s from '@/db/schema';
import { ilike } from 'drizzle-orm';

export const app = Fastify({ logger: true });

// --- STUDENTS ---
app.get('/api/students', async (req) => {
  const { search } = req.query as { search?: string };
  return db.select().from(s.students)
    .where(search ? ilike(s.students.firstName, `%${search}%`) : undefined);
});
