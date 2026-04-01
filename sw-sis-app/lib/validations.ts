import { z } from "zod";

/**
 * Format Zod errors into a field error map
 */
export function formatZodErrors(errors: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  errors.issues.forEach((issue) => {
    const field = issue.path[0] as string;
    fieldErrors[field] = issue.message;
  });
  return fieldErrors;
}

/**
 * Login Form Validation Schema
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: "Email is required" })
    .email({ message: "Please enter a valid email address" }),
  password: z
    .string()
    .min(1, { message: "Password is required" })
    .min(6, { message: "Password must be at least 6 characters" }),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Course Form Validation Schema
 */
export const courseSchema = z.object({
  code: z
    .string()
    .min(1, { message: "Course code is required" })
    .min(2, { message: "Course code must be at least 2 characters" })
    .max(20, { message: "Course code must be at most 20 characters" })
    .regex(/^[A-Z0-9\-]+$/, { message: "Course code must be alphanumeric with hyphens" }),
  name: z
    .string()
    .min(1, { message: "Course name is required" })
    .min(3, { message: "Course name must be at least 3 characters" })
    .max(100, { message: "Course name must be at most 100 characters" }),
  description: z
    .string()
    .optional()
    .refine((val) => !val || val.length <= 500, {
      message: "Description must be at most 500 characters",
    }),
});

export type CourseFormData = z.infer<typeof courseSchema>;

/**
 * Student Form Validation Schema
 */
export const studentSchema = z.object({
  firstName: z
    .string()
    .min(1, { message: "First name is required" })
    .min(2, { message: "First name must be at least 2 characters" })
    .max(50, { message: "First name must be at most 50 characters" }),
  lastName: z
    .string()
    .min(1, { message: "Last name is required" })
    .min(2, { message: "Last name must be at least 2 characters" })
    .max(50, { message: "Last name must be at most 50 characters" }),
  email: z
    .string()
    .min(1, { message: "Email is required" })
    .email({ message: "Please enter a valid email address" }),
  birthDate: z
    .string()
    .optional()
    .refine(
      (val) => !val || !isNaN(new Date(val).getTime()),
      { message: "Please enter a valid date" }
    ),
  courseId: z
    .string()
    .min(1, { message: "Course is required" }),
});

export type StudentFormData = z.infer<typeof studentSchema>;

/**
 * Subject Form Validation Schema
 */
export const subjectSchema = z.object({
  code: z
    .string()
    .min(1, { message: "Subject code is required" })
    .min(2, { message: "Subject code must be at least 2 characters" })
    .max(20, { message: "Subject code must be at most 20 characters" })
    .regex(/^[A-Z0-9\-]+$/, { message: "Subject code must be alphanumeric with hyphens" }),
  title: z
    .string()
    .min(1, { message: "Subject title is required" })
    .min(3, { message: "Subject title must be at least 3 characters" })
    .max(100, { message: "Subject title must be at most 100 characters" }),
  description: z
    .string()
    .optional()
    .refine((val) => !val || val.length <= 500, {
      message: "Description must be at most 500 characters",
    }),
  courseId: z
    .string()
    .min(1, { message: "Course is required" }),
});

export type SubjectFormData = z.infer<typeof subjectSchema>;

/**
 * Grade Form Validation Schema
 */
export const gradeSchema = z.object({
  studentId: z.string().min(1, { message: "Student is required" }),
  subjectId: z.string().min(1, { message: "Subject is required" }),
  prelim: z
    .string()
    .refine((v) => !v || !isNaN(parseFloat(v)), { message: "Prelim must be a number" })
    .refine((v) => !v || (parseFloat(v) >= 0 && parseFloat(v) <= 100), {
      message: "Prelim must be between 0 and 100",
    }),
  midterm: z
    .string()
    .refine((v) => !v || !isNaN(parseFloat(v)), { message: "Midterm must be a number" })
    .refine((v) => !v || (parseFloat(v) >= 0 && parseFloat(v) <= 100), {
      message: "Midterm must be between 0 and 100",
    }),
  finals: z
    .string()
    .refine((v) => !v || !isNaN(parseFloat(v)), { message: "Finals must be a number" })
    .refine((v) => !v || (parseFloat(v) >= 0 && parseFloat(v) <= 100), {
      message: "Finals must be between 0 and 100",
    }),
});

export type GradeFormData = z.infer<typeof gradeSchema>;
