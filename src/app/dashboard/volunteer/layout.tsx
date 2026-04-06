"use client";

import Link from "next/link";
import { Feather, LogOut, Repeat, Moon, Sun } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useUser, useAuth, useFirestore, useDoc } from "@/firebase";
import { useMemoFirebase } from "@/firebase/hooks/use-memo-firebase";
import { doc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import toast from "react-hot-toast";
import { useState, useEffect } from "react";

interface UserProfile {
  isAdmin?: boolean;
}

export default function VolunteerLayout({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(stored === "dark" || (!stored && prefersDark));
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  const userDocRef = useMemoFirebase(
    () => (user?.uid && firestore ? doc(firestore, "users", user.uid) : null),
    [user?.uid, firestore],
  );
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length > 1) return `${parts[0]?.[0] || ""}${parts[parts.length - 1]?.[0] || ""}`.toUpperCase();
    return `${parts[0]?.[0] || ""}`.toUpperCase();
  };

  const handleLogOut = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      await fetch("/api/auth/session", { method: "DELETE" });
      toast.success("Signed out successfully.");
      window.location.href = "/";
    } catch (e: unknown) {
      toast.error((e as Error).message || "Failed to sign out.");
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-nav text-nav-foreground shadow-md sticky top-0 z-30">
        <div className="container mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <Link
            href="/dashboard/volunteer"
            className="flex items-center gap-2 font-bold text-xl hover:opacity-80 transition-opacity"
          >
            <Feather className="h-6 w-6 text-brand-accent shrink-0" />
            <span className="hidden sm:inline">Parish Scribe</span>
          </Link>

          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8 border border-white/20">
                    <AvatarImage src={user?.photoURL || ""} alt={user?.displayName || ""} />
                    <AvatarFallback className="bg-primary-foreground text-primary">
                      {getInitials(user?.displayName)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-sm font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.displayName}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/volunteer/profile">My Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleTheme}>
                  {isDark ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                  {isDark ? "Light Mode" : "Dark Mode"}
                </DropdownMenuItem>
                {userProfile?.isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/admin">
                        <Repeat className="mr-2 h-4 w-4" />
                        Switch to Admin
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogOut} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
