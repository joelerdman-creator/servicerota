
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useFirestore, WithId, useAuth, useUser } from "@/firebase";
import { useDebounce } from "@/hooks/use-debounce";
import {
  collection,
  query,
  doc,
  getDocs,
  limit,
  startAfter,
  orderBy,
  where,
  DocumentSnapshot,
  endBefore,
  limitToLast,
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Shield, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import { signInWithCustomToken } from "firebase/auth";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  churchId?: string;
  isAdmin?: boolean;
  photoURL?: string;
}

interface UserWithClaims extends WithId<User> {
  isSuperUser?: boolean;
}

const PAGE_SIZE = 15;

export default function SuperUserUsersPage() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { user: superUser } = useUser();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [users, setUsers] = useState<UserWithClaims[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [firstDoc, setFirstDoc] = useState<DocumentSnapshot | null>(null);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);

  const fetchUsers = useCallback(async (direction: 'next' | 'prev' | 'search' = 'search') => {
    if (!firestore) return;
    setIsLoading(true);

    try {
      const usersCollection = collection(firestore, "users");
      let q;

      const baseConstraints = [
        where("email", ">=", debouncedSearchTerm),
        where("email", "<=", debouncedSearchTerm + "\uf8ff")
      ];

      if (direction === 'next' && lastDoc) {
        q = query(usersCollection, ...baseConstraints, orderBy("email"), startAfter(lastDoc), limit(PAGE_SIZE));
      } else if (direction === 'prev' && firstDoc) {
        q = query(usersCollection, ...baseConstraints, orderBy("email", "desc"), startAfter(firstDoc), limit(PAGE_SIZE));
      } else { // 'search' or initial load
        q = query(usersCollection, ...baseConstraints, orderBy("email"), limit(PAGE_SIZE));
      }

      const querySnapshot = await getDocs(q);
      const fetchedUsers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserWithClaims));

      if (direction === 'prev') {
        fetchedUsers.reverse(); // Reverse to maintain correct order
      }
      
      setUsers(fetchedUsers);
      
      if (querySnapshot.docs.length > 0) {
        setFirstDoc(querySnapshot.docs[0]);
        setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1]);
      } else {
        setFirstDoc(null);
        setLastDoc(null);
      }

    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Could not fetch users. Check console for details.");
    } finally {
      setIsLoading(false);
    }
  }, [firestore, lastDoc, firstDoc, debouncedSearchTerm]);


  useEffect(() => {
    setPage(1);
    setFirstDoc(null);
    setLastDoc(null);
    fetchUsers('search');
  }, [debouncedSearchTerm, firestore]);

  const handleNextPage = () => {
    if (lastDoc) {
      setPage(p => p + 1);
      fetchUsers('next');
    }
  };

  const handlePrevPage = () => {
    if (firstDoc && page > 1) {
      setPage(p => p - 1);
      fetchUsers('prev');
    }
  };


  const getInitials = (firstName: string = "", lastName: string = "") => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  const handleImpersonate = async (targetUser: WithId<User>) => {
    if (!auth || !superUser) {
      toast.error("Super user authentication not found.");
      return;
    }
    const impersonationToast = toast.loading(`Impersonating ${targetUser.firstName}...`);
    try {
      const originalUserToken = await superUser.getIdToken();
      sessionStorage.setItem("original_user_session", JSON.stringify({ idToken: originalUserToken }));
      const response = await fetch(`/api/auth/impersonate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUid: targetUser.id }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get impersonation token.");
      }
      const { customToken } = await response.json();
      await signInWithCustomToken(auth, customToken);
      sessionStorage.setItem("impersonation_active", `${targetUser.firstName} ${targetUser.lastName}`);
      const newIdToken = await auth.currentUser?.getIdToken();
      await fetch(`/api/auth/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: newIdToken }),
      });
      toast.success(`Now impersonating ${targetUser.firstName}. Redirecting...`, {
        id: impersonationToast,
      });
      window.location.href = "/dashboard";
    } catch (error: any) {
      console.error("Impersonation failed:", error);
      toast.error(`Impersonation failed: ${error.message}`, { id: impersonationToast });
      sessionStorage.removeItem("original_user_session");
    }
  };

  const handleClaimChange = async (targetUid: string, hasClaim: boolean) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === targetUid ? { ...u, isSuperUser: hasClaim } : u)),
    );
    try {
      const response = await fetch(`/api/auth/set-claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUid, claim: "superUser", value: hasClaim }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to set claim.");
      }
      toast.success(`Super User status ${hasClaim ? "granted" : "revoked"}.`);
    } catch (error: any) {
      toast.error(`Failed to update claim: ${error.message}`);
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUid ? { ...u, isSuperUser: !hasClaim } : u)),
      );
    }
  };

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Global User List</h1>
        <p className="text-muted-foreground">Manage and impersonate any user on the platform.</p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            {isLoading ? "Loading users..." : `Showing page ${page}.`}
          </CardDescription>
          <form onSubmit={(e) => e.preventDefault()} className="flex gap-2 pt-2">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </form>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mx-auto"/></div>
            ) : users.length > 0 ? (
              users.map((user) => {
                const hasSuperUserClaim = user.isSuperUser;
                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 border-b last:border-b-0"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <Avatar>
                        <AvatarImage src={user.photoURL} alt={`${user.firstName} ${user.lastName}`} />
                        <AvatarFallback>{getInitials(user.firstName, user.lastName)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold flex items-center gap-2">
                          {user.firstName} {user.lastName}
                          {user.isAdmin && <Badge>Admin</Badge>}
                          {hasSuperUserClaim && (
                            <Badge variant="destructive"><Shield className="h-3 w-3 mr-1" />Super User</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{user.email || "No email provided"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {superUser?.uid !== user.id && (
                        <>
                          <div className="flex items-center space-x-2">
                            <Label htmlFor={`su-${user.id}`} className="text-xs">Super</Label>
                            <Switch
                              id={`su-${user.id}`}
                              checked={!!hasSuperUserClaim}
                              onCheckedChange={(checked) => handleClaimChange(user.id, checked)}
                            />
                          </div>
                          <Button variant="outline" size="sm" onClick={() => handleImpersonate(user)}>
                            Impersonate
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center text-muted-foreground">No users found.</div>
            )}
          </div>
          <div className="flex justify-between mt-4">
            <Button onClick={handlePrevPage} disabled={page === 1 || isLoading}>
              <ChevronLeft className="h-4 w-4 mr-2"/>
              Previous
            </Button>
            <Button onClick={handleNextPage} disabled={users.length < PAGE_SIZE || isLoading}>
              Next
              <ChevronRight className="h-4 w-4 ml-2"/>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
