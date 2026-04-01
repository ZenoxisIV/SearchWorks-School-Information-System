"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { FieldError } from "@/components/form-error";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Check, X, Trash2 } from "lucide-react";
import { courseSchema } from "@/lib/validations";

export default function CoursesPage() {
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [openAdd, setOpenAdd] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState({ code: "", name: "", description: "" });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);

    const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<null | { type: "single" | "bulk"; id?: string }>(null);

    const router = useRouter();

    // --- Fetch Courses ---
    const fetchCourses = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/courses", { credentials: "include" });
            if (res.status === 401) return router.push("/login");
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
    }, []);

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
                toast.success("Course updated");
                setEditingId(null);
                fetchCourses();
            } else toast.error("Update failed");
        } catch {
            toast.error("Error saving changes");
        } finally {
            setIsSaving(false);
        }
    };

    // --- Add Course ---
    const handleAddCourse = async (e: React.SubmitEvent) => {
        e.preventDefault();
        setErrors({});

        // Validate with Zod schema
        const result = courseSchema.safeParse(formData);
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
            const res = await fetch("/api/courses", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
                credentials: "include",
            });
            if (res.ok) {
                toast.success("Course added");
                setOpenAdd(false);
                setFormData({ code: "", name: "", description: "" });
                setErrors({});
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

    // --- Delete ---
    const handleDeleteConfirmed = async () => {
        if (!deleteTarget) return;

        try {
            if (deleteTarget.type === "single" && deleteTarget.id) {
                const res = await fetch(`/api/courses/${deleteTarget.id}`, {
                    method: "DELETE",
                    credentials: "include",
                });
                if (res.ok) toast.success("Course deleted");
                else {
                    const err = await res.json();
                    toast.error(err.message || "Failed to delete");
                }
            } else if (deleteTarget.type === "bulk") {
                const res = await fetch("/api/courses", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ids: selectedCourses }),
                    credentials: "include",
                });
                if (res.ok) {
                    toast.success("Selected courses deleted");
                    setSelectedCourses([]);
                } else {
                    const err = await res.json();
                    toast.error(err.message || "Failed to delete");
                }
            }
        } catch {
            toast.error("An error occurred");
        } finally {
            fetchCourses();
            setDeleteModalOpen(false);
            setDeleteTarget(null);
        }
    };

    // --- Bulk Delete / Selection ---
    const toggleSelect = (id: string) => {
        setSelectedCourses((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    };

    // --- Global Search Filter ---
    const filteredCourses = courses.filter((course) =>
        [course.code, course.name, course.description].some((v) => v?.toLowerCase().includes(search.toLowerCase())),
    );

    const totalPages = Math.ceil(filteredCourses.length / itemsPerPage);
    const paginated = filteredCourses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="space-y-6 p-6">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Courses</h2>
                    <p className="text-muted-foreground">Manage all courses and curriculum details.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Input
                        placeholder="Search courses..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="w-64"
                    />
                    <Button
                        variant="destructive"
                        disabled={!selectedCourses.length}
                        onClick={() => {
                            setDeleteTarget({ type: "bulk" });
                            setDeleteModalOpen(true);
                        }}
                    >
                        Delete Selected ({selectedCourses.length})
                    </Button>
                    <Dialog open={openAdd} onOpenChange={setOpenAdd}>
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
                                        placeholder="CS101"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                        required
                                    />
                                    <FieldError message={errors.code} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="name">Course Name</Label>
                                    <Input
                                        id="name"
                                        placeholder="Intro to CS"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                    <FieldError message={errors.name} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Input
                                        id="description"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                    <FieldError message={errors.description} />
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

            {/* Table */}
            <Card>
                <CardContent className="pt-6">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">
                                    <Checkbox
                                        checked={selectedCourses.length === courses.length && courses.length > 0}
                                        onCheckedChange={() =>
                                            selectedCourses.length === courses.length
                                                ? setSelectedCourses([])
                                                : setSelectedCourses(courses.map((c) => c.id))
                                        }
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
                                                <Checkbox
                                                    checked={selectedCourses.includes(course.id)}
                                                    onCheckedChange={() => toggleSelect(course.id)}
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
                                                            onClick={() => {
                                                                setDeleteTarget({ type: "single", id: course.id });
                                                                setDeleteModalOpen(true);
                                                            }}
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

            {/* --- Delete Confirmation Modal --- */}
            <DeleteConfirmDialog
                open={deleteModalOpen}
                onOpenChange={setDeleteModalOpen}
                title="Delete Course"
                description={
                    deleteTarget?.type === "bulk"
                        ? `Are you sure you want to delete all ${selectedCourses.length} selected courses?`
                        : "Are you sure you want to delete this course? This action cannot be undone."
                }
                onConfirm={handleDeleteConfirmed}
            />
        </div>
    );
}
