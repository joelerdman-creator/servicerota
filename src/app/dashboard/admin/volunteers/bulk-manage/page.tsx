"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  useUser,
  useDoc,
  errorEmitter,
} from "@/firebase";
import { collection, query, where, doc, writeBatch, getDocs, limit } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import toast from "react-hot-toast";
import { FirestorePermissionError } from "@/firebase/errors";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Loader2, AlertCircle } from "lucide-react";

import { useVolunteers } from "../hooks/useVolunteers";
import { AdminProfile, RecurringService } from "../types";
import { BulkManageRow, StagedChanges } from "./BulkManageRow";

export default function BulkManageVolunteersPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const [changes, setChanges] = useState<Record<string, StagedChanges>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVolunteerIds, setSelectedVolunteerIds] = useState<Set<string>>(new Set());

  // Table filters
  const [filterService, setFilterService] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterIncomplete, setFilterIncomplete] = useState(false);

  // Bulk Actions Selection
  const [bulkServicePreferenceId, setBulkServicePreferenceId] = useState("");
  const [bulkRoleId, setBulkRoleId] = useState("");


  // --- DATA FETCHING ---
  const adminDocRef = useMemoFirebase(
    () => (user?.uid && firestore ? doc(firestore, "users", user.uid) : null),
    [user?.uid, firestore],
  );
  const { data: adminProfile, isLoading: isAdminProfileLoading } = useDoc<AdminProfile>(adminDocRef);

  // We utilize the same bulk data fetcher, but process the results specifically for bulk layout
  const { allVolunteers, isLoading: areUsersLoading, refresh } = useVolunteers(adminProfile?.churchId);

  const volunteers = useMemo(() => {
    if (!allVolunteers) return [];
    let result = allVolunteers.filter((u) => u.role === "admin" || u.role === "volunteer" || u.role === null || u.role === undefined);

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((v) =>
        `${v.firstName || ""} ${v.lastName || ""}`.toLowerCase().includes(term) ||
        (v.email || "").toLowerCase().includes(term)
      );
    }

    if (filterService) {
      result = result.filter((v) => {
        const prefs = changes[v.id]?.availableRecurringEventSeriesIds ?? v.availableRecurringEventSeriesIds ?? [];
        return prefs.includes(filterService);
      });
    }

    if (filterRole) {
      result = result.filter((v) => {
        const roles = changes[v.id]?.availableRoleIds ?? v.availableRoleIds ?? [];
        return roles.includes(filterRole);
      });
    }

    if (filterIncomplete) {
      result = result.filter((v) => {
        const prefs = changes[v.id]?.availableRecurringEventSeriesIds ?? v.availableRecurringEventSeriesIds ?? [];
        const roles = changes[v.id]?.availableRoleIds ?? v.availableRoleIds ?? [];
        return prefs.length === 0 && roles.length === 0;
      });
    }

    return result;
  }, [allVolunteers, searchTerm, filterService, filterRole, filterIncomplete, changes]);

  const rolesQuery = useMemoFirebase(() => {
    if (!firestore || !adminProfile?.churchId) return null;
    return query(collection(firestore, `churches/${adminProfile.churchId}/role_templates`));
  }, [firestore, adminProfile?.churchId]);
  const { data: roles, isLoading: areRolesLoading } = useCollection<{ id: string; name: string }>(rolesQuery);
  
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
      try {
        const snapshot = await getDocs(q);
        const seriesMap = new Map<string, string>();
        snapshot.forEach(docSnap => {
          const data = docSnap.data() as { seriesId: string; eventName: string };
          if (data.seriesId && !seriesMap.has(data.seriesId)) {
            seriesMap.set(data.seriesId, data.eventName);
          }
        });
        const uniqueServices = Array.from(seriesMap, ([seriesId, eventName]) => ({ seriesId, eventName }));
        setRecurringServices(uniqueServices.sort((a,b) => a.eventName.localeCompare(b.eventName)));
      } catch (e) {
        console.error(e);
      }
      setAreServicesLoading(false);
    };

    fetchRecurringServices();
  }, [firestore, adminProfile?.churchId]);

  const households = useMemo(() => {
    return allVolunteers?.filter((v) => v.isHouseholdManager).map(h => ({
       id: h.id, 
       familyId: h.familyId || null, 
       lastName: h.lastName 
    })) || [];
  }, [allVolunteers]);

  // --- MEMOIZED CHANGE HANDLERS (To prevent Row re-renders) ---
  const handleSelectToggle = useCallback((id: string, isChecked: boolean) => {
    setSelectedVolunteerIds(prev => {
      const newSet = new Set(prev);
      if (isChecked) newSet.add(id);
      else newSet.delete(id);
      return newSet;
    });
  }, []);

  const handleRoleToggle = useCallback((volunteerId: string, roleId: string, isChecked: boolean) => {
    setChanges(prev => {
      const volunteer = allVolunteers.find(v => v.id === volunteerId);
      const currentRoles = prev[volunteerId]?.availableRoleIds ?? volunteer?.availableRoleIds ?? [];
      const newRoles = isChecked
        ? Array.from(new Set([...currentRoles, roleId]))
        : currentRoles.filter(id => id !== roleId);
        
      return {
        ...prev,
        [volunteerId]: { ...prev[volunteerId], availableRoleIds: newRoles }
      };
    });
  }, [allVolunteers]);

  const handleFamilyChange = useCallback((volunteerId: string, familyId: string) => {
    setChanges(prev => {
      const isNone = familyId === "none";
      return {
        ...prev,
        [volunteerId]: { 
            ...prev[volunteerId], 
            familyId: isNone ? null : familyId,
            isHouseholdManager: false
        }
      };
    });
  }, []);


  // --- BULK ACTION HANDLERS ---
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

  const handleBulkRoleChange = (action: "add" | "remove") => {
    if (!bulkRoleId || selectedVolunteerIds.size === 0) {
      toast.error("Please select a role and at least one volunteer.");
      return;
    }
    const newChanges = { ...changes };
    for (const volunteerId of selectedVolunteerIds) {
      const volunteer = volunteers.find(v => v.id === volunteerId);
      if (!volunteer) continue;

      const currentRoles = newChanges[volunteerId]?.availableRoleIds ?? volunteer.availableRoleIds ?? [];
      let newRoles;
      if (action === 'add') {
        newRoles = Array.from(new Set([...currentRoles, bulkRoleId]));
      } else {
        newRoles = currentRoles.filter(r => r !== bulkRoleId);
      }

      if (!newChanges[volunteerId]) newChanges[volunteerId] = {};
      newChanges[volunteerId].availableRoleIds = newRoles;
    }
    setChanges(newChanges);
    toast.success(`Staged ${action === 'add' ? 'addition' : 'removal'} of role for ${selectedVolunteerIds.size} volunteer(s).`);
  };


  const handleDiscardChanges = () => {
    setChanges({});
    setSelectedVolunteerIds(new Set());
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
      refresh();
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
          <div className="flex flex-col gap-4 pt-4">
            {/* Search + Save/Discard row */}
            <div className="flex justify-between items-center flex-wrap gap-4">
              <Input
                placeholder="Search volunteers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleDiscardChanges}
                  disabled={Object.keys(changes).length === 0}
                >
                  Discard Changes
                </Button>
                <Button
                  onClick={handleSaveChanges}
                  disabled={isSaving || Object.keys(changes).length === 0}
                >
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save{" "}
                  {Object.keys(changes).length > 0
                    ? `${Object.keys(changes).length} volunteer(s)`
                    : "Changes"}
                </Button>
              </div>
            </div>

            {/* Filter row */}
            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={filterService || "all"}
                onValueChange={(v) => setFilterService(v === "all" ? "" : v)}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Filter by service..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  {recurringServices.map((s) => (
                    <SelectItem key={s.seriesId} value={s.seriesId}>{s.eventName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filterRole || "all"}
                onValueChange={(v) => setFilterRole(v === "all" ? "" : v)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by role..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {roles?.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/30">
                <Checkbox
                  id="filter-incomplete"
                  checked={filterIncomplete}
                  onCheckedChange={(v) => setFilterIncomplete(!!v)}
                />
                <Label htmlFor="filter-incomplete" className="text-sm cursor-pointer flex items-center gap-1.5 whitespace-nowrap">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                  No roles or services
                </Label>
              </div>
              {(filterService || filterRole || filterIncomplete) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => { setFilterService(""); setFilterRole(""); setFilterIncomplete(false); }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          </div>
          
          {/* BULK ACTIONS BANNER */}
          <div className="border-t pt-4 mt-4 space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground">Bulk Actions for Selected ({selectedVolunteerIds.size})</h3>
            
            <div className="flex flex-col lg:flex-row gap-4">
               {/* Bulk Services */}
              <div className="flex flex-wrap items-center gap-2 bg-muted/30 p-2 rounded-md border w-full max-w-[650px]">
                <Select value={bulkServicePreferenceId} onValueChange={setBulkServicePreferenceId}>
                  <SelectTrigger className="w-[250px] bg-background">
                    <SelectValue placeholder="Select a recurring service..." />
                  </SelectTrigger>
                  <SelectContent>
                    {recurringServices.map(s => <SelectItem key={s.seriesId} value={s.seriesId}>{s.eventName}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="secondary" onClick={handleSelectAssignedForBulk} disabled={!bulkServicePreferenceId}>Select Current</Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkServicePreferenceChange('add')} disabled={!bulkServicePreferenceId || selectedVolunteerIds.size === 0}>Add</Button>
                <Button size="sm" variant="destructive" onClick={() => handleBulkServicePreferenceChange('remove')} disabled={!bulkServicePreferenceId || selectedVolunteerIds.size === 0}>Remove</Button>
              </div>

               {/* Bulk Roles */}
              <div className="flex flex-wrap items-center gap-2 bg-muted/30 p-2 rounded-md border w-full max-w-[550px]">
                <Select value={bulkRoleId} onValueChange={setBulkRoleId}>
                  <SelectTrigger className="w-[250px] bg-background">
                    <SelectValue placeholder="Select a role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {roles?.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={() => handleBulkRoleChange('add')} disabled={!bulkRoleId || selectedVolunteerIds.size === 0}>Add</Button>
                <Button size="sm" variant="destructive" onClick={() => handleBulkRoleChange('remove')} disabled={!bulkRoleId || selectedVolunteerIds.size === 0}>Remove</Button>
              </div>
            </div>

          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center p-8 text-muted-foreground flex flex-col items-center">
               <Loader2 className="h-6 w-6 animate-spin mb-4" />
               Loading data...
            </div>
          ) : (
            <div className="border rounded-lg overflow-auto max-h-[70vh]">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-20 border-b">
                  <TableRow>
                    <TableHead className="w-[60px] text-center border-r">
                        <Checkbox 
                           onCheckedChange={handleSelectAllVolunteers} 
                           checked={selectedVolunteerIds.size === volunteers.length && volunteers.length > 0} 
                        />
                    </TableHead>
                    <TableHead className="w-[200px] min-w-[200px] sticky left-0 bg-background z-20 border-r shadow-[1px_0_0_0_hsl(var(--border))]">Volunteer</TableHead>
                    <TableHead className="w-[220px] min-w-[220px]">Family Group</TableHead>
                    {roles?.map((role) => (
                      <TableHead key={role.id} className="text-center min-w-[120px] px-1">
                        <span className="truncate w-full inline-block" title={role.name}>{role.name}</span>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {volunteers?.length === 0 && (
                     <TableRow>
                        <TableCell colSpan={3 + (roles?.length || 0)} className="h-24 text-center">
                           No volunteers found.
                        </TableCell>
                     </TableRow>
                  )}
                  {volunteers?.map((v) => (
                    <BulkManageRow
                      key={v.id}
                      volunteer={v}
                      changes={changes[v.id]}
                      roles={roles ?? undefined}
                      recurringServices={recurringServices}
                      households={households}
                      isSelected={selectedVolunteerIds.has(v.id)}
                      onSelectToggle={handleSelectToggle}
                      onRoleToggle={handleRoleToggle}
                      onFamilyChange={handleFamilyChange}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}