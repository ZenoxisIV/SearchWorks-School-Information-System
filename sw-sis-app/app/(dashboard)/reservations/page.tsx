"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Save, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

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
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
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

    const filteredReservations = reservations.filter(
        (r) =>
            (r.studentName.toLowerCase().includes(search.toLowerCase()) ||
                r.subjectCode.toLowerCase().includes(search.toLowerCase()) ||
                r.subjectTitle.toLowerCase().includes(search.toLowerCase())) &&
            (filterSubjectCode === "" || r.subjectCode === filterSubjectCode),
    );

    const totalPages = Math.ceil(filteredReservations.length / itemsPerPage);
    const paginatedReservations = filteredReservations.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage,
    );

    return (
        <div className="p-6 space-y-6">
            <h2 className="text-3xl font-bold">Subject Reservations</h2>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Reservation Entry Form */}
                <Card className="w-80 h-fit flex-shrink-0">
                    <CardHeader>
                        <CardTitle>Reservation Entry</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Subject</Label>
                                <Select
                                    value={selectedSubjectId}
                                    onValueChange={(value) => setSelectedSubjectId(value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="- Select Subject -" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {subjects.map((sub) => (
                                            <SelectItem key={sub.id} value={sub.id}>
                                                {sub.code} - {sub.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Student</Label>
                                <Select
                                    value={selectedStudentId}
                                    onValueChange={(value) => setSelectedStudentId(value)}
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
                            </div>

                            <Button type="submit" disabled={isSaving} className="w-full">
                                {isSaving && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
                                <Save className="h-4 w-4 mr-2" />
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
                            <Select value={filterSubjectCode} onValueChange={(value) => setFilterSubjectCode(value)}>
                                <SelectTrigger className="w-full lg:w-48">
                                    <SelectValue placeholder="All Subjects" />
                                </SelectTrigger>
                                <SelectContent>
                                    {subjects.map((sub) => (
                                        <SelectItem key={sub.id} value={sub.code}>
                                            {sub.code}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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
                            ) : paginatedReservations.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                                        No reservations found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedReservations.map((r) => (
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
                        <span className="flex items-center px-2 text-sm">
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
            </div>

            {/* Delete Confirmation Modal */}
            <DeleteConfirmDialog
                open={deleteModalOpen}
                onOpenChange={setDeleteModalOpen}
                title="Delete Reservation"
                description="Are you sure you want to delete this reservation? This action cannot be undone."
                onConfirm={handleDeleteConfirmed}
            />
        </div>
    );
}
