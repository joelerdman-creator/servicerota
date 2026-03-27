

"use client";

import { useState, useMemo, useEffect } from "react";
import { useUser, useFirestore, useCollection, useDoc, WithId } from "@/firebase";
import { useMemoFirebase } from "@/firebase/hooks/use-memo-firebase";
import { errorEmitter } from "@/firebase/error-emitter";
import { collection, doc, query, where, updateDoc, getDocs } from "firebase/firestore";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { format, isFuture, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import toast from "react-hot-toast";
import { FirestorePermissionError } from "@/firebase/errors";
import { Check, Handshake, Loader2 } from "lucide-react";
import { sendNotification } from "@/ai/flows/send-notification-flow";

// --- TYPE DEFINITIONS ---

interface UserProfile {
  churchId?: string;
  familyId?: string;
  availableRoleIds?: string[];
  firstName?: string;
  lastName?: string;
  email?: string | null;
}

interface Event {
  id: string;
  eventName: string;
  eventDate: string; // ISO String
  isPublished?: boolean;
  isSignupEnabled?: boolean;
  signupScope?: "all_roles" | "unassigned_only";
  signupRequiresQualification?: boolean;
}

interface Role {
  id: string;
  eventId: string;
  roleName: string;
  assignedVolunteerId: string | null;
  assignedVolunteerName: string | null;
  status: "Pending" | "Confirmed" | "Declined" | "Pending Substitution";
}

interface FullAssignment {
  event: WithId<Event>;
  role: WithId<Role>;
  assignedVolunteerName: string; // Add this to show who in the family is assigned
}

// --- MAIN COMPONENT ---

export default function SchedulePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [assignments, setAssignments] = useState<FullAssignment[]>([]);
  const [signupEvents, setSignupEvents] = useState<WithId<Event>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEventForSignup, setSelectedEventForSignup] = useState<WithId<Event> | null>(null);

  // --- DATA FETCHING ---
  const userDocRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore!, "users", user.uid) : null),
    [user, firestore],
  );
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  useEffect(() => {
    if (!userProfile?.churchId || !firestore || !user) {
      if (!isUserLoading) setIsLoading(false);
      return;
    }

    const fetchAllData = async () => {
      setIsLoading(true);
      const churchId = userProfile.churchId;

      try {
        const eventsQuery = query(
          collection(firestore, `churches/${churchId}/events`),
          where("isPublished", "==", true),
          where("eventDate", ">=", new Date().toISOString()),
        );
        const eventsSnapshot = await getDocs(eventsQuery);
        const allEvents = eventsSnapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as WithId<Event>,
        );

        const myAssignments: FullAssignment[] = [];
        const openForSignup: WithId<Event>[] = [];
        const assignedEventIds = new Set<string>();

        const uidsToQuery = [user.uid];
        if (userProfile.familyId) {
          const familyQuery = query(
            collection(firestore, "users"),
            where("familyId", "==", userProfile.familyId),
          );
          const familySnapshot = await getDocs(familyQuery);
          familySnapshot.forEach((doc) => uidsToQuery.push(doc.id));
        }
        const uniqueUids = [...new Set(uidsToQuery)];

        for (const event of allEvents) {
          const rolesCollection = collection(firestore, `churches/${churchId}/events/${event.id}/roles`);
          const userRolesQuery = query(rolesCollection, where("assignedVolunteerId", "in", uniqueUids));
          const rolesSnapshot = await getDocs(userRolesQuery);

          if (!rolesSnapshot.empty) {
            rolesSnapshot.forEach((roleDoc) => {
              const roleData = { id: roleDoc.id, ...roleDoc.data() } as WithId<Role>;
              myAssignments.push({
                event,
                role: roleData,
                assignedVolunteerName: roleData.assignedVolunteerName || "Unknown",
              });
              assignedEventIds.add(event.id);
            });
          } else if (event.isSignupEnabled) {
            openForSignup.push(event);
          }
        }
        
        myAssignments.sort((a, b) => new Date(a.event.eventDate).getTime() - new Date(b.event.eventDate).getTime());
        openForSignup.sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());

        setAssignments(myAssignments);
        setSignupEvents(openForSignup);

      } catch (error) {
        console.error("Error fetching schedule data:", error);
        toast.error("Could not load your schedule data.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, [userProfile, firestore, user, isUserLoading]);


  const handleRequestSubstitution = async (assignment: FullAssignment) => {
    if (!firestore || !userProfile?.churchId || !userProfile.firstName) return;
    const loadingToast = toast.loading("Finding eligible substitutes and notifying them...");
  
    const roleRef = doc(
      firestore,
      `churches/${userProfile.churchId}/events/${assignment.event.id}/roles`,
      assignment.role.id,
    );
  
    // 1. Get all qualified volunteers
    const roleTemplatesQuery = query(
      collection(firestore, `churches/${userProfile.churchId}/role_templates`),
      where("name", "==", assignment.role.roleName)
    );
    const roleTemplateSnapshot = await getDocs(roleTemplatesQuery);
    if (roleTemplateSnapshot.empty) {
      toast.error("Could not find role template to determine qualifications.", { id: loadingToast });
      return;
    }
    const roleTemplateId = roleTemplateSnapshot.docs[0].id;
  
    const volunteersQuery = query(
      collection(firestore, "users"),
      where("churchId", "==", userProfile.churchId),
      where("availableRoleIds", "array-contains", roleTemplateId)
    );
    const volunteersSnapshot = await getDocs(volunteersQuery);
    const qualifiedVolunteers = volunteersSnapshot.docs
      .map(d => d.data() as UserProfile)
      .filter(v => v.email && v.email !== user?.email); // Exclude self
  
    // 2. Mark role as pending substitution
    try {
      await updateDoc(roleRef, { status: "Pending Substitution" });
      
      // 3. Send notifications
      const claimUrl = `${window.location.origin}/claim-substitution?churchId=${userProfile.churchId}&eventId=${assignment.event.id}&roleId=${assignment.role.id}`;

      for (const volunteer of qualifiedVolunteers) {
        if(volunteer.email && volunteer.firstName) {
            await sendNotification({
                type: "substitution_request",
                toEmail: volunteer.email,
                recipientName: volunteer.firstName,
                requestingVolunteerName: userProfile.firstName,
                eventName: assignment.event.eventName,
                eventDate: assignment.event.eventDate,
                roleName: assignment.role.roleName,
                churchName: "Your Church", // Replace with actual church name if available
                claimUrl: claimUrl
            });
        }
      }
      
      toast.success("Substitution request sent to qualified volunteers!", { id: loadingToast });
      // Force a refetch of data to update the UI
      // A more elegant solution would be to update local state, but this is simpler and effective
      window.location.reload(); 
    } catch (e: any) {
      toast.error(`Failed to send request: ${e.message}`, { id: loadingToast });
      errorEmitter.emit("permission-error", new FirestorePermissionError({ path: roleRef.path, operation: "update" }));
    }
  };

  return (
    <>
      <div className="flex flex-col items-center justify-start min-h-screen bg-background p-8">
        <div className="w-full max-w-4xl">
          <header className="mb-8">
            <h1 className="text-3xl font-bold">My Schedule</h1>
            <p className="text-muted-foreground mt-2">
              Here are your upcoming assignments. Thank you for serving!
            </p>
          </header>

          <div className="grid grid-cols-1 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Open for Sign-up</CardTitle>
                <CardDescription>Events where you can sign up for an open role.</CardDescription>
              </CardHeader>
              <CardContent>
                 {isLoading && <p>Loading events...</p>}
                 {!isLoading && signupEvents.length === 0 && (
                    <p className="text-muted-foreground text-center py-8">No events are currently open for sign-up.</p>
                 )}
                 {!isLoading && signupEvents.length > 0 && (
                    <div className="space-y-4">
                        {signupEvents.map(event => (
                            <div key={event.id} className="p-4 border rounded-lg flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                <div>
                                    <h3 className="font-bold text-lg">{event.eventName}</h3>
                                    <p className="text-muted-foreground">{format(parseISO(event.eventDate), "EEEE, MMMM do, yyyy 'at' h:mm a")}</p>
                                </div>
                                <Button onClick={() => setSelectedEventForSignup(event)}>
                                    <Handshake className="mr-2 h-4 w-4" /> Volunteer Now
                                </Button>
                            </div>
                        ))}
                    </div>
                 )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Your Household's Assignments</CardTitle>
                <CardDescription>A list of events where you or a family member are scheduled.</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading && <p>Loading your schedule...</p>}
                {!isLoading && assignments.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">
                    You have no upcoming assignments.
                  </p>
                )}
                {!isLoading && assignments.length > 0 && (
                  <div className="space-y-4">
                    {assignments
                      .filter((a) => isFuture(parseISO(a.event.eventDate)))
                      .map((assignment) => (
                        <div
                          key={assignment.role.id}
                          className="p-4 border rounded-lg flex flex-col sm:flex-row justify-between sm:items-center gap-4"
                        >
                          <div>
                            <h3 className="font-bold text-lg">{assignment.event.eventName}</h3>
                            <p className="text-muted-foreground">
                              {format(
                                parseISO(assignment.event.eventDate),
                                "EEEE, MMMM do, yyyy 'at' h:mm a",
                              )}
                            </p>
                            <p className="font-semibold text-primary mt-1">
                              {assignment.assignedVolunteerName} - {assignment.role.roleName}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={assignment.role.status === "Confirmed" ? "default" : "secondary"}
                            >
                              {assignment.role.status}
                            </Badge>
                             {assignment.role.assignedVolunteerId === user?.uid && (
                                <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={assignment.role.status === "Pending Substitution"}
                                    >
                                    {assignment.role.status === "Pending Substitution"
                                        ? "Request Sent"
                                        : "Request Sub"}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Request a Substitute?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will notify other available volunteers in this role that a spot
                                        is open. Your name will be removed from the schedule if someone else
                                        accepts. Are you sure?
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={() => handleRequestSubstitution(assignment)}
                                    >
                                        Yes, Request Sub
                                    </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                                </AlertDialog>
                             )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <footer className="mt-8 flex justify-center">
            <Button asChild variant="link">
              <Link href="/dashboard/volunteer">Back to Dashboard</Link>
            </Button>
          </footer>
        </div>
      </div>
       {selectedEventForSignup && (
        <SignupSheet
          event={selectedEventForSignup}
          userProfile={userProfile}
          user={user}
          open={!!selectedEventForSignup}
          onOpenChange={(isOpen) => !isOpen && setSelectedEventForSignup(null)}
        />
      )}
    </>
  );
}


// --- SUB-COMPONENTS ---

interface SignupSheetProps {
  event: WithId<Event>;
  userProfile: UserProfile | null;
  user: any; // Firebase User
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function SignupSheet({ event, userProfile, user, open, onOpenChange }: SignupSheetProps) {
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch role templates once to map names to IDs for qualification checks
  const roleTemplatesQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.churchId) return null;
    return query(collection(firestore, `churches/${userProfile.churchId}/role_templates`));
  }, [firestore, userProfile?.churchId]);
  const { data: roleTemplates } = useCollection<{ name: string }>(roleTemplatesQuery);
  
  const roleNameToIdMap = useMemo(() => {
    if (!roleTemplates) return new Map();
    return new Map(roleTemplates.map(rt => [rt.name, rt.id]));
  }, [roleTemplates]);

  // Fetch the roles for the specific event
  const rolesQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.churchId || !event.id) return null;
    let q = query(collection(firestore, `churches/${userProfile.churchId}/events/${event.id}/roles`));
    if (event.signupScope === "unassigned_only") {
      q = query(q, where("assignedVolunteerId", "==", null));
    }
    return q;
  }, [firestore, userProfile, event]);

  const { data: roles, isLoading } = useCollection<Role>(rolesQuery);

  const availableRoles = useMemo(() => {
    if (!roles) return [];
    return roles.filter(role => {
      if (role.assignedVolunteerId) {
        return false; // Filter out already assigned roles if scope is 'all_roles'
      }
      if (event.signupRequiresQualification) {
        const qualifiedRoleIds = userProfile?.availableRoleIds || [];
        const requiredRoleId = roleNameToIdMap.get(role.roleName);
        return requiredRoleId ? qualifiedRoleIds.includes(requiredRoleId) : false;
      }
      return true; // If no qualification needed, all unassigned roles are available
    });
  }, [roles, userProfile, event.signupRequiresQualification, roleNameToIdMap]);


  const handleSignUp = async (role: WithId<Role>) => {
    if (!firestore || !userProfile?.churchId || !user) return;

    setIsSubmitting(true);
    const roleRef = doc(firestore, `churches/${userProfile.churchId}/events/${event.id}/roles`, role.id);
    const updateData = {
        assignedVolunteerId: user.uid,
        assignedVolunteerName: user.displayName || `${userProfile.firstName} ${userProfile.lastName}`,
        status: "Confirmed",
    };
    try {
        await updateDoc(roleRef, updateData);
        toast.success(`You have successfully signed up for ${role.roleName}!`);
        onOpenChange(false);
    } catch (err) {
        console.error("Sign up error:", err);
        toast.error("Failed to sign up for this role. It may have been taken.");
        const permissionError = new FirestorePermissionError({
            path: roleRef.path,
            operation: "update",
            requestResourceData: updateData,
        });
        errorEmitter.emit("permission-error", permissionError);
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Sign up for: {event.eventName}</SheetTitle>
          <SheetDescription>
            {format(parseISO(event.eventDate), "EEEE, MMMM do, yyyy 'at' h:mm a")}
            <br/>
            Select an open role below to volunteer.
          </SheetDescription>
        </SheetHeader>
        <div className="py-6">
            {isLoading && <div className="text-center p-4"><Loader2 className="h-6 w-6 animate-spin mx-auto"/></div>}
            {!isLoading && availableRoles.length === 0 && (
                <p className="text-center text-muted-foreground py-8">Sorry, there are no available roles for you to sign up for at this event.</p>
            )}
            {!isLoading && availableRoles.length > 0 && (
                <div className="space-y-3">
                    {availableRoles.map(role => (
                        <div key={role.id} className="p-3 border rounded-lg flex justify-between items-center">
                            <span className="font-medium">{role.roleName}</span>
                            <Button size="sm" onClick={() => handleSignUp(role)} disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="mr-2 h-4 w-4" />}
                                Sign Up
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
        <SheetFooter>
            <SheetClose asChild>
                <Button variant="outline">Close</Button>
            </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
