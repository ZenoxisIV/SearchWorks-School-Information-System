"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";

export function Topbar() {
    const router = useRouter();
    const [email, setEmail] = React.useState<string | null>(null);

    React.useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const res = await fetch("/api/auth/me", { credentials: "include" });
                if (!mounted) return;
                if (res.ok) {
                    const data = await res.json();
                    setEmail(data.user?.email ?? null);
                } else {
                    setEmail(null);
                }
            } catch (e) {
                setEmail(null);
            }
        })();

        return () => {
            mounted = false;
        };
    }, []);

    const handleLogout = async () => {
        try {
            const res = await fetch("/api/auth/logout", {
                method: "POST",
            });

            if (res.ok) {
                localStorage.removeItem("token");

                toast.success("Logged out successfully");

                router.push("/login");
            } else {
                throw new Error("Logout failed");
            }
        } catch (error) {
            toast.error("Failed to log out. Please try again.");
        }
    };

    return (
        <header className="flex h-14 items-center justify-end border-b px-4 bg-background">
            <div className="flex items-center gap-2">
                <ThemeToggle />

                <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-9 w-9 rounded-full hover:bg-muted">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src="/avatar.png" alt={email ?? "User"} />
                                <AvatarFallback className="bg-primary text-primary-foreground font-medium text-xs">
                                    {email ? email.charAt(0).toUpperCase() : "U"}
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col">
                                <p className="text-xs leading-none text-muted-foreground">{email ?? ""}</p>
                            </div>
                        </DropdownMenuLabel>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                            className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                            onSelect={handleLogout}
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
