"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, FilterX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface AuditLog {
    id: string;
    action: "CREATE" | "UPDATE";
    entityId: string;
    changes: Record<string, { old: any; new: any }>;
    createdAt: string;
    userEmail: string;
    studentName: string;
    studentNo: string;
    subjectCode: string;
    subjectTitle: string;
}

interface PaginationInfo {
    page: number;
    limit: number;
    total: number;
    pages: number;
}

interface FetchResult {
    logs: AuditLog[];
    pagination: PaginationInfo;
}

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState<PaginationInfo>({
        page: 1,
        limit: 10,
        total: 0,
        pages: 0,
    });

    const [search, setSearch] = useState("");
    const [actionFilter, setActionFilter] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

    const router = useRouter();

    const fetchLogs = async (page: number = 1) => {
        try {
            setLoading(true);

            const params = new URLSearchParams();
            params.set("page", page.toString());
            params.set("limit", "10");
            if (search) params.set("search", search);
            if (actionFilter) params.set("action", actionFilter);
            if (fromDate) params.set("fromDate", fromDate);
            if (toDate) params.set("toDate", toDate);

            const res = await fetch(`/api/audit-logs?${params.toString()}`, {
                credentials: "include",
            });

            if (res.status === 403) {
                toast.error("Access denied. Only admins can view audit logs.");
                router.push("/dashboard");
                return;
            }

            if (res.status === 401) {
                router.push("/login");
                return;
            }

            if (!res.ok) {
                throw new Error("Failed to fetch audit logs");
            }

            const data: FetchResult = await res.json();
            setLogs(data.logs);
            setPagination(data.pagination);
            setCurrentPage(page);
        } catch (err: any) {
            toast.error(err.message || "Failed to load audit logs");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs(1);
        setCurrentPage(1);
    }, [search, actionFilter, fromDate, toDate]);

    const handleResetFilters = () => {
        setSearch("");
        setActionFilter("");
        setFromDate("");
        setToDate("");
        setCurrentPage(1);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        });
    };

    const formatGradeValue = (value: any) => {
        if (value === null) return "N/A";
        if (typeof value === "number") {
            return Number(value).toFixed(2);
        }
        // Try to parse as number
        const num = Number(value);
        if (!isNaN(num)) {
            return num.toFixed(2);
        }
        return String(value);
    };

    const getActionBadge = (action: "CREATE" | "UPDATE") => {
        if (action === "CREATE") {
            return <Badge className="bg-green-600">Create</Badge>;
        }
        return <Badge className="bg-blue-600">Update</Badge>;
    };

    const filtered = logs.filter((log) => {
        const matchesSearch =
            !search ||
            log.userEmail.toLowerCase().includes(search.toLowerCase()) ||
            log.studentName.toLowerCase().includes(search.toLowerCase()) ||
            log.studentNo.toLowerCase().includes(search.toLowerCase());

        const matchesAction = !actionFilter || log.action === actionFilter;

        const logDate = new Date(log.createdAt);
        const fromDateObj = fromDate ? new Date(fromDate) : null;
        const toDateObj = toDate ? new Date(toDate + "T23:59:59") : null;

        const matchesDateRange = (!fromDateObj || logDate >= fromDateObj) && (!toDateObj || logDate <= toDateObj);

        return matchesSearch && matchesAction && matchesDateRange;
    });

    const pageSize = 10;
    const totalFilteredPages = Math.ceil(filtered.length / pageSize);
    const paginatedLogs = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Audit Logs</h2>
                <p className="text-muted-foreground">View all grade sheet updates and entries</p>
            </div>

            {/* Filters */}
            <Card>
                <CardContent>
                    <div className="space-y-4">
                        {/* Search Bar */}
                        <div>
                            <label className="text-sm font-medium text-muted-foreground mb-2 block">
                                Search by Student or User
                            </label>
                            <Input
                                placeholder="Search..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full"
                            />
                        </div>

                        {/* Filters Row */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            {/* Date Range - From */}
                            <div>
                                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                                    From Date
                                </label>
                                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                            </div>

                            {/* Date Range - To */}
                            <div>
                                <label className="text-sm font-medium text-muted-foreground mb-2 block">To Date</label>
                                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                            </div>

                            {/* Action Filter */}
                            <div>
                                <label className="text-sm font-medium text-muted-foreground mb-2 block">Action</label>
                                <Select
                                    value={actionFilter}
                                    onValueChange={(value) => setActionFilter(value === "all" ? "" : value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Actions" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Actions</SelectItem>
                                        <SelectItem value="CREATE">Create</SelectItem>
                                        <SelectItem value="UPDATE">Update</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Reset Button */}
                            <div className="flex items-end">
                                <Button variant="outline" onClick={handleResetFilters} className="w-full gap-2">
                                    <FilterX className="h-4 w-4" />
                                    Reset Filters
                                </Button>
                            </div>
                        </div>

                        {/* Active Filters Display */}
                        {(search || actionFilter || fromDate || toDate) && (
                            <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                                Active filters:
                                {search && ` Search: "${search}"`}
                                {actionFilter && ` Action: ${actionFilter}`}
                                {fromDate && ` From: ${fromDate}`}
                                {toDate && ` To: ${toDate}`}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Action</TableHead>
                                    <TableHead>Timestamp</TableHead>
                                    <TableHead>Admin/Encoder</TableHead>
                                    <TableHead>Student</TableHead>
                                    <TableHead>Subject</TableHead>
                                    <TableHead>Changes</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-10">
                                            <Loader2 className="animate-spin mx-auto h-8 w-8 text-muted-foreground" />
                                        </TableCell>
                                    </TableRow>
                                ) : filtered.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                            No audit logs found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedLogs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell>{getActionBadge(log.action)}</TableCell>
                                            <TableCell className="text-xs whitespace-nowrap">
                                                {formatDate(log.createdAt)}
                                            </TableCell>
                                            <TableCell className="text-sm">{log.userEmail}</TableCell>
                                            <TableCell>
                                                <div className="text-sm">
                                                    <div className="font-medium">{log.studentName}</div>
                                                    <div className="text-xs text-muted-foreground">{log.studentNo}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                <div>
                                                    <div className="font-medium">{log.subjectCode}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {log.subjectTitle}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs max-w-sm">
                                                <div className="space-y-1">
                                                    {Object.entries(log.changes).map(
                                                        ([field, { old: oldVal, new: newVal }]) => (
                                                            <div
                                                                key={field}
                                                                className="font-mono bg-muted p-1 rounded text-[11px]"
                                                            >
                                                                <span className="font-semibold">{field}:</span>
                                                                {log.action === "UPDATE" ? (
                                                                    <>
                                                                        {oldVal !== null && (
                                                                            <span className="text-red-600">
                                                                                {" "}
                                                                                {formatGradeValue(oldVal)}
                                                                            </span>
                                                                        )}
                                                                        {oldVal === null && (
                                                                            <span className="text-red-600"> N/A</span>
                                                                        )}
                                                                        <span className="text-muted-foreground">
                                                                            {" "}
                                                                            →
                                                                        </span>
                                                                        <span className="text-green-600">
                                                                            {" "}
                                                                            {formatGradeValue(newVal)}
                                                                        </span>
                                                                    </>
                                                                ) : (
                                                                    <span className="text-green-600">
                                                                        {" "}
                                                                        {formatGradeValue(newVal)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    <div className="flex justify-end gap-2 mt-4">
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={currentPage === 1 || loading}
                            onClick={() => setCurrentPage(currentPage - 1)}
                        >
                            Previous
                        </Button>
                        <div className="flex items-center px-3 text-sm">
                            Page {currentPage} of {totalFilteredPages || 1}
                        </div>
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={currentPage === totalFilteredPages || totalFilteredPages === 0 || loading}
                            onClick={() => setCurrentPage(currentPage + 1)}
                        >
                            Next
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
