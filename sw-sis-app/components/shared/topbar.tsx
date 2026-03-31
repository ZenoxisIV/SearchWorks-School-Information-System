"use client";

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
  return (
    <header className="flex h-14 items-center justify-end border-b px-4 bg-background">
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-9 w-9 rounded-full hover:bg-muted"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src="/avatar.png" alt="User" />
                <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                  JD
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">John Doe</p>
                <p className="text-xs text-muted-foreground">
                  john.doe@example.com
                </p>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            {/* <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem> */}

            {/* <DropdownMenuSeparator /> */}

            <DropdownMenuItem className="text-red-600">
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}