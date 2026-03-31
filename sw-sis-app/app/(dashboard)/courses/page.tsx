"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Check, X, Trash2 } from "lucide-react";

export default function CoursesPage() {
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [open, setOpen] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState({
        code: "",
        name: "",
        description: "",
    });

    // --- Inline Edit State ---
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);

    // --- Bulk Delete / Selection ---
    const [selectedCourses, setSelectedCourses] = useState<string[]>([]);

    // --- Search & Pagination ---
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const router = useRouter();

    // --- Fetch Courses ---
    const fetchCourses = async () => {
        try {
            setLoading(true);
            const url = new URL("/api/courses", location.origin);
            if (search) url.searchParams.set("search", search);

            const res = await fetch(url.toString(), { credentials: "include" });
            if (res.status === 401) {
                router.push("/login");
                return;
            }
            const data = await res.json();
            if (Array.isArray(data)) setCourses(data);
        } catch {
            toast.error("Could not connect to the server");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCourses();
    }, [search]);

    // --- Inline Editing ---
    const startEdit = (course: any) => {
        setEditingId(course.id);
        setEditData({ ...course });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditData(null);
    };

    const saveEdit = async (id: string) => {
        setIsSaving(true);
        try {
            const res = await fetch(`/api/courses/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editData),
                credentials: "include",
            });
            if (res.ok) {
                toast.success("Course updated successfully");
                setEditingId(null);
                fetchCourses();
            } else {
                toast.error("Update failed");
            }
        } catch {
            toast.error("Error saving changes");
        } finally {
            setIsSaving(false);
        }
    };

    // --- Add Course ---
    const handleAddCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsAdding(true);
        try {
            const res = await fetch("/api/courses", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
                credentials: "include",
            });
            if (res.ok) {
                toast.success("Course added successfully");
                setOpen(false);
                setFormData({ code: "", name: "", description: "" });
                fetchCourses();
            } else {
                const err = await res.json();
                toast.error(err.message || "Failed to add course");
            }
        } catch {
            toast.error("An error occurred");
        } finally {
            setIsAdding(false);
        }
    };

    // --- Delete Course ---
    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this course?")) return;
        try {
            const res = await fetch(`/api/courses/${id}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (res.ok) {
                toast.success("Course deleted");
                fetchCourses();
            } else {
                const err = await res.json();
                toast.error(err.message || "Failed to delete course");
            }
        } catch {
            toast.error("An error occurred");
        }
    };

    // --- Bulk Delete ---
    const toggleSelect = (id: string) => {
        setSelectedCourses((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    };

    const handleBulkDelete = async () => {
        if (!selectedCourses.length) return;
        if (!confirm(`Delete ${selectedCourses.length} selected courses?`)) return;

        try {
            const res = await fetch("/api/courses", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: selectedCourses }),
                credentials: "include",
            });
            if (res.ok) {
                toast.success("Selected courses deleted");
                setSelectedCourses([]);
                fetchCourses();
            } else {
                const err = await res.json();
                toast.error(err.message || "Failed to delete courses");
            }
        } catch {
            toast.error("An error occurred");
        }
    };

    // --- Pagination ---
    const totalPages = Math.ceil(courses.length / itemsPerPage);
    const paginated = courses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Courses</h2>
                    <p className="text-muted-foreground">Manage the curriculum and course details.</p>
                </div>

                <div className="flex gap-2">
                    <Input
                        placeholder="Search courses..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-64"
                    />
                    <Button variant="destructive" onClick={handleBulkDelete} disabled={!selectedCourses.length}>
                        Delete Selected ({selectedCourses.length})
                    </Button>
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="h-4 w-4" /> Add Course
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Course</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleAddCourse} className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="code">Course Code</Label>
                                    <Input
                                        id="code"
                                        placeholder="e.g. CS101"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="name">Course Name</Label>
                                    <Input
                                        id="name"
                                        placeholder="e.g. Introduction to Computer Science"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Input
                                        id="description"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                                <DialogFooter>
                                    <Button type="submit" disabled={isAdding} className="w-full">
                                        {isAdding ? "Saving..." : "Save Course"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">
                                    <input
                                        type="checkbox"
                                        checked={selectedCourses.length === courses.length && courses.length > 0}
                                        onChange={() => {
                                            if (selectedCourses.length === courses.length) setSelectedCourses([]);
                                            else setSelectedCourses(courses.map((c) => c.id));
                                        }}
                                    />
                                </TableHead>
                                <TableHead>Code</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-10">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginated.map((course) => {
                                    const isEditing = editingId === course.id;
                                    return (
                                        <TableRow key={course.id}>
                                            <TableCell>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCourses.includes(course.id)}
                                                    onChange={() => toggleSelect(course.id)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {isEditing ? (
                                                    <Input
                                                        value={editData.code}
                                                        onChange={(e) =>
                                                            setEditData({ ...editData, code: e.target.value })
                                                        }
                                                        className="h-8 w-24"
                                                    />
                                                ) : (
                                                    course.code
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {isEditing ? (
                                                    <Input
                                                        value={editData.name}
                                                        onChange={(e) =>
                                                            setEditData({ ...editData, name: e.target.value })
                                                        }
                                                        className="h-8"
                                                    />
                                                ) : (
                                                    course.name
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {isEditing ? (
                                                    <Input
                                                        value={editData.description}
                                                        onChange={(e) =>
                                                            setEditData({ ...editData, description: e.target.value })
                                                        }
                                                        className="h-8"
                                                    />
                                                ) : (
                                                    course.description
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right flex justify-end gap-2">
                                                {isEditing ? (
                                                    <>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => saveEdit(course.id)}
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
                                                            variant="secondary"
                                                            onClick={() => startEdit(course)}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="destructive"
                                                            onClick={() => handleDelete(course.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>

                    <div className="flex justify-end gap-2 mt-4">
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage((p) => p - 1)}
                        >
                            Previous
                        </Button>
                        <span className="flex items-center px-2 text-sm text-muted-foreground">
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
