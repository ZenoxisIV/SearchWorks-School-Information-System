"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { toast } from "sonner";
import { Loader2, ArrowLeft, CheckCircle2, AlertCircle, Trash2, Plus } from "lucide-react";

export default function StudentProfilePage() {
    const { id } = useParams();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [profileData, setProfileData] = useState<any>(null);
    const [allCourseSubjects, setAllCourseSubjects] = useState<any[]>([]);
    const [submitting, setSubmitting] = useState<string | null>(null);

    // Modal states
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

    const fetchProfile = useCallback(async () => {
        try {
            setLoading(true);

            const res = await fetch(`/api/students/${id}/profile`);
            if (!res.ok) throw new Error("Student profile not found");

            const data = await res.json();
            setProfileData(data);

            if (data?.student?.courseId) {
                const subRes = await fetch(`/api/courses/${data.student.courseId}/subjects`);
                const subData = await subRes.json();
                setAllCourseSubjects(Array.isArray(subData) ? subData : []);
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to load data");
            setAllCourseSubjects([]);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const handleReserve = async (subjectId: string) => {
        setSubmitting(subjectId);
        try {
            const res = await fetch(`/api/students/${id}/reservations`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ subjectId }),
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.message || "Reservation failed");

            toast.success("Subject reserved");
            fetchProfile();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSubmitting(null);
        }
    };

    // Open modal for deletion
    const confirmDelete = (reservationId: string) => {
        setDeleteTargetId(reservationId);
        setDeleteModalOpen(true);
    };

    // Delete reservation when confirmed
    const handleDeleteConfirmed = async () => {
        if (!deleteTargetId) return;

        try {
            const res = await fetch(`/api/students/${id}/reservations/${deleteTargetId}`, {
                method: "DELETE",
            });

            if (!res.ok) throw new Error("Could not remove reservation");

            toast.success("Reservation removed");
            fetchProfile();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setDeleteModalOpen(false);
            setDeleteTargetId(null);
        }
    };

    const getEligibility = (subject: any) => {
        const grades = profileData?.grades || [];
        const reservations = profileData?.reservations || [];

        const passedSubjectIds = grades.filter((g: any) => g.remarks === "PASSED").map((g: any) => g.subjectId);
        const isAlreadyReserved = reservations.some((r: any) => r.subjectId === subject.id);
        const isAlreadyPassed = passedSubjectIds.includes(subject.id);

        const missingPrereqs = (subject.prerequisites || []).filter(
            (p: any) => !passedSubjectIds.includes(p.prerequisiteSubjectId),
        );

        return {
            isEligible: missingPrereqs.length === 0 && !isAlreadyPassed && !isAlreadyReserved,
            missing: missingPrereqs,
            isAlreadyReserved,
            isAlreadyPassed,
        };
    };

    if (loading)
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );

    if (!profileData) return <div className="p-10 text-center">Student not found.</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <Button variant="ghost" onClick={() => router.push("/students")} className="mb-4 text-base px-4 py-2">
                <ArrowLeft className="h-5 w-5 mr-2" /> Back
            </Button>

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-card p-6 rounded-xl border shadow-sm gap-4">
                <div>
                    <h1 className="text-3xl font-bold">
                        {profileData.student.firstName} {profileData.student.lastName}
                    </h1>
                    <p className="text-muted-foreground">
                        {profileData.student.studentNo} • {profileData.student.email}
                    </p>
                    <p className="text-muted-foreground text-sm">
                        Birthday:{" "}
                        {profileData.student.birthDate
                            ? new Date(profileData.student.birthDate).toLocaleDateString("en-PH", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                              })
                            : "N/A"}
                    </p>
                </div>
                <div className="text-right">
                    <Badge variant="outline" className="text-sm px-3 py-1">
                        {profileData.student.courseName || "No Course Assigned"}
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Grades */}
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Grades</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Subject Code</TableHead>
                                        <TableHead>Subject Name</TableHead>
                                        <TableHead>Prelim</TableHead>
                                        <TableHead>Midterm</TableHead>
                                        <TableHead>Finals</TableHead>
                                        <TableHead>Final Grade</TableHead>
                                        <TableHead className="text-right">Remarks</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {profileData.grades.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center text-muted-foreground py-4">
                                                No grades recorded
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        profileData.grades.map((g: any) => (
                                            <TableRow key={g.id}>
                                                <TableCell className="font-medium text-sm">{g.subjectCode}</TableCell>
                                                <TableCell className="text-sm font-medium">
                                                    {g.subjectTitle ?? "-"}
                                                </TableCell>
                                                <TableCell>{g.prelim ? Number(g.prelim).toFixed(2) : "-"}</TableCell>
                                                <TableCell>{g.midterm ? Number(g.midterm).toFixed(2) : "-"}</TableCell>
                                                <TableCell>{g.finals ? Number(g.finals).toFixed(2) : "-"}</TableCell>
                                                <TableCell>
                                                    {g.finalGrade ? Number(g.finalGrade).toFixed(2) : "-"}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Badge variant={g.remarks === "PASSED" ? "default" : "destructive"}>
                                                        {g.remarks}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                {/* Reservation */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Reservations</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Subject Code</TableHead>
                                        <TableHead>Subject Name</TableHead>
                                        <TableHead>Status / Prereqs</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {allCourseSubjects.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                                                No subjects found for this course.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        allCourseSubjects.map((sub) => {
                                            const { isEligible, missing, isAlreadyReserved, isAlreadyPassed } =
                                                getEligibility(sub);
                                            const reservation = profileData.reservations.find(
                                                (r: any) => r.subjectId === sub.id,
                                            );

                                            return (
                                                <TableRow key={sub.id}>
                                                    <TableCell className="font-mono text-xs">{sub.code}</TableCell>
                                                    <TableCell className="text-sm font-medium">{sub.title}</TableCell>

                                                    <TableCell>
                                                        {isAlreadyPassed ? (
                                                            <span className="flex items-center text-green-600 text-xs gap-1 font-semibold">
                                                                <CheckCircle2 className="h-3 w-3" /> Passed
                                                            </span>
                                                        ) : isAlreadyReserved ? (
                                                            <span className="flex items-center text-blue-600 text-xs gap-1 font-semibold">
                                                                <CheckCircle2 className="h-3 w-3" /> Reserved
                                                            </span>
                                                        ) : isEligible ? (
                                                            <span className="text-xs font-semibold text-gray-700">
                                                                Eligible
                                                            </span>
                                                        ) : (
                                                            <div className="flex flex-col gap-1">
                                                                <span className="text-destructive text-xs flex items-center gap-1 font-semibold">
                                                                    <AlertCircle className="h-3 w-3" /> Not Eligible
                                                                </span>
                                                                <span className="text-[10px] text-muted-foreground leading-tight">
                                                                    Need:{" "}
                                                                    {missing
                                                                        .map((m: any) => m.prerequisiteCode)
                                                                        .join(", ")}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </TableCell>

                                                    <TableCell className="text-right">
                                                        {isAlreadyReserved ? (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-destructive"
                                                                onClick={() => confirmDelete(reservation.id)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                size="sm"
                                                                variant={isEligible ? "default" : "secondary"}
                                                                disabled={!isEligible || submitting === sub.id}
                                                                onClick={() => handleReserve(sub.id)}
                                                            >
                                                                {submitting === sub.id ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <Plus className="h-4 w-4 mr-1" />
                                                                )}
                                                                Reserve
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
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
