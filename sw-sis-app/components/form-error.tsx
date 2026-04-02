"use client";

import { AlertCircle } from "lucide-react";

interface FormErrorProps {
    message?: string;
}

export function FormError({ message }: FormErrorProps) {
    if (!message) return null;

    return (
        <div className="flex items-start gap-3 rounded-md border border-destructive bg-destructive/5 p-3">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-destructive" />
            <p className="text-sm text-destructive">{message}</p>
        </div>
    );
}

interface FieldErrorProps {
    message?: string;
}

export function FieldError({ message }: FieldErrorProps) {
    if (!message) return null;

    return (
        <p className="text-xs font-medium text-destructive mt-1.5 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {message}
        </p>
    );
}
