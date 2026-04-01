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
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Check, X, Trash2, UserRoundPen, Upload } from "lucide-react";

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
    const [csvFile, setCsvFile] = useState<File | null>(null);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);

    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const router = useRouter();

    // --- Fetch Students & Courses ---
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

    // --- Inline Editing ---
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

    // --- Add Student ---
    const handleAddStudent = async (e: React.SubmitEvent) => {
        e.preventDefault();
        if (!formData.courseId) {
            toast.error("Please select a course");
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

    // --- Import Students from CSV ---
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
            const requiredFields = ["firstname", "lastname", "email", "courseid"];
            if (!requiredFields.every((f) => headers.includes(f))) {
                toast.error(`CSV must have columns: ${requiredFields.join(", ")}`);
                return;
            }

            // Parse rows
            const students = lines.slice(1).map((line) => {
                const values = line.split(",").map((v) => v.trim());
                return {
                    firstName: values[headers.indexOf("firstname")] || "",
                    lastName: values[headers.indexOf("lastname")] || "",
                    email: values[headers.indexOf("email")] || "",
                    birthDate: values[headers.indexOf("birthdate")] || null,
                    courseId: values[headers.indexOf("courseid")] || "",
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

    // --- Delete Student ---
    const handleDelete = async (studentNo: string) => {
        if (!confirm("Are you sure you want to delete this student?")) return;
        try {
            const res = await fetch(`/api/students/${studentNo}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (res.ok) {
                toast.success("Student deleted");
                fetchStudents();
            } else {
                const err = await res.json();
                toast.error(err.message || "Failed to delete student");
            }
        } catch {
            toast.error("An error occurred");
        }
    };

    // --- Bulk Delete / Selection ---
    const toggleSelect = (studentNo: string) => {
        setSelectedStudents((prev) =>
            prev.includes(studentNo) ? prev.filter((s) => s !== studentNo) : [...prev, studentNo],
        );
    };

    const handleBulkDelete = async () => {
        if (!selectedStudents.length) return;
        if (!confirm(`Delete ${selectedStudents.length} selected students?`)) return;

        try {
            const res = await fetch("/api/students", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ studentNos: selectedStudents }),
                credentials: "include",
            });
            if (res.ok) {
                toast.success("Selected students deleted");
                setSelectedStudents([]);
                fetchStudents();
            } else {
                const err = await res.json();
                toast.error(err.message || "Failed to delete students");
            }
        } catch {
            toast.error("An error occurred");
        }
    };

    // --- Client-side global search filter ---
    const filteredStudents = students.filter((student) => {
        const values = [student.studentNo, student.firstName, student.lastName, student.email, student.birthDate];
        return values.some((v) => v?.toString().toLowerCase().includes(search.toLowerCase()));
    });

    const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
    const paginated = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="space-y-6 p-6">
            {/* Header + Add */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Students</h2>
                    <p className="text-muted-foreground">View and manage enrolled student records.</p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Input
                        placeholder="Search..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-64"
                    />
                    <Button variant="destructive" onClick={handleBulkDelete} disabled={!selectedStudents.length}>
                        Delete Selected ({selectedStudents.length})
                    </Button>
                    <Dialog open={csvOpen} onOpenChange={setCsvOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="gap-2">
                                <Upload className="h-4 w-4" /> Import CSV
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Import Students from CSV</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="csvFile">CSV File</Label>
                                    <Input
                                        id="csvFile"
                                        type="file"
                                        accept=".csv"
                                        onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                                    />
                                    <p className="text-sm text-muted-foreground">
                                        CSV must have columns: firstName, lastName, email, courseId, birthDate (optional)
                                    </p>
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
                            <Button className="gap-2">
                                <Plus className="h-4 w-4" /> Add Student
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
                                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="lastName">Last Name</Label>
                                        <Input
                                            id="lastName"
                                            value={formData.lastName}
                                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="birthDate">Birth Date</Label>
                                    <Input
                                        id="birthDate"
                                        type="date"
                                        value={formData.birthDate}
                                        onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="course">Course</Label>
                                    <Select value={formData.courseId} onValueChange={(value) => setFormData({ ...formData, courseId: value })}>
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
            </div>

            {/* Table */}
            <Card>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>
                                    <input
                                        type="checkbox"
                                        checked={selectedStudents.length === students.length && students.length > 0}
                                        onChange={() => {
                                            if (selectedStudents.length === students.length) setSelectedStudents([]);
                                            else setSelectedStudents(students.map((s) => s.studentNo));
                                        }}
                                    />
                                </TableHead>
                                <TableHead>Student No</TableHead>
                                <TableHead>First Name</TableHead>
                                <TableHead>Last Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Birth Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {paginated.map((student) => {
                                const isEditing = editingId === student.studentNo;
                                return (
                                    <TableRow key={student.studentNo}>
                                        <TableCell>
                                            <input
                                                type="checkbox"
                                                checked={selectedStudents.includes(student.studentNo)}
                                                onChange={() => toggleSelect(student.studentNo)}
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
                                                <>
                                                    <Button
                                                        size="icon"
                                                        variant="outline"
                                                        title="View Student Profile"
                                                        onClick={() => window.open(`/students/${student.id}`, "_self")}
                                                    >
                                                        <UserRoundPen className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="secondary"
                                                        onClick={() => startEdit(student)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="destructive"
                                                        onClick={() => handleDelete(student.studentNo)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </>
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
                </CardContent>
            </Card>
        </div>
    );
}
