"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FieldError } from "@/components/form-error";
import { gradeSchema } from "@/lib/validations";
import { calculateFinalGrade } from "@/lib/grades";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

export default function GradingSheetPage() {
    const [grades, setGrades] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCourse, setSelectedCourse] = useState("");
    const [selectedSubject, setSelectedSubject] = useState("");

    const [formData, setFormData] = useState({
        studentId: "",
        subjectId: "",
        prelim: "1.00",
        midterm: "1.00",
        finals: "1.00",
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const fetchData = async () => {
        setLoading(true);
        try {
            const [gRes, sRes, subRes, cRes] = await Promise.all([
                fetch("/api/grades", { credentials: "include" }),
                fetch("/api/students", { credentials: "include" }),
                fetch("/api/subjects", { credentials: "include" }),
                fetch("/api/courses", { credentials: "include" }),
            ]);

            setGrades(await gRes.json());
            setStudents(await sRes.json());
            setSubjects(await subRes.json());
            setCourses(await cRes.json());
        } catch {
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSave = async (e: React.SubmitEvent) => {
        e.preventDefault();
        setFormErrors({});

        const selectedStudent = students.find((s) => s.id === formData.studentId);
        if (!selectedStudent) {
            toast.error("Select a student");
            return;
        }

        // Validate with Zod schema
        const result = gradeSchema.safeParse({
            studentId: formData.studentId,
            subjectId: formData.subjectId,
            prelim: formData.prelim,
            midterm: formData.midterm,
            finals: formData.finals,
        });

        if (!result.success) {
            const fieldErrors: Record<string, string> = {};
            result.error.issues.forEach((issue: any) => {
                const field = issue.path[0] as string;
                fieldErrors[field] = issue.message;
            });
            setFormErrors(fieldErrors);
            return;
        }

        setIsSaving(true);

        const { finalGrade, remarks } = calculateFinalGrade(
            formData.prelim,
            formData.midterm,
            formData.finals,
        );

        try {
            const res = await fetch("/api/grades", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    studentId: selectedStudent.id,
                    subjectId: formData.subjectId,
                    courseId: selectedStudent.courseId,
                    prelim: Number(formData.prelim),
                    midterm: Number(formData.midterm),
                    finals: Number(formData.finals),
                    finalGrade,
                    remarks,
                }),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || "Failed to save grade");
            }

            toast.success(`Saved: ${finalGrade} (${remarks})`);
            fetchData();

            setFormData((prev) => ({
                ...prev,
                prelim: "1.00",
                midterm: "1.00",
                finals: "1.00",
            }));
        } catch {
            toast.error("Save failed");
        } finally {
            setIsSaving(false);
        }
    };

    const courseOptions = courses.map((c) => ({ id: c.id, code: c.code, name: c.name }));

    const filteredGrades = grades.filter((g) => {
        const matchesSearch =
            g.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            g.subjectTitle.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCourse = !selectedCourse || g.courseId === selectedCourse;
        const matchesSubject = !selectedSubject || g.subjectId === selectedSubject;
        return matchesSearch && matchesCourse && matchesSubject;
    });

    return (
        <div className="p-6 space-y-6 w-full">
            {/* HEADER */}
            <div>
                <h2 className="text-3xl font-bold">Grading Sheet</h2>
            </div>

            {/* MAIN LAYOUT: KEEP ORIGINAL FORM + TABLE */}
            <div className="flex flex-col lg:flex-row gap-6">
                {/* FORM */}
                <Card className="w-80 shrink-0 h-fit">
                    <CardHeader>
                        <CardTitle>Grade Entry</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Student</Label>
                                <Select
                                    value={formData.studentId}
                                    onValueChange={(value) => setFormData({ ...formData, studentId: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="- Select Student -" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {students.map((s) => (
                                            <SelectItem key={s.id} value={s.id}>
                                                {s.lastName}, {s.firstName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FieldError message={formErrors.studentId} />
                            </div>

                            <div className="space-y-2">
                                <Label>Subject</Label>
                                <Select
                                    value={formData.subjectId}
                                    onValueChange={(value) => setFormData({ ...formData, subjectId: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="- Select Subject -" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {subjects.map((s) => (
                                            <SelectItem key={s.id} value={s.id}>
                                                {s.code} - {s.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FieldError message={formErrors.subjectId} />
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <div className="space-y-2">
                                    <Label>Prelim</Label>
                                    <Input
                                        type="number"
                                        step="0.25"
                                        min="1"
                                        max="5"
                                        value={Number(formData.prelim).toFixed(2)}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                prelim: Number(e.target.value).toFixed(2),
                                            })
                                        }
                                    />
                                    <FieldError message={formErrors.prelim} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Midterm</Label>
                                    <Input
                                        type="number"
                                        step="0.25"
                                        min="1"
                                        max="5"
                                        value={Number(formData.midterm).toFixed(2)}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                midterm: Number(e.target.value).toFixed(2),
                                            })
                                        }
                                    />
                                    <FieldError message={formErrors.midterm} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Finals</Label>
                                    <Input
                                        type="number"
                                        step="0.25"
                                        min="1"
                                        max="5"
                                        value={Number(formData.finals).toFixed(2)}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                finals: Number(e.target.value).toFixed(2),
                                            })
                                        }
                                    />
                                    <FieldError message={formErrors.finals} />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full flex justify-center items-center gap-2"
                                disabled={isSaving}
                            >
                                {isSaving && <Loader2 className="animate-spin h-4 w-4" />}
                                <Save className="h-4 w-4" />
                                Save
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* TABLE */}
                <div className="flex-1 space-y-4">
                    {/* FILTERS */}
                    <div className="flex flex-wrap gap-3 items-center">
                        {/* SEARCH */}
                        <Input
                            placeholder="Search..."
                            className="w-full lg:w-64 p-2 text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />

                        {/* COURSE FILTER */}
                        <Select value={selectedCourse} onValueChange={(value) => setSelectedCourse(value)}>
                            <SelectTrigger className="w-full lg:w-48">
                                <SelectValue placeholder="All Courses" />
                            </SelectTrigger>
                            <SelectContent>
                                {courseOptions.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                        {c.code}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* SUBJECT FILTER */}
                        <Select value={selectedSubject} onValueChange={(value) => setSelectedSubject(value)}>
                            <SelectTrigger className="w-full lg:w-64">
                                <SelectValue placeholder="All Subjects" />
                            </SelectTrigger>
                            <SelectContent>
                                {subjects.map((s) => (
                                    <SelectItem key={s.id} value={s.id}>
                                        {s.code} - {s.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* TABLE */}
                    <div className="overflow-x-auto">
                        <Table className="w-full">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Student</TableHead>
                                    <TableHead>Course Code</TableHead>
                                    <TableHead>Subject Code</TableHead>
                                    <TableHead>Subject</TableHead>
                                    <TableHead>P</TableHead>
                                    <TableHead>M</TableHead>
                                    <TableHead>F</TableHead>
                                    <TableHead className="text-right">Final</TableHead>
                                    <TableHead>Remarks</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-10">
                                            <Loader2 className="animate-spin mx-auto h-8 w-8 text-muted-foreground" />
                                        </TableCell>
                                    </TableRow>
                                ) : filteredGrades.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                                            No records found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredGrades.map((g) => (
                                        <TableRow key={g.id}>
                                            <TableCell className="font-medium">{g.studentName}</TableCell>
                                            <TableCell>{g.courseCode}</TableCell>
                                            <TableCell>{g.subjectCode}</TableCell>
                                            <TableCell>{g.subjectTitle}</TableCell>
                                            <TableCell>{Number(g.prelim).toFixed(2)}</TableCell>
                                            <TableCell>{Number(g.midterm).toFixed(2)}</TableCell>
                                            <TableCell>{Number(g.finals).toFixed(2)}</TableCell>
                                            <TableCell className="text-right font-bold">
                                                {Number(g.finalGrade).toFixed(2)}
                                            </TableCell>
                                            <TableCell
                                                className={
                                                    Number(g.finalGrade) <= 3
                                                        ? "text-green-600 font-semibold"
                                                        : "text-red-600 font-semibold"
                                                }
                                            >
                                                {Number(g.finalGrade) <= 3 ? "Passed" : "Failed"}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>
        </div>
    );
}
