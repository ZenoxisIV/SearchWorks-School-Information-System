"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, GraduationCap, ShieldCheck, Mail, Lock } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.SubmitEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, password }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                toast.error(errorData.message || "Login failed");
                setLoading(false);
                return;
            }

            const data = await res.json();

            // Token is automatically stored in httpOnly cookie by server
            // No need to store in localStorage
            localStorage.setItem("user", JSON.stringify(data.user));

            toast.success("Welcome to SearchWorks SIS");
            router.push("/students");
        } catch (err) {
            console.error(err);
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-slate-100 via-white to-slate-200 px-4 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
            <Card className="w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-800">
                {/* HEADER */}
                <CardHeader className="space-y-5 text-center">
                    <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center justify-center rounded-2xl bg-primary/10 p-3">
                            <GraduationCap className="h-8 w-8 text-primary" />
                        </div>

                        <CardTitle className="text-xl font-semibold tracking-tight">SearchWorks</CardTitle>

                        <p className="text-sm text-muted-foreground">School Information System</p>
                    </div>

                    <CardDescription className="text-sm">Sign in to access your academic dashboard</CardDescription>
                </CardHeader>

                {/* FORM */}
                <form onSubmit={handleLogin}>
                    <CardContent className="grid gap-6 px-6">
                        {/* EMAIL */}
                        <div className="grid gap-2">
                            <Label htmlFor="email">Institutional Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="faculty@searchworks.edu"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="pl-10 h-11"
                                />
                            </div>
                        </div>

                        {/* PASSWORD */}
                        <div className="grid gap-2">
                            <Label htmlFor="password">Password</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="pl-10 pr-10 h-11"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                                    onClick={() => setShowPassword((prev) => !prev)}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>

                        {/* NOTICE */}
                        <div className="mt-1 flex items-start gap-2 rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground leading-relaxed">
                            <ShieldCheck className="h-4 w-4 mt-0.5" />
                            <p>
                                This system is restricted to authorized students, faculty, and administrators. All
                                activities are logged and monitored.
                            </p>
                        </div>
                    </CardContent>

                    {/* FOOTER */}
                    <CardFooter className="flex flex-col gap-3 px-6 pb-6">
                        <Button type="submit" className="w-full mt-4" disabled={loading}>
                            {loading ? "Authenticating..." : "Sign In"}
                        </Button>

                        <p className="text-xs text-muted-foreground text-center mt-2">
                            © {new Date().getFullYear()} SearchWorks SIS • All rights reserved
                        </p>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
