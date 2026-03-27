"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Users,
  LifeBuoy,
  LogOut,
  ShieldAlert,
  Repeat,
  Home,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useUser, useAuth } from "@/firebase";
import { signOut } from "firebase/auth";
import toast from "react-hot-toast";
import { useState, useEffect } from "react";

const navItems = [
  { href: "/dashboard/superuser", icon: Home, label: "Dashboard" },
  { href: "/dashboard/superuser/users", icon: Users, label: "Global Users" },
  { href: "/dashboard/superuser/tickets", icon: LifeBuoy, label: "Support Tickets" },
];

export default function SuperUserLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      router.replace("/");
      return;
    }

    const checkSuperUser = async () => {
      try {
        const tokenResult = await user.getIdTokenResult();
        if (tokenResult.claims.superUser) {
          setIsAuthorized(true);
        } else {
          toast.error("You don't have permission to access this page.");
          router.replace("/dashboard");
        }
      } catch (error) {
        console.error("Error fetching user token:", error);
        toast.error("Could not verify user permissions.");
        router.replace("/dashboard");
      }
    };

    checkSuperUser();
  }, [user, isUserLoading, router]);

  const handleLogOut = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      await fetch("/api/auth/session", { method: "DELETE" });
      toast.success("Signed out successfully.");
      window.location.href = "/";
    } catch (e: any) {
      toast.error(e.message || "Failed to sign out.");
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length > 1) {
        return `${parts[0]?.[0] || ""}${parts[parts.length - 1]?.[0] || ""}`.toUpperCase();
    }
    return `${parts[0]?.[0] || ""}`.toUpperCase();
  };

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Verifying permissions...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Super User Header - Deep Red / Dark themed bar to distinguish */}
      <header className="bg-red-950 text-red-100 shadow-md sticky top-0 z-30 border-b border-red-500/30">
        <div className="container mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard/superuser" className="flex items-center gap-2 font-bold text-xl text-red-300">
              <ShieldAlert className="h-6 w-6" />
              <span className="hidden sm:inline">Super User</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-red-500/20",
                      isActive ? "bg-red-500/30 text-red-50" : "text-red-200/80"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {/* Mobile Navigation Toggle */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden text-red-100">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] bg-red-950 border-r-red-500/30 text-red-100">
                <SheetTitle className="flex items-center gap-2 mb-8 text-red-300">
                  <ShieldAlert className="h-6 w-6" />
                  <span>Parish Scribe SuperUser</span>
                </SheetTitle>
                <nav className="flex flex-col gap-2">
                  {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <SheetClose asChild key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all",
                            isActive ? "bg-red-500/30 text-red-50" : "text-red-200/80 hover:bg-red-500/20"
                          )}
                        >
                          <item.icon className="h-5 w-5" />
                          {item.label}
                        </Link>
                      </SheetClose>
                    );
                  })}
                  <div className="mt-4 pt-4 border-t border-red-500/30">
                    <SheetClose asChild>
                      <Link href="/dashboard/admin" className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium text-red-200/80 hover:bg-red-500/20">
                        <Repeat className="h-5 w-5" />
                        Return to Admin
                      </Link>
                    </SheetClose>
                  </div>
                </nav>
              </SheetContent>
            </Sheet>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full relative ring-offset-red-950">
                  <Avatar className="h-8 w-8 border border-red-500/30">
                    <AvatarImage src={user?.photoURL || ""} alt={user?.displayName || ""} />
                    <AvatarFallback className="bg-red-100 text-red-950">{getInitials(user?.displayName)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/admin">
                    <Repeat className="mr-2 h-4 w-4" />
                    Return to Admin
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleLogOut()} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
