"use client";
import { useState, useMemo, useEffect } from "react";
import {
  useFirestore,
  useCollection,
  WithId,
  useMemoFirebase,
  useUser,
  useDoc,
  errorEmitter,
} from "@/firebase";
import { collection, query, where, doc, writeBatch, getDocs, limit } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import toast from "react-hot-toast";
import { FirestorePermissionError } from "@/firebase/errors";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getServiceColor, cn } from "@/lib/utils";

// --- TYPE DEFINITIONS ---
interface AdminProfile {
  churchId?: string;
}
interface Volunteer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  availableRoleIds?: string[];
  availableRecurringEventSeriesIds?: string[];
  photoURL?: string;
  familyId?: string | null;
  isHouseholdManager?: boolean;
  role?: "admin" | "volunteer" | null;
}
interface RoleTemplate {
  id: string;
  name: string;
}
interface RecurringService {
  seriesId: string;
  eventName: string;
}


// --- BULK EDITING STATE ---
type BulkChanges = {
  [volunteerId: string]: {
    availableRoleIds?: string[];
    availableRecurringEventSeriesIds?: string[];
    email?: string;
    familyId?: string | null;
    isHouseholdManager?: boolean;
  };
};

export default function BulkManageVolunteersPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const [changes, setChanges] = useState<BulkChanges>({});
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVolunteerIds, setSelectedVolunteerIds] = useState<Set<string>>(new Set());
  const [bulkServicePreferenceId, setBulkServicePreferenceId] = useState("");


  // --- DATA FETCHING ---
  const adminDocRef = useMemoFirebase(
    () => (user?.uid && firestore ? doc(firestore, "users", user.uid) : null),
    [user?.uid, firestore],
  );
  const { data: adminProfile, isLoading: isAdminProfileLoading } =
    useDoc<AdminProfile>(adminDocRef);

  const allUsersQuery = useMemoFirebase(() => {
    if (!firestore || !adminProfile?.churchId) return null;
    return query(collection(firestore, "users"), where("churchId", "==", adminProfile.churchId));
  }, [firestore, adminProfile?.churchId]);
  const { data: allUsers, isLoading: areUsersLoading } = useCollection<Volunteer>(allUsersQuery);

  const volunteers = useMemo(() => {
    if (!allUsers) return [];
    const filtered = allUsers.filter(
      (u) =>
        u.role === "admin" || u.role === "volunteer" || u.role === null || u.role === undefined,
    );
    if (!searchTerm) return filtered;
    return filtered.filter(
      (v) =>
        (v.firstName && v.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (v.lastName && v.lastName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (v.email && v.email.toLowerCase().includes(searchTerm.toLowerCase())),
    );
  }, [allUsers, searchTerm]);

  const rolesQuery = useMemoFirebase(() => {
    if (!firestore || !adminProfile?.churchId) return null;
    return query(collection(firestore, `churches/${adminProfile.churchId}/role_templates`));
  }, [firestore, adminProfile?.churchId]);
  const { data: roles, isLoading: areRolesLoading } = useCollection<RoleTemplate>(rolesQuery);
  
  const [recurringServices, setRecurringServices] = useState<RecurringService[]>([]);
  const [areServicesLoading, setAreServicesLoading] = useState(true);

  useEffect(() => {
    if (!firestore || !adminProfile?.churchId) return;

    const fetchRecurringServices = async () => {
      setAreServicesLoading(true);
      const q = query(
        collection(firestore, `churches/${adminProfile.churchId}/events`),
        where("seriesId", "!=", null),
        limit(250)
      );
      const snapshot = await getDocs(q);
      const seriesMap = new Map<string, string>();
      snapshot.forEach(doc => {
        const data = doc.data() as { seriesId: string; eventName: string };
        if (!seriesMap.has(data.seriesId)) {
          seriesMap.set(data.seriesId, data.eventName);
        }
      });
      const uniqueServices = Array.from(seriesMap, ([seriesId, eventName]) => ({ seriesId, eventName }));
      setRecurringServices(uniqueServices.sort((a,b) => a.eventName.localeCompare(b.eventName)));
      setAreServicesLoading(false);
    };

    fetchRecurringServices();
  }, [firestore, adminProfile?.churchId]);

  const households = useMemo(() => {
    return allUsers?.filter((v) => v.isHouseholdManager) || [];
  }, [allUsers]);

  // --- CHANGE HANDLERS ---
  const stageChange = (volunteerId: string, update: Partial<Volunteer>) => {
    setChanges(
      (prev) =>
        ({
          ...prev,
          [volunteerId]: { ...prev[volunteerId], ...update },
        }) as BulkChanges,
    );
  };

  const handleRoleToggle = (volunteerId: string, roleId: string, isChecked: boolean) => {
    const currentRoles =
      changes[volunteerId]?.availableRoleIds ??
      volunteers?.find((v) => v.id === volunteerId)?.availableRoleIds ??
      [];
    const newRoles = isChecked
      ? Array.from(new Set([...currentRoles, roleId]))
      : currentRoles.filter((id) => id !== roleId);
    stageChange(volunteerId, { availableRoleIds: newRoles });
  };

  const handleEmailChange = (volunteerId: string, email: string) => {
    stageChange(volunteerId, { email });
  };

  const handleFamilyChange = (volunteerId: string, familyId: string) => {
    if (familyId === "none") {
      stageChange(volunteerId, { familyId: null, isHouseholdManager: false });
    } else {
      stageChange(volunteerId, { familyId, isHouseholdManager: false });
    }
  };

  const handleSelectAssignedForBulk = () => {
    if (!bulkServicePreferenceId) return;

    const matchingVolunteerIds = volunteers
      .filter((v) => {
        const stagedPrefs = changes[v.id]?.availableRecurringEventSeriesIds;
        const currentPrefs = v.availableRecurringEventSeriesIds;
        const prefs = stagedPrefs !== undefined ? stagedPrefs : currentPrefs;
        return prefs?.includes(bulkServicePreferenceId);
      })
      .map((v) => v.id);

    // Replace selection so the user clearly sees who is currently assigned that preference
    setSelectedVolunteerIds(new Set(matchingVolunteerIds));
  };
  
  const handleBulkServicePreferenceChange = (action: "add" | "remove") => {
    if (!bulkServicePreferenceId || selectedVolunteerIds.size === 0) {
      toast.error("Please select a service and at least one volunteer.");
      return;
    }
    const newChanges = { ...changes };
    for (const volunteerId of selectedVolunteerIds) {
      const volunteer = volunteers.find(v => v.id === volunteerId);
      if (!volunteer) continue;
      
      const currentPrefs = newChanges[volunteerId]?.availableRecurringEventSeriesIds ?? volunteer.availableRecurringEventSeriesIds ?? [];
      let newPrefs;
      if (action === 'add') {
        newPrefs = Array.from(new Set([...currentPrefs, bulkServicePreferenceId]));
      } else {
        newPrefs = currentPrefs.filter(id => id !== bulkServicePreferenceId);
      }
      
      if (!newChanges[volunteerId]) newChanges[volunteerId] = {};
      newChanges[volunteerId].availableRecurringEventSeriesIds = newPrefs;
    }
    setChanges(newChanges);
    toast.success(`Staged ${action === 'add' ? 'addition' : 'removal'} of service preference for ${selectedVolunteerIds.size} volunteer(s).`);
  };


  const handleSaveChanges = async () => {
    if (!firestore || Object.keys(changes).length === 0) {
      toast.error("No changes to save.");
      return;
    }
    setIsSaving(true);
    const batch = writeBatch(firestore);
    for (const volunteerId in changes) {
      const userRef = doc(firestore, "users", volunteerId);
      const userChanges = changes[volunteerId];
      const cleanChanges = Object.fromEntries(
        Object.entries(userChanges).filter(([_, v]) => v !== undefined),
      );
      if (Object.keys(cleanChanges).length > 0) {
        batch.update(userRef, cleanChanges);
      }
    }

    try {
      await batch.commit();
      toast.success("All changes saved successfully!");
      setChanges({});
      setSelectedVolunteerIds(new Set());
    } catch (e) {
      console.error(e);
      toast.error("Failed to save some changes. Check permissions.");
      const permissionError = new FirestorePermissionError({
        path: "users collection (batch)",
        operation: "update",
      });
      errorEmitter.emit("permission-error", permissionError);
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleSelectAllVolunteers = (checked: boolean) => {
    if (checked) {
      setSelectedVolunteerIds(new Set(volunteers.map(v => v.id)));
    } else {
      setSelectedVolunteerIds(new Set());
    }
  };

  const getInitials = (firstName: string = "", lastName: string = "") => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  const isLoading = isAdminProfileLoading || areUsersLoading || areRolesLoading || areServicesLoading;

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold">Bulk Manage Volunteers</h1>
        <p className="text-muted-foreground">
          Quickly edit roles, contact info, and family groups for multiple volunteers.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>All Volunteers</CardTitle>
          <CardDescription>
            Edit roles, emails, and family groups in one place. Your changes will be saved in a
            batch.
          </CardDescription>
          <div className="flex justify-between items-center pt-4 flex-wrap gap-4">
            <Input
              placeholder="Search volunteers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Button
              onClick={handleSaveChanges}
              disabled={isSaving || Object.keys(changes).length === 0}
            >
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save{" "}
              {Object.keys(changes).length > 0
                ? `${Object.keys(changes).length} Change(s)`
                : "Changes"}
            </Button>
          </div>
          <div className="border-t pt-4 mt-4">
            <h3 className="font-medium text-sm text-muted-foreground mb-2">Bulk Actions for Selected ({selectedVolunteerIds.size})</h3>
            <div className="flex items-center gap-2">
              <Select value={bulkServicePreferenceId} onValueChange={setBulkServicePreferenceId}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Select a recurring service..." />
                </SelectTrigger>
                <SelectContent>
                  {recurringServices.map(s => <SelectItem key={s.seriesId} value={s.seriesId}>{s.eventName}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" variant="secondary" onClick={handleSelectAssignedForBulk} disabled={!bulkServicePreferenceId}>Select Assigned</Button>
              <Button size="sm" variant="outline" onClick={() => handleBulkServicePreferenceChange('add')} disabled={!bulkServicePreferenceId || selectedVolunteerIds.size === 0}>Add Preference</Button>
              <Button size="sm" variant="destructive" onClick={() => handleBulkServicePreferenceChange('remove')} disabled={!bulkServicePreferenceId || selectedVolunteerIds.size === 0}>Remove Preference</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center p-8">Loading data...</div>
          ) : (
            <div className="border rounded-lg overflow-auto max-h-[70vh]">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-[60px] text-center">
                        <Checkbox onCheckedChange={handleSelectAllVolunteers} checked={selectedVolunteerIds.size === volunteers.length && volunteers.length > 0} />
                    </TableHead>
                    <TableHead className="w-[250px] min-w-[250px]">Volunteer</TableHead>
                    <TableHead className="w-[250px] min-w-[250px]">Email</TableHead>
                    <TableHead className="w-[250px] min-w-[250px]">Family Group</TableHead>
                    {roles?.map((role) => (
                      <TableHead key={role.id} className="text-center w-[100px]">
                        {role.name}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {volunteers?.map((v) => {
                    const volunteerChanges = changes[v.id] || {};
                    const currentRoles =
                      volunteerChanges.availableRoleIds ?? v.availableRoleIds ?? [];
                    return (
                      <TableRow key={v.id}>
                         <TableCell className="text-center">
                          <Checkbox
                            checked={selectedVolunteerIds.has(v.id)}
                            onCheckedChange={checked => {
                              setSelectedVolunteerIds(prev => {
                                const newSet = new Set(prev);
                                if (checked) newSet.add(v.id);
                                else newSet.delete(v.id);
                                return newSet;
                              });
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-medium sticky left-0 bg-background">
                          <div className="flex items-start gap-3">
                            <Avatar className="h-8 w-8 mt-1">
                              <AvatarImage src={v.photoURL} />
                              <AvatarFallback>
                                {getInitials(v.firstName, v.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col gap-1">
                              <span>
                                {v.firstName} {v.lastName}
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {(volunteerChanges.availableRecurringEventSeriesIds ?? v.availableRecurringEventSeriesIds)?.map((seriesId) => {
                                  const service = recurringServices?.find((s) => s.seriesId === seriesId);
                                  if (!service) return null;
                                  return (
                                    <Badge 
                                      key={seriesId} 
                                      variant="secondary" 
                                      className={cn(getServiceColor(seriesId), "border-none font-normal text-[0.65rem] px-1.5 py-0 h-4")}
                                    >
                                      {service.eventName}
                                    </Badge>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="email"
                            placeholder="No email"
                            value={volunteerChanges.email ?? v.email ?? ""}
                            onChange={(e) => handleEmailChange(v.id, e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={volunteerChanges.familyId ?? v.familyId ?? "none"}
                            onValueChange={(familyId) => handleFamilyChange(v.id, familyId)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a family..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No Family</SelectItem>
                              {households?.map((h) => (
                                <SelectItem key={h.id} value={h.familyId!}>
                                  {h.lastName} Family
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        {roles?.map((role) => (
                          <TableCell key={role.id} className="text-center">
                            <Checkbox
                              checked={currentRoles.includes(role.id)}
                              onCheckedChange={(checked) =>
                                handleRoleToggle(v.id, role.id, !!checked)
                              }
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    