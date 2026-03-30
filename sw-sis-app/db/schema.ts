import { pgTable, uuid, text, date, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';

// 1. COURSES
export const courses = pgTable('courses', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 2. SUBJECTS
export const subjects = pgTable('subjects', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseId: uuid('course_id').references(() => courses.id),
  code: text('code').notNull(),
  title: text('title').notNull(),
  units: integer('units').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 3. STUDENTS
export const students = pgTable('students', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentNo: text('student_no').notNull().unique(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').unique(),
  birthDate: date('birth_date').notNull(),
  courseId: uuid('course_id').references(() => courses.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
