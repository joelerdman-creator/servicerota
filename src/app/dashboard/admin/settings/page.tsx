

"use client";

import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUser, useFirestore, useDoc, WithId, useCollection } from "@/firebase";
import { useMemoFirebase } from "@/firebase/hooks/use-memo-firebase";
import {
  doc,
  updateDoc,
  collection,
  query,
  addDoc,
  serverTimestamp,
  deleteDoc,
  writeBatch,
  getDocs,
  where,
  arrayRemove,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import toast from "react-hot-toast";
import {
  UploadCloud,
  Loader2,
  Wand2,
  Palette,
  ClipboardList,
  PlusCircle,
  Trash2,
  CheckSquare,
  Square,
  Edit,
  Plus,
  Minus,
} from "lucide-react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Image from "next/image";


const denominations = [
  "Non-denominational",
  "Baptist",
  "Southern Baptist",
  "Catholic",
  "Catholic (Ordinariate)",
  "Methodist",
  "United Methodist",
  "Lutheran",
  "Lutheran (LCMS)",
  "Lutheran (ELCA)",
  "Presbyterian",
  "Presbyterian (PCA)",
  "Presbyterian (PCUSA)",
  "Pentecostal",
  "Episcopal/Anglican",
  "Anglican (ACNA)",
  "Churches of Christ",
  "Mormon (LDS)",
  "Assemblies of God",
  "Orthodox (Eastern)",
  "Orthodox (Greek)",
  "Orthodox (Russian)",
  "Other",
];

const googleFonts = [
  { name: "Inter", value: "Inter" },
  { name: "Lato", value: "Lato" },
  { name: "Merriweather", value: "Merriweather" },
  { name: "Open Sans", value: "Open Sans" },
  { name: "Poppins", value: "Poppins" },
  { name: "Roboto", value: "Roboto" },
  { name: "Source Sans Pro", value: "Source Sans Pro" },
];

interface UserProfile {
  churchId?: string;
}

interface Church {
  name?: string;
  denomination?: string;
  address?: string;
  contactEmail?: string;
  logoUrl?: string;
  calendarUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
}
interface RoleTemplate {
  name: string;
  churchId: string;
  createdAt: any;
}

interface TemplateRole {
  name: string;
  quantity: number;
}

interface ServiceTemplate {
  name: string;
  roles: TemplateRole[];
  churchId: string;
  createdAt: any;
}

export default function SettingsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Profile Form State
  const [name, setName] = useState("");
  const [denomination, setDenomination] = useState("");
  const [address, setAddress] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [calendarUrl, setCalendarUrl] = useState("");

  // Brand Form State
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState("#166534");
  const [secondaryColor, setSecondaryColor] = useState("#64748b");
  const [accentColor, setAccentColor] = useState("#f59e0b");
  const [fontFamily, setFontFamily] = useState("Inter");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Roles & Templates State
  const [newRoleName, setNewRoleName] = useState("");
  const [newTemplateName, setNewTemplateName] = useState("");
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());
  const [editingTemplate, setEditingTemplate] = useState<WithId<ServiceTemplate> | null>(null);
  const [editTemplateName, setEditTemplateName] = useState("");
  const [editTemplateRoles, setEditTemplateRoles] = useState<TemplateRole[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // State for Role Deletion/Editing
  const [roleToDelete, setRoleToDelete] = useState<WithId<RoleTemplate> | null>(null);
  const [roleToEdit, setRoleToEdit] = useState<{ id: string; name: string } | null>(null);
  const [newRoleNameToEdit, setNewRoleNameToEdit] = useState("");

  // --- DATA FETCHING ---
  const userDocRef = useMemoFirebase(
    () => (user?.uid && firestore ? doc(firestore, "users", user.uid) : null),
    [user?.uid, firestore],
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  const churchDocRef = useMemoFirebase(
    () =>
      firestore && userProfile?.churchId ? doc(firestore, "churches", userProfile.churchId) : null,
    [firestore, userProfile?.churchId],
  );
  const { data: churchData, isLoading: isChurchLoading } = useDoc<Church>(churchDocRef);

  // Roles & Templates Data
  const rolesQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.churchId) return null;
    return query(collection(firestore, `churches/${userProfile.churchId}/role_templates`));
  }, [firestore, userProfile?.churchId]);
  const { data: roles, isLoading: rolesLoading } = useCollection<RoleTemplate>(rolesQuery);

  const templatesQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.churchId) return null;
    return query(collection(firestore, `churches/${userProfile.churchId}/service_templates`));
  }, [firestore, userProfile?.churchId]);
  const { data: templates, isLoading: templatesLoading } =
    useCollection<ServiceTemplate>(templatesQuery);

  useEffect(() => {
    if (churchData) {
      setName(churchData.name || "");
      setDenomination(churchData.denomination || "");
      setAddress(churchData.address || "");
      setContactEmail(churchData.contactEmail || "");
      setCalendarUrl(churchData.calendarUrl || "");
      setLogoPreview(churchData.logoUrl || null);
      setPrimaryColor(churchData.primaryColor || "#166534");
      setSecondaryColor(churchData.secondaryColor || "#64748b");
      setAccentColor(churchData.accentColor || "#f59e0b");
      setFontFamily(churchData.fontFamily || "Inter");
    }
  }, [churchData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("File is too large. Max size is 2MB.");
        return;
      }
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleUploadLogo = async () => {
    if (!logoFile || !userProfile?.churchId) {
      toast.error("Please select a file to upload.");
      return;
    }
    setIsUploading(true);
    const toastId = toast.loading("Uploading logo...");

    try {
      const storage = getStorage();
      const filePath = `logos/${userProfile.churchId}/${new Date().getTime()}_${logoFile.name}`;
      const storageRef = ref(storage, filePath);

      const snapshot = await uploadBytes(storageRef, logoFile);
      const downloadURL = await getDownloadURL(snapshot.ref);

      if (churchDocRef) {
        await updateDoc(churchDocRef, { logoUrl: downloadURL });
      }

      setLogoPreview(downloadURL);
      setLogoFile(null);
      toast.success("Logo uploaded successfully!", { id: toastId });
    } catch (error) {
      console.error("Logo upload error:", error);
      toast.error("Failed to upload logo. Check permissions and try again.", { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!firestore || !churchDocRef) return;
    setIsSaving(true);
    const toastId = toast.loading("Saving settings...");

    const updateData = {
      name,
      denomination,
      address,
      contactEmail,
      calendarUrl,
      primaryColor,
      secondaryColor,
      accentColor,
      fontFamily,
    };

    try {
      await updateDoc(churchDocRef, updateData);
      toast.success("Settings saved successfully!", { id: toastId });
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to save settings.", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  // --- Roles & Templates Handlers ---
  const handleAddRole = async () => {
    if (!newRoleName.trim() || !firestore || !user || !userProfile?.churchId) return;
    setIsProcessing(true);
    const roleData = {
      name: newRoleName.trim(),
      churchId: userProfile.churchId,
      createdAt: serverTimestamp(),
    };
    const rolesCollectionRef = collection(
      firestore,
      `churches/${userProfile.churchId}/role_templates`,
    );
    try {
      await addDoc(rolesCollectionRef, roleData);
      setNewRoleName("");
    } catch {
       toast.error("Failed to add role.");
    } finally {
        setIsProcessing(false);
    }
  };
  
  const confirmDeleteRole = async () => {
    if (!roleToDelete || !userProfile?.churchId || !firestore) return;
    setIsProcessing(true);
    const toastId = toast.loading(`Deleting role '${roleToDelete.name}'...`);
    const { id: roleId, name: roleName } = roleToDelete;

    try {
      const batch = writeBatch(firestore);

      // 1. Delete the role template itself
      const roleTemplateRef = doc(firestore, `churches/${userProfile.churchId}/role_templates`, roleId);
      batch.delete(roleTemplateRef);

      // 2. Remove from all users' availableRoleIds
      const usersQuery = query(collection(firestore, "users"), where("availableRoleIds", "array-contains", roleId));
      const usersSnap = await getDocs(usersQuery);
      usersSnap.forEach(userDoc => {
        batch.update(userDoc.ref, { availableRoleIds: arrayRemove(roleId) });
      });

      // 3. Remove from all service templates
      const serviceTemplatesQuery = collection(firestore, `churches/${userProfile.churchId}/service_templates`);
      const serviceTemplatesSnap = await getDocs(serviceTemplatesQuery);
      serviceTemplatesSnap.forEach(templateDoc => {
        const templateData = templateDoc.data();
        const roles = templateData.roles as { name: string; quantity: number }[] | undefined;
        if (roles && roles.some(r => r.name === roleName)) {
          const updatedRoles = roles.filter(r => r.name !== roleName);
          batch.update(templateDoc.ref, { roles: updatedRoles });
        }
      });
      
      // 4. Delete roles from all events (subcollections)
      const eventsQuery = collection(firestore, `churches/${userProfile.churchId}/events`);
      const eventsSnap = await getDocs(eventsQuery);

      // This part is inefficient client-side, we have to do N reads for N events
      for (const eventDoc of eventsSnap.docs) {
        const eventRolesQuery = query(collection(eventDoc.ref, 'roles'), where('roleName', '==', roleName));
        const eventRolesSnap = await getDocs(eventRolesQuery);
        eventRolesSnap.forEach(roleDoc => {
          batch.delete(roleDoc.ref);
        });
      }

      await batch.commit();
      toast.success(`Role '${roleName}' and all its associations deleted.`, { id: toastId });
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    } finally {
      setIsProcessing(false);
      setRoleToDelete(null);
    }
  };
  
  const confirmEditRole = async () => {
    if (!roleToEdit || !newRoleNameToEdit.trim() || !userProfile?.churchId || !firestore) {
      toast.error("New role name cannot be empty.");
      return;
    }
    setIsProcessing(true);
    const toastId = toast.loading(`Updating role '${roleToEdit.name}'...`);
    const { id: roleId, name: oldName } = roleToEdit;
    const newName = newRoleNameToEdit.trim();

    try {
      const batch = writeBatch(firestore);

      // 1. Update the role template itself
      const roleTemplateRef = doc(firestore, `churches/${userProfile.churchId}/role_templates`, roleId);
      batch.update(roleTemplateRef, { name: newName });

      // 2. Update service templates that use this role name
      const serviceTemplatesQuery = collection(firestore, `churches/${userProfile.churchId}/service_templates`);
      const serviceTemplatesSnap = await getDocs(serviceTemplatesQuery);
      
      serviceTemplatesSnap.forEach(templateDoc => {
        const templateData = templateDoc.data();
        const roles = templateData.roles as { name: string; quantity: number }[];
        if (roles && roles.some(r => r.name === oldName)) {
          const updatedRoles = roles.map(r => r.name === oldName ? { ...r, name: newName } : r);
          batch.update(templateDoc.ref, { roles: updatedRoles });
        }
      });

      // 3. Update roles in existing events
      const eventsQuery = collection(firestore, `churches/${userProfile.churchId}/events`);
      const eventsSnap = await getDocs(eventsQuery);

      for (const eventDoc of eventsSnap.docs) {
        const eventRolesQuery = query(collection(eventDoc.ref, 'roles'), where('roleName', '==', oldName));
        const eventRolesSnap = await getDocs(eventRolesQuery);
        eventRolesSnap.forEach(roleDoc => {
          batch.update(roleDoc.ref, { roleName: newName });
        });
      }

      await batch.commit();

      toast.success(`Role '${oldName}' updated to '${newName}' everywhere.`, { id: toastId });
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    } finally {
      setIsProcessing(false);
      setRoleToEdit(null);
      setNewRoleNameToEdit("");
    }
  };


  const toggleRoleSelection = (roleId: string) => {
    const newSet = new Set(selectedRoleIds);
    if (newSet.has(roleId)) newSet.delete(roleId);
    else newSet.add(roleId);
    setSelectedRoleIds(newSet);
  };

  const handleAddTemplate = async () => {
    if (!newTemplateName.trim() || !firestore || !userProfile?.churchId) return;
    setIsProcessing(true);
    const selectedRolesList = roles?.filter((r) => selectedRoleIds.has(r.id)) || [];
    const templateData = {
      name: newTemplateName.trim(),
      roles: selectedRolesList.map((r) => ({ name: r.name, quantity: 1 })), // Default quantity to 1
      churchId: userProfile.churchId,
      createdAt: serverTimestamp(),
    };
    const templatesCollectionRef = collection(
      firestore,
      `churches/${userProfile.churchId}/service_templates`,
    );
    try {
        await addDoc(templatesCollectionRef, templateData);
        setNewTemplateName("");
        setSelectedRoleIds(new Set());
    } catch {
        toast.error("Failed to create template.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDeleteTemplate = async (template: WithId<ServiceTemplate>) => {
    if (!firestore || !userProfile?.churchId) return;
    setIsProcessing(true);
    const docRef = doc(
      firestore,
      `churches/${userProfile.churchId}/service_templates`,
      template.id,
    );
    try {
        await deleteDoc(docRef);
    } catch {
        toast.error("Failed to delete template.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleOpenEditDialog = (template: WithId<ServiceTemplate>) => {
    setEditingTemplate(template);
    setEditTemplateName(template.name);
    setEditTemplateRoles(template.roles || []);
  };

  const handleSaveEditTemplate = async () => {
    if (!editingTemplate || !firestore || !userProfile?.churchId) return;
    setIsSavingEdit(true);
    const toastId = toast.loading("Saving template...");
    const updateData = { name: editTemplateName, roles: editTemplateRoles };
    const docRef = doc(
      firestore,
      `churches/${userProfile.churchId}/service_templates`,
      editingTemplate.id,
    );
    try {
      await updateDoc(docRef, updateData);
      toast.success("Template updated successfully!", { id: toastId });
      setEditingTemplate(null);
    } catch (e) {
      console.error("Failed to update template", e);
      toast.error("Failed to save changes.", { id: toastId });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleEditRoleQuantity = (roleName: string, change: number) => {
    setEditTemplateRoles((prevRoles) => {
      const existingRole = prevRoles.find((r) => r.name === roleName);
      if (existingRole) {
        const newQuantity = Math.max(0, existingRole.quantity + change);
        if (newQuantity === 0) {
          return prevRoles.filter((r) => r.name !== roleName);
        }
        return prevRoles.map((r) =>
          r.name === roleName ? { ...r, quantity: newQuantity } : r,
        );
      } else if (change > 0) {
        return [...prevRoles, { name: roleName, quantity: 1 }];
      }
      return prevRoles;
    });
  };

  const isLoading =
    isProfileLoading || isChurchLoading || rolesLoading || (templatesLoading && !templates);

  return (
    <div className="flex flex-col gap-8">
      <style>
        {`@import url('https://fonts.googleapis.com/css2?${googleFonts
          .map((f) => `family=${f.value.replace(/ /g, "+")}:wght@400;700`)
          .join("&")}&display=swap');`}
      </style>
      <header>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your church's profile and application settings.
        </p>
      </header>

      <div className="max-w-4xl space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Church Profile</CardTitle>
            <CardDescription>Update general information about your church.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <p>Loading settings...</p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="church-name">Church Name</Label>
                  <Input id="church-name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="denomination">Denomination</Label>
                  <Select value={denomination} onValueChange={setDenomination}>
                    <SelectTrigger id="denomination">
                      <SelectValue placeholder="Select a denomination..." />
                    </SelectTrigger>
                    <SelectContent>
                      {denominations.map((denom) => (
                        <SelectItem key={denom} value={denom}>
                          {denom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-email">Contact Email</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="calendar-url">Default Calendar URL (.ics)</Label>
                  <Input
                    id="calendar-url"
                    type="url"
                    value={calendarUrl}
                    onChange={(e) => setCalendarUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    This URL will be pre-filled when importing events.
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette /> Brand Center
            </CardTitle>
            <CardDescription>
              Manage your church's visual identity for flyers and widgets.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div className="space-y-4">
              <Label className="text-base">Church Logo</Label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/png, image/jpeg"
                className="hidden"
              />
              <div
                className="relative aspect-video w-full max-w-sm border-2 border-dashed border-muted-foreground/50 rounded-lg flex items-center justify-center cursor-pointer hover:bg-muted/50"
                onClick={() => fileInputRef.current?.click()}
              >
                {logoPreview ? (
                  <Image
                    src={logoPreview}
                    alt="Logo preview"
                    fill
                    style={{ objectFit: "contain" }}
                    className="p-4"
                  />
                ) : (
                  <div className="text-center text-muted-foreground p-4">
                    <UploadCloud className="mx-auto h-12 w-12" />
                    <p>Click to upload</p>
                    <p className="text-xs">PNG or JPG, max 2MB</p>
                  </div>
                )}
              </div>
              <Button
                onClick={handleUploadLogo}
                disabled={!logoFile || isUploading}
                className="mt-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Upload Logo"
                )}
              </Button>
            </div>

            <div className="space-y-6">
              <div>
                <Label className="text-base">Color Palette</Label>
                <div className="grid grid-cols-3 gap-4 mt-2">
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor">Primary</Label>
                    <Input
                      id="primaryColor"
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-full h-10 p-1 cursor-pointer"
                    />
                    <span className="font-mono text-sm text-muted-foreground">{primaryColor}</span>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondaryColor">Secondary</Label>
                    <Input
                      id="secondaryColor"
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-full h-10 p-1 cursor-pointer"
                    />
                    <span className="font-mono text-sm text-muted-foreground">
                      {secondaryColor}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accentColor">Accent</Label>
                    <Input
                      id="accentColor"
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-full h-10 p-1 cursor-pointer"
                    />
                    <span className="font-mono text-sm text-muted-foreground">{accentColor}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-base" htmlFor="fontFamily">
                  Default Font
                </Label>
                <Select value={fontFamily} onValueChange={setFontFamily}>
                  <SelectTrigger id="fontFamily">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {googleFonts.map((font) => (
                      <SelectItem
                        key={font.value}
                        value={font.value}
                        style={{ fontFamily: font.value }}
                      >
                        {font.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList /> Roles & Service Templates
            </CardTitle>
            <CardDescription>
              Define reusable roles and create templates for your common services.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="roles">
              <TabsList className="grid w-full grid-cols-2 max-w-md">
                <TabsTrigger value="roles">Manage Roles</TabsTrigger>
                <TabsTrigger value="templates">Service Templates</TabsTrigger>
              </TabsList>
              <TabsContent value="roles" className="pt-4">
                <Card className="border-0 shadow-none">
                  <CardContent className="space-y-4 p-0">
                    <div className="flex gap-2 items-end">
                      <div className="space-y-2 flex-1">
                        <Label htmlFor="new-role">New Role Name</Label>
                        <Input
                          id="new-role"
                          placeholder="e.g., Lector"
                          value={newRoleName}
                          onChange={(e) => setNewRoleName(e.target.value)}
                          onKeyUp={(e) => e.key === "Enter" && handleAddRole()}
                        />
                      </div>
                      <Button onClick={handleAddRole} disabled={isLoading || isProcessing}>
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Add
                      </Button>
                    </div>
                    <div className="border rounded-md p-4 space-y-2 max-h-80 overflow-y-auto">
                      {roles?.map((role) => (
                        <div
                          key={role.id}
                          className="flex justify-between items-center bg-muted/50 p-2 rounded-md"
                        >
                          <span>{role.name}</span>
                          <div className="flex items-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setRoleToEdit({ id: role.id, name: role.name });
                                setNewRoleNameToEdit(role.name);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setRoleToDelete(role)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {roles?.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center">No roles yet.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="templates" className="pt-4">
                <Card className="border-0 shadow-none">
                  <CardContent className="space-y-6 p-0">
                    <div className="space-y-4 border p-4 rounded-md bg-muted/20">
                      <div className="space-y-2">
                        <Label htmlFor="template-name">New Template Name</Label>
                        <Input
                          id="template-name"
                          placeholder="e.g. Sunday Morning Service"
                          value={newTemplateName}
                          onChange={(e) => setNewTemplateName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Select Roles Included in this Template:</Label>
                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border p-2 rounded bg-background">
                          {roles?.map((role) => (
                            <div
                              key={role.id}
                              className="flex items-center gap-2 p-2 hover:bg-muted cursor-pointer rounded"
                              onClick={() => toggleRoleSelection(role.id)}
                            >
                              {selectedRoleIds.has(role.id) ? (
                                <CheckSquare className="h-4 w-4 text-primary" />
                              ) : (
                                <Square className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className="text-sm">{role.name}</span>
                            </div>
                          ))}
                          {roles?.length === 0 && (
                            <p className="text-xs text-muted-foreground col-span-2">
                              Create roles in the 'Manage Roles' tab first.
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={handleAddTemplate}
                        disabled={isLoading || isProcessing || !newTemplateName || selectedRoleIds.size === 0}
                        className="w-full"
                      >
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Create Template
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Existing Templates</h4>
                      {templates?.map((template) => (
                        <div
                          key={template.id}
                          className="border p-3 rounded-md flex justify-between items-start"
                        >
                          <div>
                            <p className="font-bold">{template.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Roles: {(template.roles || []).map(r => `${r.name} (x${r.quantity})`).join(", ") || "None"}
                            </p>
                          </div>
                          <div className="flex items-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleOpenEditDialog(template)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleDeleteTemplate(template)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {templates?.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No templates created yet.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Setup Wizard</CardTitle>
            <CardDescription>
              Re-run the initial setup to bulk-import volunteers, roles, or events.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/dashboard/onboarding">
                <Wand2 className="mr-2 h-4 w-4" />
                Run Setup Wizard
              </Link>
            </Button>
          </CardContent>
        </Card>

        <div className="pt-4">
          <Button onClick={handleSave} disabled={isLoading || isSaving} size="lg">
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving All Settings...
              </>
            ) : (
              "Save All Settings"
            )}
          </Button>
        </div>
      </div>
      <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Service Template</DialogTitle>
            <DialogDescription>Change the name or update the roles and quantities below.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-template-name">Template Name</Label>
              <Input
                id="edit-template-name"
                value={editTemplateName}
                onChange={(e) => setEditTemplateName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Roles and Quantities</Label>
              <div className="space-y-2 max-h-60 overflow-y-auto border p-2 rounded">
                 {roles?.map((role) => {
                    const templateRole = editTemplateRoles.find(tr => tr.name === role.name);
                    const quantity = templateRole?.quantity || 0;
                    return (
                        <div key={role.id} className="flex items-center justify-between p-2 hover:bg-muted rounded">
                            <Label htmlFor={`edit-role-${role.id}`} className="font-normal">{role.name}</Label>
                            <div className="flex items-center gap-1">
                                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleEditRoleQuantity(role.name, -1)} disabled={quantity === 0}>
                                    <Minus className="h-4 w-4"/>
                                </Button>
                                <Input
                                    id={`edit-role-${role.id}`}
                                    type="number"
                                    readOnly
                                    value={quantity}
                                    className="h-7 w-12 text-center p-0"
                                />
                                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleEditRoleQuantity(role.name, 1)}>
                                    <Plus className="h-4 w-4"/>
                                </Button>
                            </div>
                        </div>
                    );
                 })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTemplate(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEditTemplate} disabled={isSavingEdit}>
              {isSavingEdit ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Role Confirmation */}
        <AlertDialog open={!!roleToDelete} onOpenChange={(open) => !open && setRoleToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete the role "{roleToDelete?.name}" and remove it from all service templates, existing events, and volunteer profiles. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDeleteRole} disabled={isProcessing}>
                        {isProcessing ? "Deleting..." : "Yes, delete role"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        {/* Edit Role Confirmation */}
        <Dialog open={!!roleToEdit} onOpenChange={(open) => !open && setRoleToEdit(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Role Name</DialogTitle>
                    <DialogDescription>
                        This will update the role name from "{roleToEdit?.name}" to your new name across all service templates and existing events.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="edit-role-name-input">New Role Name</Label>
                    <Input
                        id="edit-role-name-input"
                        value={newRoleNameToEdit}
                        onChange={(e) => setNewRoleNameToEdit(e.target.value)}
                        onKeyUp={(e) => e.key === "Enter" && confirmEditRole()}
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setRoleToEdit(null)}>Cancel</Button>
                    <Button onClick={confirmEditRole} disabled={isProcessing}>
                        {isProcessing ? "Updating..." : "Update Role Everywhere"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
