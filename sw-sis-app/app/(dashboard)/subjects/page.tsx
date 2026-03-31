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
import { Loader2, Plus, Pencil, Check, X, Trash2, Layers, BookOpen } from "lucide-react";

export default function SubjectsPage() {
    const [subjects, setSubjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<string[]>([]);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Form/Edit State
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({ code: "", title: "", units: "" });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<any>(null);

    const router = useRouter();

    const fetchSubjects = async () => {
        setLoading(true);
        try {
            const url = new URL("/api/subjects", window.location.origin);
            if (search) url.searchParams.set("search", search);

            const res = await fetch(url.toString(), { credentials: "include" });
            if (res.status === 401) return router.push("/login");
            setSubjects(await res.json());
        } catch (err) {
            toast.error("Failed to fetch subjects");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubjects();
    }, [search]);

    const handleAdd = async (e: React.SubmitEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const res = await fetch("/api/subjects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
            credentials: "include",
        });

        if (res.ok) {
            toast.success("Subject added");
            setOpen(false);
            setFormData({ code: "", title: "", units: "" });
            fetchSubjects();
        } else {
            const err = await res.json();
            toast.error(err.message);
        }
        setIsSubmitting(false);
    };

    const saveEdit = async (id: string) => {
        const res = await fetch(`/api/subjects/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(editData),
            credentials: "include",
        });

        if (res.ok) {
            toast.success("Updated");
            setEditingId(null);
            fetchSubjects();
        } else {
            toast.error("Update failed");
        }
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Delete ${selected.length} subjects?`)) return;
        await fetch("/api/subjects", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: selected }),
            credentials: "include",
        });
        setSelected([]);
        fetchSubjects();
    };

    const [prereqOpen, setPrereqOpen] = useState(false);
    const [activeSubject, setActiveSubject] = useState<any>(null);
    const [prereqs, setPrereqs] = useState<any[]>([]);

    const fetchPrereqs = async (id: string) => {
        const res = await fetch(`/api/subjects/${id}/prerequisites`, { credentials: "include" });
        setPrereqs(await res.json());
    };

    const handleOpenPrereqs = (subject: any) => {
        setActiveSubject(subject);
        fetchPrereqs(subject.id);
        setPrereqOpen(true);
    };

    const handleAddPrereq = async (prereqId: string) => {
        const res = await fetch(`/api/subjects/${activeSubject.id}/prerequisites`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prerequisiteSubjectId: prereqId }),
            credentials: "include",
        });
        if (res.ok) {
            toast.success("Added");
            fetchPrereqs(activeSubject.id);
        } else {
            const err = await res.json();
            toast.error(err.message);
        }
    };

    const removePrereq = async (prereqId: string) => {
        await fetch(`/api/subjects/${activeSubject.id}/prerequisites/${prereqId}`, {
            method: "DELETE",
            credentials: "include",
        });
        fetchPrereqs(activeSubject.id);
    };

    // Pagination Logic
    const paginated = subjects.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(subjects.length / itemsPerPage);

    return (
        <div className="space-y-6 p-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold">Subjects</h2>
                    <p className="text-muted-foreground text-sm">Manage academic subjects and unit credits.</p>
                </div>

                <div className="flex gap-2">
                    <Input
                        placeholder="Search title..."
                        className="w-64"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <Button variant="destructive" onClick={handleBulkDelete} disabled={!selected.length}>
                        Delete Selected ({selected.length})
                    </Button>

                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> Add Subject
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>New Subject</DialogTitle>
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
                                    {isSubmitting ? <Loader2 className="animate-spin" /> : "Save Subject"}
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                    <Dialog open={prereqOpen} onOpenChange={setPrereqOpen}>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Prerequisites: {activeSubject?.title}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="border rounded-md p-2 max-h-40 overflow-y-auto">
                                    {prereqs.length === 0 && (
                                        <p className="text-sm text-muted-foreground">No prerequisites set.</p>
                                    )}
                                    {prereqs.map((p) => (
                                        <div
                                            key={p.id}
                                            className="flex justify-between items-center p-2 hover:bg-muted rounded-sm"
                                        >
                                            <span className="text-sm font-medium">
                                                {p.code} - {p.title}
                                            </span>
                                            <Button variant="ghost" size="icon" onClick={() => removePrereq(p.id)}>
                                                <X className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                                <div className="space-y-2">
                                    <Label>Add Prerequisite</Label>
                                    <select
                                        className="w-full p-2 border rounded-md bg-background"
                                        onChange={(e) => handleAddPrereq(e.target.value)}
                                        value=""
                                    >
                                        <option value="" disabled>
                                            Select a subject...
                                        </option>
                                        {subjects
                                            .filter(
                                                (sub) =>
                                                    // Self-reference check
                                                    sub.id !== activeSubject?.id &&
                                                    // Not already a prereq
                                                    !prereqs.find((p) => p.id === sub.id) &&
                                                    // Course match
                                                    sub.courseId === activeSubject?.courseId,
                                            )
                                            .map((sub) => (
                                                <option key={sub.id} value={sub.id}>
                                                    {sub.code} - {sub.title}
                                                </option>
                                            ))}
                                    </select>
                                    <p className="text-[10px] text-muted-foreground italic">
                                        * Only subjects within the same course are displayed.
                                    </p>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
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
                                        onChange={(e) => setSelected(e.target.checked ? subjects.map((s) => s.id) : [])}
                                        checked={selected.length === subjects.length && subjects.length > 0}
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
                            ) : (
                                paginated.map((s) => {
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
                                                            variant="outline"
                                                            onClick={() => handleOpenPrereqs(s)}
                                                        >
                                                            <Layers className="h-4 w-4" />
                                                        </Button>
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
                                                            onClick={async () => {
                                                                if (confirm("Delete?")) {
                                                                    await fetch(`/api/subjects/${s.id}`, {
                                                                        method: "DELETE",
                                                                        credentials: "include",
                                                                    });
                                                                    fetchSubjects();
                                                                }
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
        </div>
    );
}
