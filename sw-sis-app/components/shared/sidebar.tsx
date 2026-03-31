"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Users,
    BookOpen,
    Library,
    CalendarCheck,
    ClipboardList,
    Settings,
    ChevronLeft,
    ChevronRight,
    LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type SidebarItem = {
    title: string;
    href: string;
    icon: LucideIcon;
    badge?: string;
};

type SidebarGroup = {
    title: string;
    items: SidebarItem[];
};

const sidebarGroups: SidebarGroup[] = [
    {
        title: "Main",
        items: [
            { title: "Students", href: "/students", icon: Users },
            { title: "Courses", href: "/courses", icon: BookOpen },
            { title: "Subjects", href: "/subjects", icon: Library },
            { title: "Reservations", href: "/reservations", icon: CalendarCheck },
            { title: "Grading Sheet", href: "/grading", icon: ClipboardList },
        ],
    },
];

interface SidebarProps {
    onMobileClose?: () => void;
}

export function Sidebar({ onMobileClose }: SidebarProps) {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);

    const handleLinkClick = () => {
        onMobileClose?.();
    };

    return (
        <aside
            className={cn(
                "flex h-full flex-col border-r bg-background transition-all duration-300",
                isCollapsed ? "w-16" : "w-64",
            )}
        >
            {/* Header */}
            <div className="flex h-14 items-center justify-between border-b px-3">
                <Link
                    href="/dashboard"
                    className={cn(
                        "flex items-center gap-2 font-semibold transition-all",
                        isCollapsed && "justify-center w-full",
                    )}
                >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                        <LayoutDashboard className="h-4 w-4 text-primary-foreground" />
                    </div>
                    {!isCollapsed && <span>Dashboard</span>}
                </Link>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsCollapsed((prev) => !prev)}
                    className="hidden md:flex"
                >
                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4">
                {sidebarGroups.map((group) => (
                    <div key={group.title} className="px-2 mb-6">
                        {!isCollapsed && (
                            <p className="px-3 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                {group.title}
                            </p>
                        )}

                        <div className="space-y-1">
                            {group.items.map((item) => {
                                const isActive = pathname.startsWith(item.href);
                                const Icon = item.icon;

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={handleLinkClick}
                                        className={cn(
                                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                                            "hover:bg-muted",
                                            isActive
                                                ? "bg-primary text-primary-foreground"
                                                : "text-muted-foreground hover:text-foreground",
                                            isCollapsed && "justify-center",
                                        )}
                                        title={isCollapsed ? item.title : undefined}
                                    >
                                        <Icon className="h-4 w-4 shrink-0" />

                                        {!isCollapsed && (
                                            <div className="flex w-full items-center justify-between">
                                                <span>{item.title}</span>
                                                {item.badge && (
                                                    <span className="ml-2 rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Footer */}
            <div className="border-t p-3">
                <Link
                    href="https://github.com/ZenoxisIV/SearchWorks-School-Information-System"
                    className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
                        isCollapsed && "justify-center",
                    )}
                >
                    <Settings className="h-4 w-4" />
                    {!isCollapsed && <span>Source Code</span>}
                </Link>
            </div>
        </aside>
    );
}
