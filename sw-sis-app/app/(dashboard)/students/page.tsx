"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, UserX } from "lucide-react";
import { toast } from "sonner";

export default function StudentsPage() {
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const fetchStudents = async () => {
        try {
            setLoading(true);

            const response = await fetch("/api/students", {
                method: "GET",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            const data = await response.json();

            if (response.status === 401) {
                toast.error("Session expired. Please login again.");
                router.push("/login");
                return;
            }

            if (Array.isArray(data)) {
                setStudents(data);
            } else {
                console.error("API returned non-array data:", data);
                setStudents([]);
                toast.error("Failed to load student list format.");
            }
        } catch (error) {
            console.error("Fetch error:", error);
            toast.error("Could not connect to the server.");
            setStudents([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Students</h2>
                    <p className="text-muted-foreground">View and manage enrolled student records.</p>
                </div>
            </div>

            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle>All Students</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex h-32 items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : students.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <UserX className="h-10 w-10 text-muted-foreground mb-4" />
                            <p className="text-lg font-medium">No students found</p>
                            <p className="text-sm text-muted-foreground">
                                There are currently no records in the database.
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow>
                                        <TableHead className="w-[120px]">Student No</TableHead>
                                        <TableHead>First Name</TableHead>
                                        <TableHead>Last Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Birth Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {students.map((student) => (
                                        <TableRow key={student.studentNo} className="hover:bg-slate-50/50">
                                            <TableCell className="font-mono text-xs font-semibold">
                                                {student.studentNo}
                                            </TableCell>
                                            <TableCell>{student.firstName}</TableCell>
                                            <TableCell>{student.lastName}</TableCell>
                                            <TableCell className="text-muted-foreground">{student.email}</TableCell>
                                            <TableCell>
                                                {student.birthDate
                                                    ? new Date(student.birthDate).toLocaleDateString()
                                                    : "N/A"}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
