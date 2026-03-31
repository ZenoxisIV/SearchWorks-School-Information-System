"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Pencil, Check, X } from "lucide-react";

export default function StudentsPage() {
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        birthDate: "",
    });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

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
            toast.error("Could not connect to the server.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    // Inline editing
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

    // Add student
    const handleAddStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch("/api/students", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
                credentials: "include",
            });
            if (res.ok) {
                toast.success("Student added successfully!");
                setOpen(false);
                setFormData({ firstName: "", lastName: "", email: "", birthDate: "" });
                fetchStudents();
            } else {
                const err = await res.json();
                toast.error(err.message || "Failed to add student");
            }
        } catch {
            toast.error("An error occurred");
        }
    };

    // Filtered and paginated students
    const filtered = students.filter((s) =>
        [s.firstName, s.lastName, s.email, s.studentNo].join(" ").toLowerCase().includes(searchTerm.toLowerCase()),
    );
    const totalPages = Math.ceil(filtered.length / pageSize);
    const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Students</h2>
                    <p className="text-muted-foreground">View and manage enrolled student records.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 items-center">
                    <Input
                        placeholder="Search students..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-xs"
                    />
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
                            <form onSubmit={handleAddStudent} className="space-y-4 py-2">
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
                                <DialogFooter>
                                    <Button type="submit" className="w-full">
                                        Save Student
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Card>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Student No</TableHead>
                                <TableHead>First Name</TableHead>
                                <TableHead>Last Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Birth Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-4">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : paginated.length ? (
                                paginated.map((student) => {
                                    const isEditing = editingId === student.studentNo;
                                    return (
                                        <TableRow key={student.studentNo}>
                                            <TableCell className="font-mono text-xs">{student.studentNo}</TableCell>
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
                                            <TableCell className="text-right">
                                                {isEditing ? (
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 text-green-600"
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
                                                            className="h-8 w-8 text-red-600"
                                                            onClick={cancelEdit}
                                                            disabled={isSaving}
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8"
                                                        onClick={() => startEdit(student)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-4">
                                        No students found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-end space-x-2 mt-4">
                            <Button
                                size="sm"
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                Prev
                            </Button>
                            <span className="flex items-center px-2">{currentPage}</span>
                            <Button
                                size="sm"
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                            >
                                Next
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
