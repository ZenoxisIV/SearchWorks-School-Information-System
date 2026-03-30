import { db } from './index';
import * as s from './schema';
import bcrypt from 'bcrypt';

async function seed() {
    console.log('Seeding started...');

    // 1. Admin User
    const passwordHash = await bcrypt.hash('admin123', 10);
    const [] = await db.insert(s.users).values({
        email: 'admin@searchworks.edu.ph',
        passwordHash,
        role: 'admin',
    }).returning();

    console.log('Admin created: admin@searchworks.edu.ph / admin123');

    // 2. Courses
    const courseData = await db.insert(s.courses).values([
        { code: 'DCS', name: 'Computer Science', description: 'Software and Theory' },
        { code: 'IMath', name: 'Mathematics', description: 'Calculus' },
        { code: 'NIP', name: 'Physics', description: 'Kinematics' },
    ]).returning();

    const [cs, math, phy] = courseData;

    // 3. Subjects
    const subjectsData = await db.insert(s.subjects).values([
        { code: 'CS11', title: 'Intro to Programming I', units: 3, courseId: cs.id },
        { code: 'CS12', title: 'Intro to Programming II', units: 3, courseId: cs.id },
        { code: 'CS32', title: 'Data Stuctures and Algorithms I', units: 3, courseId: cs.id },
        { code: 'Math21', title: 'Elementary Analysis I', units: 4, courseId: math.id },
        { code: 'Math22', title: 'Elementary Analysis II', units: 4, courseId: math.id },
        { code: 'Physics71', title: 'Intro to Physics I', units: 4, courseId: phy.id },
        { code: 'Physics72', title: 'Intro to Physics II', units: 4, courseId: phy.id },
        { code: 'CS140', title: 'Operating Systems', units: 4, courseId: cs.id },
    ]).returning();

    // 4. Prerequisites
    // CS12 requires CS11 | CS32 requires CS12 | Physics72 requires Physics71 | etc.
    await db.insert(s.subjectPrerequisites).values([
        { subjectId: subjectsData[1].id, prerequisiteSubjectId: subjectsData[0].id }, // CS12 <- CS11
        { subjectId: subjectsData[2].id, prerequisiteSubjectId: subjectsData[1].id }, // CS32 <- CS12
        { subjectId: subjectsData[4].id, prerequisiteSubjectId: subjectsData[3].id }, // Math22 <- Math21
        { subjectId: subjectsData[6].id, prerequisiteSubjectId: subjectsData[5].id }, // Physics72 <- Physics71
        { subjectId: subjectsData[2].id, prerequisiteSubjectId: subjectsData[0].id }, // CS32 <- CS11
    ]);

    // 5. Students
    const studentCount: number = 50;
    const studentEntries: (typeof s.students.$inferInsert)[] = Array.from({ length: studentCount }).map((_, i) => {
    const date = new Date(2005, 0, (i % 28) + 1);
    
    const birthDateString = date.toISOString().split('T')[0]; // YYYY-MM-DD

    return {
        studentNo: `2026-${(1000 + i).toString()}`,
        firstName: `Student_${i}`,
        lastName: `Lastname_${i}`,
        email: `student${i}@example.com`,
        courseId: i < 20 ? cs.id : i < 40 ? math.id : phy.id,
        birthDate: birthDateString,
    };
    });

    await db.insert(s.students).values(studentEntries);

    console.log(`${studentCount} student(s) assigned to courses.`);
    console.log('Seeding complete!');
    process.exit(0);
}

seed().catch((e) => {
    console.error('Seeding failed');
    console.error(e);
    process.exit(1);
});