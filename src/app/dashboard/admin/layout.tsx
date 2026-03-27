"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LogOut,
  Feather,
  ShieldAlert,
  Menu,
  Repeat,
  ChevronDown,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useDoc, useFirestore, useUser, useAuth } from "@/firebase";
import { useMemoFirebase } from "@/firebase/hooks/use-memo-firebase";
import { signOut } from "firebase/auth";
import toast from "react-hot-toast";
import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { doc } from "firebase/firestore";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MODULES } from "@/config/modules";

interface UserProfile {
  isAdmin?: boolean;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const [isSuperUser, setIsSuperUser] = useState(false);

  // Determine active module. Default to RotaScribe ("rota")
  // Since Rota is at `/dashboard/admin`, we check specific sub-modules first.
  const activeModule = 
    MODULES.find(m => m.id !== "rota" && pathname.startsWith(m.basePath)) || 
    MODULES.find(m => m.id === "rota")!;

  useEffect(() => {
    const checkSuperUser = async () => {
      if (user) {
        try {
          const tokenResult = await user.getIdTokenResult();
          setIsSuperUser(Boolean(tokenResult.claims.superUser));
        } catch (error) {
          console.error("Error fetching user token for super user check:", error);
          setIsSuperUser(false);
        }
      }
    };
    void checkSuperUser();
  }, [user]);

  const userDocRef = useMemoFirebase(
    () => (user?.uid && firestore ? doc(firestore, "users", user.uid) : null),
    [user?.uid, firestore],
  );
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

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
  
  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length > 1) {
        return `${parts[0]?.[0] || ""}${parts[parts.length - 1]?.[0] || ""}`.toUpperCase();
    }
    return `${parts[0]?.[0] || ""}`.toUpperCase();
  };

  const renderModuleSwitcherItems = () => (
    <>
      <div className="px-2 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Switch Module
      </div>
      {MODULES.map((module) => (
        <DropdownMenuItem 
          key={module.id} 
          disabled={!module.isActive}
          asChild={module.isActive}
          className={cn("cursor-pointer flex items-center gap-3 p-3 my-0.5", module.isActive ? "" : "opacity-60")}
        >
          {module.isActive ? (
            <Link href={module.basePath}>
              <div className={cn("p-2 rounded-md", module.id === activeModule.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                <module.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 flex flex-col">
                <span className="font-semibold text-sm">{module.name}</span>
                <span className="text-xs text-muted-foreground">{module.description}</span>
              </div>
              {module.id === activeModule.id && <Check className="h-4 w-4 text-primary ml-auto" />}
            </Link>
          ) : (
            <div className="flex items-center gap-3 w-full">
              <div className="p-2 rounded-md bg-muted text-muted-foreground">
                <module.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 flex flex-col">
                <span className="font-semibold text-sm flex items-center gap-2">
                  {module.name}
                  <span className="text-[9px] font-bold uppercase bg-muted-foreground/20 text-muted-foreground px-1.5 py-0.5 rounded-sm">Soon</span>
                </span>
                <span className="text-xs text-muted-foreground">{module.description}</span>
              </div>
            </div>
          )}
        </DropdownMenuItem>
      ))}
    </>
  );

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top Header / "Blue Bar" */}
      <header className="bg-primary text-primary-foreground shadow-md sticky top-0 z-30">
        <div className="container mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <Link href="/dashboard/admin" className="flex items-center gap-2 font-bold text-xl hover:opacity-80 transition-opacity whitespace-nowrap">
                <Feather className="h-6 w-6 text-brand-accent shrink-0" />
                <span className="hidden sm:inline">Parish Scribe</span>
              </Link>

              <span className="hidden sm:inline text-primary-foreground/40 font-light mx-1 text-xl">/</span>

              {/* Desktop Module Switcher Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="hidden sm:flex items-center gap-2 text-primary-foreground hover:bg-white/10 hover:text-white px-2 py-1 h-auto font-medium text-base">
                    <activeModule.icon className="h-[18px] w-[18px] text-brand-accent" />
                    <span>{activeModule.name}</span>
                    <ChevronDown className="h-4 w-4 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[280px]">
                  {renderModuleSwitcherItems()}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {activeModule.navItems.map((item) => {
                const isActive = (pathname.startsWith(item.href) && item.href !== activeModule.basePath) || (pathname === item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-white/10",
                      isActive ? "bg-white/20 text-white" : "text-primary-foreground/80"
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
                <Button variant="ghost" size="icon" className="lg:hidden text-primary-foreground">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] flex flex-col pt-12">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <Feather className="h-6 w-6 text-brand-accent" />
                  <span className="font-bold text-xl">Parish Scribe</span>
                </div>

                <div className="mt-4 mb-6 relative z-10">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Current Module</p>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-between h-auto py-3 px-4 bg-background">
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/10 text-primary p-1.5 rounded-md">
                            <activeModule.icon className="h-5 w-5" />
                          </div>
                          <span className="font-semibold text-foreground">{activeModule.name}</span>
                        </div>
                        <ChevronDown className="h-4 w-4 opacity-50 text-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[252px]">
                      {renderModuleSwitcherItems()}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <nav className="flex flex-col gap-2 flex-1 overflow-y-auto">
                  {activeModule.navItems.length > 0 ? (
                    activeModule.navItems.map((item) => {
                      const isActive = (pathname.startsWith(item.href) && item.href !== activeModule.basePath) || (pathname === item.href);
                      return (
                        <SheetClose asChild key={item.href}>
                          <Link
                            href={item.href}
                            className={cn(
                              "flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all",
                              isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                          >
                            <item.icon className="h-5 w-5" />
                            {item.label}
                          </Link>
                        </SheetClose>
                      );
                    })
                  ) : (
                     <div className="p-4 text-center text-sm text-muted-foreground">
                        Module navigation unavailable.
                     </div>
                  )}
                </nav>
              </SheetContent>
            </Sheet>

            {/* Dark Mode Toggle */}
            <ThemeToggle />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full relative ring-offset-primary">
                  <Avatar className="h-8 w-8 border border-white/20">
                    <AvatarImage src={user?.photoURL || ""} alt={user?.displayName || ""} />
                    <AvatarFallback className="bg-primary-foreground text-primary">{getInitials(user?.displayName)}</AvatarFallback>
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
                <DropdownMenuSeparator />
                {isSuperUser && (
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/superuser" className="text-red-600 focus:text-red-600">
                      <ShieldAlert className="mr-2 h-4 w-4" />
                      Super User
                    </Link>
                  </DropdownMenuItem>
                )}
                {userProfile?.isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/volunteer">
                      <Repeat className="mr-2 h-4 w-4" />
                      Switch to Volunteer
                    </Link>
                  </DropdownMenuItem>
                )}
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
