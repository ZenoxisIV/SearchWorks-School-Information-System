import { db } from "@/db";
import { auditLogs } from "@/db/schema";

export interface AuditLogData {
    userId: string;
    action: "CREATE" | "UPDATE";
    entityType: "grade";
    entityId: string;
    changes: Record<string, any>; // { fieldName: { old: value, new: value }, ... }
}

/**
 * Log an audit entry for grade operations
 */
export async function logAudit(data: AuditLogData) {
    try {
        await db.insert(auditLogs).values({
            userId: data.userId,
            action: data.action,
            entityType: data.entityType,
            entityId: data.entityId,
            changes: data.changes,
        });
    } catch (err) {
        // Log but don't throw - audit logging should not block operations
        console.error("Failed to log audit entry:", err);
    }
}

/**
 * Helper to compute changes between old and new values
 */
export function computeChanges(oldData: Record<string, any>, newData: Record<string, any>, fieldsToTrack: string[]) {
    const changes: Record<string, { old: any; new: any }> = {};

    fieldsToTrack.forEach((field) => {
        const oldVal = oldData?.[field];
        const newVal = newData?.[field];

        if (oldVal !== newVal) {
            changes[field] = {
                old: oldVal ?? null,
                new: newVal ?? null,
            };
        }
    });

    return changes;
}
