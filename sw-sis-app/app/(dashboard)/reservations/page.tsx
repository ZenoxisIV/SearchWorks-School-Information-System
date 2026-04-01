"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Save, Trash2, Search as SearchIcon, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function AdminReservationsPage() {
    const [students, setStudents] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [reservations, setReservations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [selectedStudentId, setSelectedStudentId] = useState("");
    const [selectedSubjectId, setSelectedSubjectId] = useState("");
    const [filterSubjectCode, setFilterSubjectCode] = useState("");

    const [search, setSearch] = useState("");
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [stRes, subRes, resRes] = await Promise.all([
                fetch("/api/students"),
                fetch("/api/subjects"),
                fetch("/api/reservations"),
            ]);
            setStudents(await stRes.json());
            setSubjects(await subRes.json());
            const resData = await resRes.json();
            setReservations(Array.isArray(resData) ? resData : []);
        } catch {
            toast.error("Fetch failed");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSave = async (e: React.SubmitEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const res = await fetch("/api/reservations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ studentId: selectedStudentId, subjectId: selectedSubjectId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            toast.success("Reservation added");
            setSelectedStudentId("");
            setSelectedSubjectId("");
            fetchData();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const confirmDelete = (id: string) => {
        setDeleteTargetId(id);
        setDeleteModalOpen(true);
    };

    const handleDeleteConfirmed = async () => {
        if (!deleteTargetId) return;
        try {
            const res = await fetch(`/api/reservations/${deleteTargetId}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Delete failed");
            toast.success("Reservation removed");
            fetchData();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setDeleteModalOpen(false);
            setDeleteTargetId(null);
        }
    };

    // Filter reservations by search and subject code
    const filteredReservations = reservations.filter(
        (r) =>
            (r.studentName.toLowerCase().includes(search.toLowerCase()) ||
                r.subjectCode.toLowerCase().includes(search.toLowerCase()) ||
                r.subjectTitle.toLowerCase().includes(search.toLowerCase())) &&
            (filterSubjectCode === "" || r.subjectCode === filterSubjectCode),
    );

    return (
        <div className="p-6 space-y-6">
            <h2 className="text-3xl font-bold">Subject Reservations</h2>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Reservation Entry Form */}
                <Card className="w-full lg:w-[350px] h-fit">
                    <CardHeader>
                        <CardTitle>Reservation Entry</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Student</Label>
                                <select
                                    className="w-full p-2 border rounded-md bg-background text-sm"
                                    value={selectedStudentId}
                                    onChange={(e) => setSelectedStudentId(e.target.value)}
                                    required
                                >
                                    <option value="">- Select Student -</option>
                                    {students.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.lastName}, {s.firstName}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label>Subject</Label>
                                <select
                                    className="w-full p-2 border rounded-md bg-background text-sm"
                                    value={selectedSubjectId}
                                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                                    required
                                >
                                    <option value="">- Select Subject -</option>
                                    {subjects.map((sub) => (
                                        <option key={sub.id} value={sub.id}>
                                            {sub.code} - {sub.title}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <Button
                                type="submit"
                                className="w-full flex justify-center items-center gap-2"
                                disabled={isSaving}
                            >
                                {isSaving && <Loader2 className="animate-spin h-4 w-4" />}
                                <Save className="h-4 w-4" />
                                Add Reservation
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Reservations Table */}
                <div className="flex-1 border rounded-lg bg-card p-4 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                        <Input
                            placeholder="Search..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="max-w-xs"
                        />
                        <div className="flex items-center gap-2">
                            <select
                                className="p-2 border rounded-md bg-background text-sm"
                                value={filterSubjectCode}
                                onChange={(e) => setFilterSubjectCode(e.target.value)}
                            >
                                <option value="">All Subjects</option>
                                {subjects.map((sub) => (
                                    <option key={sub.id} value={sub.code}>
                                        {sub.code}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Student</TableHead>
                                <TableHead>Subject Code</TableHead>
                                <TableHead>Subject</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-10">
                                        <Loader2 className="animate-spin inline" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredReservations.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                                        No reservations found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredReservations.map((r) => (
                                    <TableRow key={r.id}>
                                        <TableCell className="font-medium">{r.studentName}</TableCell>
                                        <TableCell className="font-mono text-xs">{r.subjectCode}</TableCell>
                                        <TableCell>{r.subjectTitle}</TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => confirmDelete(r.id)}
                                                className="text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader className="flex flex-col items-center gap-2">
                        <AlertTriangle className="h-10 w-10 text-destructive" />
                        <DialogTitle>Confirm Delete</DialogTitle>
                    </DialogHeader>
                    <p className="py-4 text-center">
                        Are you sure you want to delete this reservation? This action cannot be undone.
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
        </div>
    );
}
