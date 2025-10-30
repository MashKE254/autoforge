"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogIn, LogOut, User as UserIcon, LayoutDashboard } from "lucide-react";
import Link from "next/link";

export function UserAuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    // Show a loading skeleton
    return <div className="h-9 w-20 animate-pulse rounded-md bg-muted" />;
  }

  if (status === "unauthenticated" || !session) {
    // Show Sign In button
    return (
      <Button variant="outline" onClick={() => signIn()}>
        <LogIn className="mr-2 h-4 w-4" />
        Sign In
      </Button>
    );
  }

  // User is authenticated, show avatar and dropdown
  const user = session.user;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage
              src={user?.image ?? ""}
              alt={user?.name ?? "User"}
            />
            <AvatarFallback>
              {user?.name
                ? user.name.charAt(0).toUpperCase()
                : <UserIcon className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user?.name ?? "User"}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email ?? "No email"}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

