"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Check, X, Trash2 } from "lucide-react";

export default function SubjectsPage() {
    const [subjects, setSubjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({ code: "", title: "", units: "" });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<any>(null);

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

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

    useEffect(() => {
        fetchSubjects();
    }, []);

    const handleAdd = async (e: React.SubmitEvent) => {
        e.preventDefault();
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
            setFormData({ code: "", title: "", units: "" });
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
        setDeleteTargetId(id);
        setDeleteModalOpen(true);
    };

    const handleDeleteConfirmed = async () => {
        if (!deleteTargetId) return;
        try {
            const res = await fetch(`/api/subjects/${deleteTargetId}`, {
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
            setDeleteTargetId(null);
            setSelected((prev) => prev.filter((id) => id !== deleteTargetId));
        }
    };

    // Filter subjects client-side
    const filteredSubjects = subjects.filter(
        (s) =>
            s.code.toLowerCase().includes(search.toLowerCase()) || s.title.toLowerCase().includes(search.toLowerCase()),
    );

    const paginatedSubjects = filteredSubjects.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(filteredSubjects.length / itemsPerPage);

    return (
        <div className="space-y-6 p-6">
            <div className="flex justify-between items-end flex-wrap gap-4">
                <div>
                    <h2 className="text-3xl font-bold">Subjects</h2>
                    <p className="text-muted-foreground text-sm">Manage academic subjects and unit credits.</p>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                    <Input
                        placeholder="Search..."
                        className="w-56"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <Button
                        variant="destructive"
                        disabled={!selected.length}
                        onClick={() => selected.forEach(confirmDelete)}
                    >
                        Delete Selected ({selected.length})
                    </Button>
                    <Button onClick={() => setOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Add Subject
                    </Button>
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">
                                    <input
                                        type="checkbox"
                                        checked={selected.length === subjects.length && subjects.length > 0}
                                        onChange={(e) => setSelected(e.target.checked ? subjects.map((s) => s.id) : [])}
                                    />
                                </TableHead>
                                <TableHead>Code</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Units</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-10">
                                        <Loader2 className="animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : paginatedSubjects.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                        No subjects found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedSubjects.map((s) => {
                                    const editing = editingId === s.id;
                                    return (
                                        <TableRow key={s.id}>
                                            <TableCell>
                                                <input
                                                    type="checkbox"
                                                    checked={selected.includes(s.id)}
                                                    onChange={() =>
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
                                            <TableCell className="flex justify-end gap-1">
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
                                                    <>
                                                        <Button
                                                            size="icon"
                                                            variant="secondary"
                                                            onClick={() => {
                                                                setEditingId(s.id);
                                                                setEditData(s);
                                                            }}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="destructive"
                                                            onClick={() => confirmDelete(s.id)}
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
            <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Confirm Delete</DialogTitle>
                    </DialogHeader>
                    <p className="py-4 text-center">
                        Are you sure you want to delete this subject? This action cannot be undone.
                    </p>
                    <DialogFooter className="flex justify-center gap-4">
                        <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteConfirmed}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Subject Modal */}
            <Dialog open={open} onOpenChange={setOpen}>
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
                        </div>
                        <div>
                            <Label>Title</Label>
                            <Input
                                required
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label>Units</Label>
                            <Input
                                type="number"
                                required
                                value={formData.units}
                                onChange={(e) => setFormData({ ...formData, units: e.target.value })}
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin" /> : "Save"}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
