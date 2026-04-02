import { db } from "./index";
import * as s from "./schema";
import bcrypt from "bcryptjs";
import { faker } from "@faker-js/faker";

async function seed() {
    console.log("Seeding started...");

    // 1. Admin User
    const adminPassword = "admin123";
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const adminResult = await db
        .insert(s.users)
        .values({
            email: "admin@searchworks.edu.ph",
            passwordHash,
            role: "admin",
        })
        .returning();

    console.log(`Admin created: admin@searchworks.edu.ph / ${adminPassword}`);

    // 2. Courses (5 courses)
    const courseValues = [
        { code: "BSCS", name: "BS Computer Science", description: "Software and Theory" },
        { code: "BSMath", name: "BS Mathematics", description: "Pure and Applied Mathematics" },
        { code: "BSP", name: "BS Physics", description: "Physics and Experimentation" },
        { code: "BSIT", name: "BS Information Technology", description: "Practical IT and Systems" },
        { code: "BSCE", name: "BS Computer Engineering", description: "Hardware and Systems" },
    ];

    const courseData = await db.insert(s.courses).values(courseValues).returning();

    const [cs, math, phy, it, ce] = courseData;

    // 3. Subjects (15 subjects distributed 3 per course)
    const subjectValues = [
        // BSCS
        { code: "CS11", title: "Intro to Programming I", units: 3, courseId: cs.id },
        { code: "CS12", title: "Intro to Programming II", units: 3, courseId: cs.id },
        { code: "CS32", title: "Data Structures and Algorithms I", units: 3, courseId: cs.id },
        // BSMath
        { code: "MATH21", title: "Elementary Analysis I", units: 4, courseId: math.id },
        { code: "MATH22", title: "Elementary Analysis II", units: 4, courseId: math.id },
        { code: "MATH30", title: "Linear Algebra", units: 3, courseId: math.id },
        // BSP
        { code: "PHYS71", title: "Intro to Physics I", units: 4, courseId: phy.id },
        { code: "PHYS72", title: "Intro to Physics II", units: 4, courseId: phy.id },
        { code: "PHYS85", title: "Classical Mechanics", units: 3, courseId: phy.id },
        // BSIT
        { code: "IT101", title: "Fundamentals of IT", units: 3, courseId: it.id },
        { code: "IT102", title: "Networking Basics", units: 3, courseId: it.id },
        { code: "IT201", title: "Database Systems", units: 3, courseId: it.id },
        // BSCE
        { code: "CE110", title: "Digital Logic", units: 3, courseId: ce.id },
        { code: "CE210", title: "Microprocessors", units: 3, courseId: ce.id },
        { code: "CE310", title: "Embedded Systems", units: 3, courseId: ce.id },
    ];

    const subjectsData = await db.insert(s.subjects).values(subjectValues).returning();

    // 4. Prerequisites (only within same course)
    const prereqValues = [
        // BSCS: CS12 <- CS11, CS32 <- CS12, CS32 <- CS11
        { subjectId: subjectsData[1].id, prerequisiteSubjectId: subjectsData[0].id },
        { subjectId: subjectsData[2].id, prerequisiteSubjectId: subjectsData[1].id },
        { subjectId: subjectsData[2].id, prerequisiteSubjectId: subjectsData[0].id },
        // BSMath: MATH22 <- MATH21, MATH30 <- MATH21
        { subjectId: subjectsData[4].id, prerequisiteSubjectId: subjectsData[3].id },
        { subjectId: subjectsData[5].id, prerequisiteSubjectId: subjectsData[3].id },
        // BSP: PHYS72 <- PHYS71
        { subjectId: subjectsData[7].id, prerequisiteSubjectId: subjectsData[6].id },
        // BSIT: IT201 <- IT101
        { subjectId: subjectsData[10].id, prerequisiteSubjectId: subjectsData[9].id },
        // BSCE: CE310 <- CE210
        { subjectId: subjectsData[14].id, prerequisiteSubjectId: subjectsData[13].id },
    ];

    await db.insert(s.subjectPrerequisites).values(prereqValues);

    // 5. Students (50 students distributed across the 5 courses)
    const studentCount = 50;
    const studentEntries: (typeof s.students.$inferInsert)[] = Array.from({ length: studentCount }).map((_, i) => {
        const birth = faker.date.birthdate({ min: 18, max: 22, mode: "age" });
        const birthDateString = new Date(birth).toISOString().split("T")[0];

        const courseIndex = i % courseData.length; // round-robin across 5 courses
        const assignedCourse = courseData[courseIndex];

        return {
            studentNo: `2026-${(1000 + i).toString()}`,
            firstName: faker.person.firstName(),
            lastName: faker.person.lastName(),
            email: faker.internet.email({ firstName: faker.person.firstName(), lastName: faker.person.lastName() }).toLowerCase(),
            courseId: assignedCourse.id,
            birthDate: birthDateString,
        };
    });

    await db.insert(s.students).values(studentEntries);

    console.log(`${studentCount} students assigned across ${courseData.length} courses.`);
    console.log("Seeding complete!");
    process.exit(0);
}

seed().catch((e) => {
    console.error("Seeding failed");
    console.error(e);
    process.exit(1);
});
