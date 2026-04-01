"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Save, Trash2 } from "lucide-react";

export default function AdminReservationsPage() {
    const [students, setStudents] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [reservations, setReservations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [selectedStudentId, setSelectedStudentId] = useState("");
    const [selectedSubjectId, setSelectedSubjectId] = useState("");

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
            toast.success("Saved");
            fetchData();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/reservations/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Delete failed");
            toast.success("Removed");
            fetchData();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <h2 className="text-3xl font-bold">Subject Reservations</h2>
            <div className="flex flex-col lg:flex-row gap-6">
                <Card className="w-full lg:w-[350px] h-fit">
                    <CardHeader>
                        <CardTitle>Admin Entry</CardTitle>
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
                                    <option value="">Select Student</option>
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
                                    <option value="">Select Subject</option>
                                    {subjects.map((sub) => (
                                        <option key={sub.id} value={sub.id}>
                                            {sub.code} - {sub.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <Button type="submit" className="w-full" disabled={isSaving}>
                                {isSaving ? (
                                    <Loader2 className="animate-spin h-4 w-4" />
                                ) : (
                                    <Save className="h-4 w-4 mr-2" />
                                )}
                                Add Reservation
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <div className="flex-1 border rounded-lg bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Student</TableHead>
                                <TableHead>Code</TableHead>
                                <TableHead>Subject</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-10">
                                        <Loader2 className="animate-spin inline" />
                                    </TableCell>
                                </TableRow>
                            ) : reservations.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                                        No records
                                    </TableCell>
                                </TableRow>
                            ) : (
                                reservations.map((r) => (
                                    <TableRow key={r.id}>
                                        <TableCell className="font-medium">{r.studentName}</TableCell>
                                        <TableCell className="font-mono text-xs">{r.subjectCode}</TableCell>
                                        <TableCell>{r.subjectTitle}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
