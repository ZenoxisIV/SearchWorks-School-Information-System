import { FastifyInstance } from "fastify";
import { db } from "@/db";
import { auditLogs, users, grades, students, subjects } from "@/db/schema";
import { eq, gte, lte, ilike, desc, sql } from "drizzle-orm";

// Middleware to check admin role
const requireAdmin = async (request: any, reply: any) => {
    try {
        await request.jwtVerify();
        if (request.user?.role !== "admin") {
            return reply.status(403).send({ message: "Only admins can access audit logs" });
        }
    } catch (err) {
        return reply.status(401).send({ message: "Unauthorized" });
    }
};

export async function auditLogsRoutes(app: FastifyInstance) {
    app.get("/api/audit-logs", { onRequest: [requireAdmin] }, async (request: any, reply) => {
        try {
            const {
                fromDate,
                toDate,
                action,
                search,
                page = 1,
                limit = 10,
            } = request.query as {
                fromDate?: string;
                toDate?: string;
                action?: string;
                search?: string;
                page?: string;
                limit?: string;
            };

            const pageNum = Math.max(1, parseInt(page as string) || 1);
            const limitNum = Math.max(1, parseInt(limit as string) || 10);
            const offset = (pageNum - 1) * limitNum;

            const filters: any[] = [];

            // Date range filter
            if (fromDate) {
                const from = new Date(fromDate);
                filters.push(gte(auditLogs.createdAt, from));
            }
            if (toDate) {
                const to = new Date(toDate);
                // Add 1 day to include the entire day
                to.setDate(to.getDate() + 1);
                filters.push(lte(auditLogs.createdAt, to));
            }

            // Action filter
            if (action && ["CREATE", "UPDATE"].includes(action)) {
                filters.push(eq(auditLogs.action, action));
            }

            // Search by user email or student name
            if (search) {
                const searchTerm = `%${search}%`;
                filters.push(
                    sql`CONCAT(${students.firstName}, ' ', ${students.lastName}) ILIKE ${searchTerm} OR ${users.email} ILIKE ${searchTerm}`,
                );
            }

            // Get total count for pagination
            const countResult = await db
                .select({ count: sql<number>`COUNT(*)` })
                .from(auditLogs)
                .innerJoin(users, eq(auditLogs.userId, users.id))
                .innerJoin(grades, eq(auditLogs.entityId, grades.id))
                .innerJoin(students, eq(grades.studentId, students.id))
                .where(filters.length > 0 ? sql.join(filters, " AND ") : undefined);

            const total = countResult[0]?.count || 0;

            // Get paginated results with joins to get related data
            const logs = await db
                .select({
                    id: auditLogs.id,
                    action: auditLogs.action,
                    entityId: auditLogs.entityId,
                    changes: auditLogs.changes,
                    createdAt: auditLogs.createdAt,
                    userEmail: users.email,
                    studentName: sql<string>`${students.firstName} || ' ' || ${students.lastName}`,
                    studentNo: students.studentNo,
                    subjectCode: subjects.code,
                    subjectTitle: subjects.title,
                })
                .from(auditLogs)
                .innerJoin(users, eq(auditLogs.userId, users.id))
                .innerJoin(grades, eq(auditLogs.entityId, grades.id))
                .innerJoin(students, eq(grades.studentId, students.id))
                .innerJoin(subjects, eq(grades.subjectId, subjects.id))
                .where(filters.length > 0 ? sql.join(filters, " AND ") : undefined)
                .orderBy(desc(auditLogs.createdAt))
                .limit(limitNum)
                .offset(offset);

            return {
                logs,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    pages: Math.ceil(total / limitNum),
                },
            };
        } catch (err: any) {
            app.log.error(err);
            return reply.status(500).send({ message: "Failed to fetch audit logs" });
        }
    });
}
