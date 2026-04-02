"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { FieldError } from "@/components/form-error";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Check, X, Trash2, Eye, MoreHorizontal, Upload, Download } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { studentSchema } from "@/lib/validations";

export default function StudentsPage() {
    const [students, setStudents] = useState<any[]>([]);
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [open, setOpen] = useState(false);
    const [csvOpen, setCsvOpen] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        birthDate: "",
        courseId: "",
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [csvFile, setCsvFile] = useState<File | null>(null);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);

    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [search, setSearch] = useState("");
    const [selectedCourse, setSelectedCourse] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<null | { type: "single" | "bulk"; id?: string }>(null);

    const router = useRouter();

    const fetchStudents = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/students", { credentials: "include" });
            if (res.status === 401) {
                router.push("/login");
                return;
            }
            const data = await res.json();
            if (Array.isArray(data)) setStudents(data);
        } catch {
            toast.error("Could not connect to the server");
        } finally {
            setLoading(false);
        }
    };

    const sampleCsv = `firstName,lastName,email,birthDate,courseCode
John,Doe,john.doe@example.com,2000-01-01,CS101
Jane,Smith,jane.smith@example.com,1999-05-10,CS102`;

    const downloadSampleCsv = () => {
        const blob = new Blob([sampleCsv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "students-sample.csv";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    const fetchCourses = async () => {
        try {
            const res = await fetch("/api/courses", { credentials: "include" });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) setCourses(data);
            }
        } catch {
            toast.error("Could not fetch courses");
        }
    };

    useEffect(() => {
        fetchStudents();
        fetchCourses();
    }, []);

    const startEdit = (student: any) => {
        setEditingId(student.studentNo);
        setEditData({ ...student });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditData(null);
    };

    const saveEdit = async (studentNo: string) => {
        setIsSaving(true);
        try {
            const res = await fetch(`/api/students/${studentNo}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editData),
                credentials: "include",
            });
            if (res.ok) {
                toast.success("Updated successfully");
                setEditingId(null);
                fetchStudents();
            } else {
                toast.error("Update failed");
            }
        } catch {
            toast.error("Error saving changes");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddStudent = async (e: React.SubmitEvent) => {
        e.preventDefault();
        setErrors({});

        if (!formData.courseId) {
            toast.error("Please select a course");
            return;
        }

        // Validate with Zod schema
        const result = studentSchema.safeParse(formData);
        if (!result.success) {
            const fieldErrors: Record<string, string> = {};
            result.error.issues.forEach((issue: any) => {
                const field = issue.path[0] as string;
                fieldErrors[field] = issue.message;
            });
            setErrors(fieldErrors);
            return;
        }

        setIsAdding(true);
        try {
            const res = await fetch("/api/students", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
                credentials: "include",
            });
            if (res.ok) {
                toast.success("Student added successfully");
                setOpen(false);
                setFormData({ firstName: "", lastName: "", email: "", birthDate: "", courseId: "" });
                setErrors({});
                fetchStudents();
            } else {
                const err = await res.json();
                toast.error(err.message || "Failed to add student");
            }
        } catch {
            toast.error("An error occurred");
        } finally {
            setIsAdding(false);
        }
    };

    const handleCsvImport = async () => {
        if (!csvFile) {
            toast.error("Please select a CSV file");
            return;
        }

        setIsImporting(true);
        try {
            const text = await csvFile.text();
            const lines = text.trim().split("\n");
            if (lines.length < 2) {
                toast.error("CSV file must have header and at least one data row");
                return;
            }

            // Parse header
            const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
            const requiredFields = ["firstname", "lastname", "email", "coursecode"];
            if (!requiredFields.every((f) => headers.includes(f))) {
                toast.error(`CSV must have columns: ${requiredFields.join(", ")}`);
                return;
            }

            // Parse rows (expect `courseCode` column)
            const students = lines.slice(1).map((line) => {
                const values = line.split(",").map((v) => v.trim());
                return {
                    firstName: values[headers.indexOf("firstname")] || "",
                    lastName: values[headers.indexOf("lastname")] || "",
                    email: values[headers.indexOf("email")] || "",
                    birthDate: values[headers.indexOf("birthdate")] || null,
                    courseCode: values[headers.indexOf("coursecode")] || "",
                };
            });

            const res = await fetch("/api/students/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(students),
                credentials: "include",
            });

            if (res.ok) {
                const data = await res.json();
                toast.success(data.message);
                setCsvOpen(false);
                setCsvFile(null);
                fetchStudents();
            } else {
                const err = await res.json();
                toast.error(err.message || "Failed to import students");
            }
        } catch (err: any) {
            toast.error(err.message || "Error reading CSV file");
        } finally {
            setIsImporting(false);
        }
    };

    const handleDelete = async (studentNo: string) => {
        setDeleteTarget({ type: "single", id: studentNo });
        setDeleteModalOpen(true);
    };

    const handleDeleteConfirmed = async () => {
        if (!deleteTarget) return;

        try {
            if (deleteTarget.type === "single" && deleteTarget.id) {
                const res = await fetch(`/api/students/${deleteTarget.id}`, {
                    method: "DELETE",
                    credentials: "include",
                });
                if (res.ok) {
                    toast.success("Student deleted");
                } else {
                    const err = await res.json();
                    toast.error(err.message || "Failed to delete student");
                }
            } else if (deleteTarget.type === "bulk") {
                const res = await fetch("/api/students", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ studentNos: selectedStudents }),
                    credentials: "include",
                });
                if (res.ok) {
                    toast.success("Selected students deleted");
                    setSelectedStudents([]);
                } else {
                    const err = await res.json();
                    toast.error(err.message || "Failed to delete students");
                }
            }
        } catch {
            toast.error("An error occurred");
        } finally {
            fetchStudents();
            setDeleteModalOpen(false);
            setDeleteTarget(null);
        }
    };

    const toggleSelect = (studentNo: string) => {
        setSelectedStudents((prev) =>
            prev.includes(studentNo) ? prev.filter((s) => s !== studentNo) : [...prev, studentNo],
        );
    };
    const filteredStudents = students.filter((student) => {
        const values = [student.studentNo, student.firstName, student.lastName, student.email, student.birthDate];
        const matchesSearch = values.some((v) => v?.toString().toLowerCase().includes(search.toLowerCase()));
        const matchesCourse = !selectedCourse || student.courseId === selectedCourse;
        return matchesSearch && matchesCourse;
    });

    const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
    const paginated = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Students</h2>
                <p className="text-muted-foreground">View and manage enrolled student records.</p>
            </div>

            {/* Table */}
            <Card>
                <CardContent>
                    {/* Search and Filters - Inside Table */}
                    <div className="space-y-4 mb-6">
                        <div className="flex flex-col sm:flex-row gap-3 items-end">
                            <div className="flex flex-col sm:flex-row gap-3 items-end">
                                <div className="w-64">
                                    <Input
                                        placeholder="Search by name, ID, or email..."
                                        value={search}
                                        onChange={(e) => {
                                            setSearch(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                    />
                                </div>
                                <div className="w-48">
                                    <Select
                                        value={selectedCourse}
                                        onValueChange={(value) => {
                                            setSelectedCourse(value);
                                            setCurrentPage(1);
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="All Courses" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {courses.map((c) => (
                                                <SelectItem key={c.id} value={c.id}>
                                                    {c.code} - {c.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="flex gap-2 ml-auto">
                                <Dialog open={csvOpen} onOpenChange={setCsvOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="sm" className="gap-2">
                                            <Upload className="h-4 w-4" />
                                            Import CSV
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Import Students from CSV</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 space-y-2">
                                                    <Label htmlFor="csvFile">CSV File</Label>
                                                    <Input
                                                        id="csvFile"
                                                        type="file"
                                                        accept=".csv"
                                                        onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Button size="sm" variant="ghost" onClick={downloadSampleCsv}>
                                                    <Download className="h-4 w-4 gap-2" />
                                                    Download Sample CSV
                                                </Button>
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button type="button" variant="outline" onClick={() => setCsvOpen(false)}>
                                                Cancel
                                            </Button>
                                            <Button onClick={handleCsvImport} disabled={isImporting || !csvFile}>
                                                {isImporting ? "Importing..." : "Import"}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                                <Dialog open={open} onOpenChange={setOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="sm" className="gap-2">
                                            <Plus className="h-4 w-4" />
                                            Add Student
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Add New Student</DialogTitle>
                                        </DialogHeader>
                                        <form onSubmit={handleAddStudent} className="space-y-4 py-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="firstName">First Name</Label>
                                                    <Input
                                                        id="firstName"
                                                        value={formData.firstName}
                                                        onChange={(e) =>
                                                            setFormData({ ...formData, firstName: e.target.value })
                                                        }
                                                        required
                                                    />
                                                    <FieldError message={errors.firstName} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="lastName">Last Name</Label>
                                                    <Input
                                                        id="lastName"
                                                        value={formData.lastName}
                                                        onChange={(e) =>
                                                            setFormData({ ...formData, lastName: e.target.value })
                                                        }
                                                        required
                                                    />
                                                    <FieldError message={errors.lastName} />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="email">Email</Label>
                                                <Input
                                                    id="email"
                                                    type="email"
                                                    value={formData.email}
                                                    onChange={(e) =>
                                                        setFormData({ ...formData, email: e.target.value })
                                                    }
                                                    required
                                                />
                                                <FieldError message={errors.email} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="birthDate">Birth Date</Label>
                                                <Input
                                                    id="birthDate"
                                                    type="date"
                                                    value={formData.birthDate}
                                                    onChange={(e) =>
                                                        setFormData({ ...formData, birthDate: e.target.value })
                                                    }
                                                />
                                                <FieldError message={errors.birthDate} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="course">Course</Label>
                                                <Select
                                                    value={formData.courseId}
                                                    onValueChange={(value) =>
                                                        setFormData({ ...formData, courseId: value })
                                                    }
                                                >
                                                    <SelectTrigger id="course">
                                                        <SelectValue placeholder="Select a course" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {courses.map((course) => (
                                                            <SelectItem key={course.id} value={course.id}>
                                                                {course.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FieldError message={errors.courseId} />
                                            </div>
                                            <DialogFooter>
                                                <Button type="submit" disabled={isAdding} className="w-full">
                                                    {isAdding ? "Saving..." : "Save Student"}
                                                </Button>
                                            </DialogFooter>
                                        </form>
                                    </DialogContent>
                                </Dialog>
                            </div>
                            {selectedStudents.length > 0 && (
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => {
                                        setDeleteTarget({ type: "bulk" });
                                        setDeleteModalOpen(true);
                                    }}
                                >
                                    Delete Selected ({selectedStudents.length})
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12">
                                        <Checkbox
                                            checked={selectedStudents.length === students.length && students.length > 0}
                                            onCheckedChange={() => {
                                                if (selectedStudents.length === students.length)
                                                    setSelectedStudents([]);
                                                else setSelectedStudents(students.map((s) => s.studentNo));
                                            }}
                                        />
                                    </TableHead>
                                    <TableHead>Student No</TableHead>
                                    <TableHead>First Name</TableHead>
                                    <TableHead>Last Name</TableHead>
                                    <TableHead>Course</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Birth Date</TableHead>
                                    <TableHead className="text-right w-32">Actions</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {paginated.map((student) => {
                                    const isEditing = editingId === student.studentNo;
                                    return (
                                        <TableRow key={student.studentNo}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedStudents.includes(student.studentNo)}
                                                    onCheckedChange={() => toggleSelect(student.studentNo)}
                                                />
                                            </TableCell>
                                            <TableCell>{student.studentNo}</TableCell>
                                            <TableCell>
                                                {isEditing ? (
                                                    <Input
                                                        value={editData.firstName}
                                                        onChange={(e) =>
                                                            setEditData({ ...editData, firstName: e.target.value })
                                                        }
                                                        className="h-8"
                                                    />
                                                ) : (
                                                    student.firstName
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {isEditing ? (
                                                    <Input
                                                        value={editData.lastName}
                                                        onChange={(e) =>
                                                            setEditData({ ...editData, lastName: e.target.value })
                                                        }
                                                        className="h-8"
                                                    />
                                                ) : (
                                                    student.lastName
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {courses.find((c) => c.id === student.courseId)?.code || "-"}
                                            </TableCell>
                                            <TableCell>
                                                {isEditing ? (
                                                    <Input
                                                        value={editData.email}
                                                        onChange={(e) =>
                                                            setEditData({ ...editData, email: e.target.value })
                                                        }
                                                        className="h-8"
                                                    />
                                                ) : (
                                                    student.email
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {isEditing ? (
                                                    <Input
                                                        type="date"
                                                        value={editData.birthDate}
                                                        onChange={(e) =>
                                                            setEditData({ ...editData, birthDate: e.target.value })
                                                        }
                                                        className="h-8"
                                                    />
                                                ) : (
                                                    student.birthDate
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right flex justify-end gap-2">
                                                {isEditing ? (
                                                    <>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => saveEdit(student.studentNo)}
                                                            disabled={isSaving}
                                                        >
                                                            {isSaving ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Check className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="text-red-600"
                                                            onClick={cancelEdit}
                                                            disabled={isSaving}
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button size="icon" variant="ghost" title="More actions">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem
                                                                onClick={() =>
                                                                    window.open(`/students/${student.id}`, "_self")
                                                                }
                                                            >
                                                                <Eye className="h-4 w-4 mr-2" />
                                                                View Profile
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => startEdit(student)}>
                                                                <Pencil className="h-4 w-4 mr-2" />
                                                                Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => handleDelete(student.studentNo)}
                                                                className="text-red-600"
                                                            >
                                                                <Trash2 className="h-4 w-4 mr-2" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>

                        {/* Pagination */}
                        <div className="flex justify-end gap-2 mt-4">
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage((p) => p - 1)}
                            >
                                Previous
                            </Button>
                            <span className="flex items-center px-2">
                                Page {currentPage} of {totalPages || 1}
                            </span>
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={currentPage === totalPages || totalPages === 0}
                                onClick={() => setCurrentPage((p) => p + 1)}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Delete Confirmation Modal */}
            <DeleteConfirmDialog
                open={deleteModalOpen}
                onOpenChange={setDeleteModalOpen}
                title="Delete Student"
                description={
                    deleteTarget?.type === "bulk"
                        ? `Are you sure you want to delete all ${selectedStudents.length} selected students?`
                        : "Are you sure you want to delete this student? This action cannot be undone."
                }
                onConfirm={handleDeleteConfirmed}
            />
        </div>
    );
}
