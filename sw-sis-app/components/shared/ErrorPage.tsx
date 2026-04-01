"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";

interface ErrorPageProps {
    title?: string;
    description?: string;
    errorCode?: string;
    actions?: ReactNode;
}

export default function ErrorPage({
    title = "Dashboard Error",
    description = "Something went wrong while loading the dashboard. Please try again or contact support if the problem persists.",
    errorCode = "Dashboard Error",
    actions,
}: ErrorPageProps) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
            <Card className="w-full max-w-md text-center bg-gray-800 text-gray-100">
                <CardHeader>
                    <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-red-700/20">
                        <AlertTriangle className="h-12 w-12 text-red-400" />
                    </div>
                    <CardTitle className="text-2xl text-white">{title}</CardTitle>
                    <CardDescription className="text-gray-300">{description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="text-sm text-gray-400">
                        <p>{errorCode}</p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                        {actions ?? (
                            <>
                                <Button
                                    onClick={() => window.location.reload()}
                                    className="bg-gray-700 text-white hover:bg-gray-600"
                                >
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Refresh Page
                                </Button>
                                <Button
                                    variant="outline"
                                    asChild
                                    className="border-gray-500 text-gray-100 hover:bg-gray-700 hover:border-gray-400"
                                >
                                    <Link href="/students">
                                        <Home className="mr-2 h-4 w-4" />
                                        Go Home
                                    </Link>
                                </Button>
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
