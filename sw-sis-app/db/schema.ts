import {
    pgTable,
    uuid,
    text,
    date,
    timestamp,
    integer,
    numeric,
    pgEnum,
    unique,
    check,
    jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const reservationStatusEnum = pgEnum("status", ["reserved", "cancelled"]);

export const courses = pgTable("courses", {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const subjects = pgTable(
    "subjects",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        courseId: uuid("course_id")
            .references(() => courses.id)
            .notNull(),
        code: text("code").notNull(),
        title: text("title").notNull(),
        units: integer("units").notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at").defaultNow().notNull(),
    },
    (t) => [unique("unq_code").on(t.courseId, t.code), unique("unq_title").on(t.courseId, t.title)],
);

export const students = pgTable("students", {
    id: uuid("id").primaryKey().defaultRandom(),
    studentNo: text("student_no").notNull().unique(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").unique(),
    birthDate: date("birth_date").notNull(),
    courseId: uuid("course_id")
        .references(() => courses.id)
        .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const grades = pgTable(
    "grades",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        studentId: uuid("student_id")
            .references(() => students.id)
            .notNull(),
        subjectId: uuid("subject_id")
            .references(() => subjects.id)
            .notNull(),
        courseId: uuid("course_id")
            .references(() => courses.id)
            .notNull(),
        prelim: numeric("prelim"),
        midterm: numeric("midterm"),
        finals: numeric("finals"),
        finalGrade: numeric("final_grade"),
        remarks: text("remarks"),
        encodedByUserId: uuid("encoded_by_user_id")
            .references(() => users.id)
            .notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at").defaultNow().notNull(),
    },
    (t) => [unique("unq_sub_cour").on(t.studentId, t.subjectId, t.courseId)],
);

export const subjectReservations = pgTable(
    "subject_reservations",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        studentId: uuid("student_id")
            .references(() => students.id)
            .notNull(),
        subjectId: uuid("subject_id")
            .references(() => subjects.id)
            .notNull(),
        reservedAt: timestamp("reserved_at").defaultNow(),
        status: reservationStatusEnum("status").default("reserved"),
    },
    (t) => [unique("unq_sub").on(t.studentId, t.subjectId)],
);

export const subjectPrerequisites = pgTable(
    "subject_prerequisites",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        subjectId: uuid("subject_id")
            .references(() => subjects.id)
            .notNull(),
        prerequisiteSubjectId: uuid("prerequisite_subject_id")
            .references(() => subjects.id)
            .notNull(),
        createdAt: timestamp("created_at").defaultNow(),
    },
    (t) => [
        unique("unq_preq").on(t.subjectId, t.prerequisiteSubjectId),
        check("self_ref_check", sql`${t.subjectId} <> ${t.prerequisiteSubjectId}`),
    ],
);

export const auditLogs = pgTable("audit_logs", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
        .references(() => users.id)
        .notNull(),
    action: text("action").notNull(), // "CREATE", "UPDATE"
    entityType: text("entity_type").notNull(), // "grade"
    entityId: uuid("entity_id").notNull(), // the grade id
    changes: jsonb("changes").notNull(), // { field: { old: value, new: value }, ... }
    createdAt: timestamp("created_at").defaultNow().notNull(),
});
