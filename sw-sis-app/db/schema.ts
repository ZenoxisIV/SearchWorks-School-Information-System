import { pgTable, uuid, text, date, timestamp, integer, numeric, pgEnum } from 'drizzle-orm/pg-core';

export const reservationStatusEnum = pgEnum('status', ['reserved', 'cancelled']);

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

// 4. USERS (Teachers/Admin/Staff/etc.)
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 5. GRADES
export const grades = pgTable('grades', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').references(() => students.id).notNull(),
  subjectId: uuid('subject_id').references(() => subjects.id).notNull(),
  courseId: uuid('course_id').references(() => courses.id).notNull(),
  prelim: numeric('prelim'),
  midterm: numeric('midterm'),
  finals: numeric('finals'),
  finalGrade: numeric('final_grade'),
  remarks: text('remarks'),
  encodedByUserId: uuid('encoded_by_user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 6. SUBJECT RESERVATIONS
export const subjectReservations = pgTable('subject_reservations', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').references(() => students.id),
  subjectId: uuid('subject_id').references(() => subjects.id),
  reservedAt: timestamp('reserved_at').defaultNow(),
  status: reservationStatusEnum('status'),
});