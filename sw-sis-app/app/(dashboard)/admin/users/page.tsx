"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { FieldError } from "@/components/form-error";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Check, X, Trash2 } from "lucide-react";
import { userSchema } from "@/lib/validations";

export default function UsersPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [open, setOpen] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        role: "encoder",
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);

    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<null | { type: "single" | "bulk"; id?: string }>(null);

    const router = useRouter();

    // --- Fetch Users ---
    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/users", { credentials: "include" });
            if (res.status === 401) {
                router.push("/login");
                return;
            }
            if (res.status === 403) {
                toast.error("You do not have permission to access this page");
                router.push("/students");
                return;
            }
            const data = await res.json();
            if (Array.isArray(data)) setUsers(data);
        } catch {
            toast.error("Could not connect to the server");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // --- Inline Editing ---
    const startEdit = (user: any) => {
        setEditingId(user.id);
        setEditData({ ...user });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditData(null);
    };

    const saveEdit = async (userId: string) => {
        setIsSaving(true);
        try {
            const res = await fetch(`/api/users/${userId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: editData.role }),
                credentials: "include",
            });
            if (res.ok) {
                toast.success("User updated successfully");
                setEditingId(null);
                fetchUsers();
            } else {
                const err = await res.json();
                toast.error(err.message || "Update failed");
            }
        } catch {
            toast.error("Error saving changes");
        } finally {
            setIsSaving(false);
        }
    };

    // --- Add User ---
    const handleAddUser = async (e: React.SubmitEvent) => {
        e.preventDefault();
        setErrors({});

        // Validate with Zod schema
        const result = userSchema.safeParse(formData);
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
            const res = await fetch("/api/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
                credentials: "include",
            });
            if (res.ok) {
                toast.success("User added successfully");
                setOpen(false);
                setFormData({ email: "", password: "", role: "encoder" });
                setErrors({});
                fetchUsers();
            } else {
                const err = await res.json();
                toast.error(err.message || "Failed to add user");
            }
        } catch {
            toast.error("An error occurred");
        } finally {
            setIsAdding(false);
        }
    };

    // --- Delete User ---
    const handleDelete = async (userId: string) => {
        setDeleteTarget({ type: "single", id: userId });
        setDeleteModalOpen(true);
    };

    const handleDeleteConfirmed = async () => {
        if (!deleteTarget) return;

        try {
            if (deleteTarget.type === "single" && deleteTarget.id) {
                const res = await fetch(`/api/users/${deleteTarget.id}`, {
                    method: "DELETE",
                    credentials: "include",
                });
                if (res.ok) {
                    toast.success("User deleted");
                } else {
                    const err = await res.json();
                    toast.error(err.message || "Failed to delete user");
                }
            } else if (deleteTarget.type === "bulk") {
                const res = await fetch("/api/users", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userIds: selectedUsers }),
                    credentials: "include",
                });
                if (res.ok) {
                    toast.success("Selected users deleted");
                    setSelectedUsers([]);
                } else {
                    const err = await res.json();
                    toast.error(err.message || "Failed to delete users");
                }
            }
        } catch {
            toast.error("An error occurred");
        } finally {
            fetchUsers();
            setDeleteModalOpen(false);
            setDeleteTarget(null);
        }
    };

    // --- Bulk Delete / Selection ---
    const toggleSelect = (userId: string) => {
        setSelectedUsers((prev) =>
            prev.includes(userId) ? prev.filter((s) => s !== userId) : [...prev, userId],
        );
    };

    const filteredUsers = users.filter((user) => {
        const values = [user.email, user.role];
        return values.some((v) => v?.toString().toLowerCase().includes(search.toLowerCase()));
    });

    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const paginated = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="space-y-6 p-6">
            {/* Header + Add */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Users</h2>
                    <p className="text-muted-foreground">Manage admin and encoder accounts.</p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Input
                        placeholder="Search..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-64"
                    />
                    <Button
                        variant="destructive"
                        onClick={() => {
                            setDeleteTarget({ type: "bulk" });
                            setDeleteModalOpen(true);
                        }}
                        disabled={!selectedUsers.length}
                    >
                        Delete Selected ({selectedUsers.length})
                    </Button>
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="h-4 w-4" /> Add User
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New User</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleAddUser} className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                    />
                                    <FieldError message={errors.email} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required
                                    />
                                    <FieldError message={errors.password} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="role">Role</Label>
                                    <Select
                                        value={formData.role}
                                        onValueChange={(value) => setFormData({ ...formData, role: value })}
                                    >
                                        <SelectTrigger id="role">
                                            <SelectValue placeholder="Select a role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="admin">Admin</SelectItem>
                                            <SelectItem value="encoder">Encoder</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FieldError message={errors.role} />
                                </div>
                                <DialogFooter>
                                    <Button type="submit" disabled={isAdding} className="w-full">
                                        {isAdding ? "Saving..." : "Save User"}
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
                                <TableHead className="w-12">
                                    <Checkbox
                                        checked={selectedUsers.length === users.length && users.length > 0}
                                        onCheckedChange={() => {
                                            if (selectedUsers.length === users.length) setSelectedUsers([]);
                                            else setSelectedUsers(users.map((u) => u.id));
                                        }}
                                    />
                                </TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Created</TableHead>
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
                            ) : paginated.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                        No users found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginated.map((user) => {
                                    const isEditing = editingId === user.id;
                                    return (
                                        <TableRow key={user.id}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedUsers.includes(user.id)}
                                                    onCheckedChange={() => toggleSelect(user.id)}
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium">{user.email}</TableCell>
                                            <TableCell>
                                                {isEditing ? (
                                                    <Select
                                                        value={editData.role}
                                                        onValueChange={(value) =>
                                                            setEditData({ ...editData, role: value })
                                                        }
                                                    >
                                                        <SelectTrigger className="w-32">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="admin">Admin</SelectItem>
                                                            <SelectItem value="encoder">Encoder</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                ) : (
                                                    <span className="inline-block px-2 py-1 rounded-md text-sm font-medium bg-muted">
                                                        {user.role === "admin" ? "🔑 Admin" : "✏️ Encoder"}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {new Date(user.createdAt).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right flex justify-end gap-2">
                                                {isEditing ? (
                                                    <>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => saveEdit(user.id)}
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
                                                            onClick={() => startEdit(user)}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="destructive"
                                                            onClick={() => handleDelete(user.id)}
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
                        <span className="flex items-center px-2">
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

            {/* Delete Confirmation Modal */}
            <DeleteConfirmDialog
                open={deleteModalOpen}
                onOpenChange={setDeleteModalOpen}
                title="Delete User"
                description={
                    deleteTarget?.type === "bulk"
                        ? `Are you sure you want to delete all ${selectedUsers.length} selected users?`
                        : "Are you sure you want to delete this user? This action cannot be undone."
                }
                onConfirm={handleDeleteConfirmed}
            />
        </div>
    );
}
