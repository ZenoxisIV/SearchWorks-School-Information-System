"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { FieldError } from "@/components/form-error";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Check, X, Trash2, MoreHorizontal } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { subjectSchema } from "@/lib/validations";

export default function SubjectsPage() {
    const [subjects, setSubjects] = useState<any[]>([]);
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedCourse, setSelectedCourse] = useState("");
    const [selected, setSelected] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({ code: "", title: "", units: "", description: "", courseId: "" });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<any>(null);

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<null | { type: "single" | "bulk"; id?: string }>(null);

    const fetchSubjects = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/subjects", { credentials: "include" });
            if (!res.ok) throw new Error("Failed to fetch subjects");
            setSubjects(await res.json());
        } catch {
            toast.error("Failed to fetch subjects");
        } finally {
            setLoading(false);
        }
    };

    const fetchCourses = async () => {
        try {
            const res = await fetch("/api/courses", { credentials: "include" });
            if (res.ok) {
                setCourses(await res.json());
            }
        } catch {
            toast.error("Failed to fetch courses");
        }
    };

    useEffect(() => {
        fetchSubjects();
        fetchCourses();
    }, []);

    const handleAdd = async (e: React.SubmitEvent) => {
        e.preventDefault();
        setErrors({});

        // Validate with Zod schema
        const result = subjectSchema.safeParse(formData);
        if (!result.success) {
            const fieldErrors: Record<string, string> = {};
            result.error.issues.forEach((issue: any) => {
                const field = issue.path[0] as string;
                fieldErrors[field] = issue.message;
            });
            setErrors(fieldErrors);
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch("/api/subjects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
                credentials: "include",
            });
            if (!res.ok) throw await res.json();
            toast.success("Subject added");
            setOpen(false);
            setFormData({ code: "", title: "", units: "", description: "", courseId: "" });
            setErrors({});
            fetchSubjects();
        } catch (err: any) {
            toast.error(err.message || "Failed to add subject");
        } finally {
            setIsSubmitting(false);
        }
    };

    const saveEdit = async (id: string) => {
        try {
            const res = await fetch(`/api/subjects/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editData),
                credentials: "include",
            });
            if (!res.ok) throw new Error("Update failed");
            toast.success("Updated");
            setEditingId(null);
            fetchSubjects();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const confirmDelete = (id: string) => {
        setDeleteTarget({ type: "single", id });
        setDeleteModalOpen(true);
    };

    const handleDeleteConfirmed = async () => {
        if (!deleteTarget?.id) return;
        try {
            const res = await fetch(`/api/subjects/${deleteTarget.id}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (!res.ok) throw new Error("Delete failed");
            toast.success("Deleted");
            fetchSubjects();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setDeleteModalOpen(false);
            setDeleteTarget(null);
            setSelected((prev) => prev.filter((id) => id !== deleteTarget.id));
        }
    };

    const filteredSubjects = subjects.filter((s) => {
        const matchesSearch =
            s.code.toLowerCase().includes(search.toLowerCase()) || s.title.toLowerCase().includes(search.toLowerCase());
        const matchesCourse = !selectedCourse || s.courseId === selectedCourse;
        return matchesSearch && matchesCourse;
    });

    const paginatedSubjects = filteredSubjects.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(filteredSubjects.length / itemsPerPage);

    return (
        <div className="space-y-6 p-6">
            <div>
                <h2 className="text-3xl font-bold">Subjects</h2>
                <p className="text-muted-foreground text-sm">Manage academic subjects and unit credits.</p>
            </div>

            {/* Table */}
            <Card>
                <CardContent className="pt-6">
                    {/* Search and Filter Controls */}
                    <div className="space-y-4 mb-6">
                        <div className="flex flex-col sm:flex-row gap-3 items-end">
                            <div className="flex flex-col sm:flex-row gap-3 items-end">
                                <div className="w-64">
                                    <Input
                                        placeholder="Search by code or title..."
                                        value={search}
                                        onChange={(e) => {
                                            setSearch(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                    />
                                </div>
                                <div className="w-48 flex gap-2">
                                    <Select value={selectedCourse} onValueChange={(val) => {
                                        setSelectedCourse(val);
                                        setCurrentPage(1);
                                    }}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="All courses" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {courses.map((c) => (
                                                <SelectItem key={c.id} value={c.id}>
                                                    {c.code} - {c.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {selectedCourse && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setSelectedCourse("");
                                                setCurrentPage(1);
                                            }}
                                            className="px-2"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2 ml-auto">
                                <Dialog open={open} onOpenChange={setOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="sm" className="gap-2">
                                            <Plus className="h-4 w-4" />
                                            Add Subject
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Subject</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAdd} className="space-y-4">
                        <div>
                            <Label>Code</Label>
                            <Input
                                required
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                            />
                            <FieldError message={errors.code} />
                        </div>
                        <div>
                            <Label>Title</Label>
                            <Input
                                required
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            />
                            <FieldError message={errors.title} />
                        </div>
                        <div>
                            <Label>Units</Label>
                            <Input
                                type="number"
                                required
                                value={formData.units}
                                onChange={(e) => setFormData({ ...formData, units: e.target.value })}
                            />
                            <FieldError message={errors.units} />
                        </div>
                        <div>
                            <Label>Course</Label>
                            <Select value={formData.courseId} onValueChange={(val) => setFormData({ ...formData, courseId: val })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select course" />
                                </SelectTrigger>
                                <SelectContent>
                                    {courses.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FieldError message={errors.courseId} />
                        </div>
                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin" /> : "Save"}
                        </Button>
                    </form>
                </DialogContent>
                                </Dialog>
                                {selected.length > 0 && (
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => selected.forEach(confirmDelete)}
                                    >
                                        Delete Selected ({selected.length})
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">
                                    <Checkbox
                                        checked={selected.length === subjects.length && subjects.length > 0}
                                        onCheckedChange={(checked) =>
                                            setSelected(checked ? subjects.map((s) => s.id) : [])
                                        }
                                    />
                                </TableHead>
                                <TableHead>Code</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Course Code</TableHead>
                                <TableHead>Units</TableHead>
                                <TableHead className="text-right w-32">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10">
                                        <Loader2 className="animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : paginatedSubjects.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                        No subjects found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedSubjects.map((s) => {
                                    const editing = editingId === s.id;
                                    return (
                                        <TableRow key={s.id}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={selected.includes(s.id)}
                                                    onCheckedChange={() =>
                                                        setSelected((prev) =>
                                                            prev.includes(s.id)
                                                                ? prev.filter((i) => i !== s.id)
                                                                : [...prev, s.id],
                                                        )
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {editing ? (
                                                    <Input
                                                        className="h-8"
                                                        value={editData.code}
                                                        onChange={(e) =>
                                                            setEditData({ ...editData, code: e.target.value })
                                                        }
                                                    />
                                                ) : (
                                                    s.code
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {editing ? (
                                                    <Input
                                                        className="h-8"
                                                        value={editData.title}
                                                        onChange={(e) =>
                                                            setEditData({ ...editData, title: e.target.value })
                                                        }
                                                    />
                                                ) : (
                                                    s.title
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {editing ? (
                                                    <Input
                                                        className="h-8"
                                                        value={editData.courseId}
                                                        disabled
                                                    />
                                                ) : (
                                                    courses.find((c) => c.id === s.courseId)?.code || "-"
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {editing ? (
                                                    <Input
                                                        className="h-8 w-20"
                                                        type="number"
                                                        value={editData.units}
                                                        onChange={(e) =>
                                                            setEditData({ ...editData, units: e.target.value })
                                                        }
                                                    />
                                                ) : (
                                                    s.units
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right flex justify-end gap-1">
                                                {editing ? (
                                                    <>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => saveEdit(s.id)}
                                                        >
                                                            <Check className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => setEditingId(null)}
                                                        >
                                                            <X className="h-4 w-4 text-red-500" />
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                title="More actions"
                                                            >
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem
                                                                onClick={() => {
                                                                    setEditingId(s.id);
                                                                    setEditData(s);
                                                                }}
                                                            >
                                                                <Pencil className="h-4 w-4 mr-2" />
                                                                Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => confirmDelete(s.id)}
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
                                })
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination */}
                    <div className="p-4 flex items-center justify-end space-x-2 border-t">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((p) => p - 1)}
                            disabled={currentPage === 1}
                        >
                            Previous
                        </Button>
                        <span className="flex items-center px-2 text-sm text-muted-foreground">
                            Page {currentPage} of {totalPages || 1}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((p) => p + 1)}
                            disabled={currentPage >= totalPages}
                        >
                            Next
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Delete Confirmation Modal */}
            <DeleteConfirmDialog
                open={deleteModalOpen}
                onOpenChange={setDeleteModalOpen}
                title="Delete Subject"
                description="Are you sure you want to delete this subject? This action cannot be undone."
                onConfirm={handleDeleteConfirmed}
            />
        </div>
    );
}
