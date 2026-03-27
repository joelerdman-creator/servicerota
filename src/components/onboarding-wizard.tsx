
"use client";

import React, { useState, useRef, type FC, type ReactNode } from "react";
import { Loader2, FileText, Rss, UploadCloud, Users, Trash2, Merge, X, Edit, Plus, Minus, Repeat, UserPlus, FileUp, WandSparkles } from "lucide-react";
import { CardFooter, Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { UseStepperReturn } from "@/components/ui/stepper";
import type { ParsedEvent, Volunteer, Role, ParsedServiceTemplate } from "@/ai/flows/types";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import toast from "react-hot-toast";
import { getSuggestedRoles } from "@/lib/DenominationRoles";
import { extractDataFromText } from "@/ai/flows/extract-data-flow";


// --- TYPE DEFINITIONS ---
interface ChurchProfile {
  name?: string;
  calendarUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
  logoUrl?: string;
  denomination?: string;
  address?: string;
}

interface ExtractedData {
  volunteers: Volunteer[];
  roles: Role[];
  events: ParsedEvent[];
  serviceTemplates: ParsedServiceTemplate[];
}

const denominations = [
  "Non-denominational", "Baptist", "Southern Baptist", "Catholic", "Catholic (Ordinariate)", 
  "Methodist", "United Methodist", "Lutheran", "Lutheran (LCMS)", "Lutheran (ELCA)", 
  "Presbyterian", "Presbyterian (PCA)", "Presbyterian (PCUSA)", "Pentecostal", 
  "Episcopal/Anglican", "Anglican (ACNA)", "Churches of Christ", "Mormon (LDS)", 
  "Assemblies of God", "Orthodox (Eastern)", "Orthodox (Greek)", "Orthodox (Russian)", "Other"
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

const daysOfWeek = [
    { label: "Sunday", value: 0 },
    { label: "Monday", value: 1 },
    { label: "Tuesday", value: 2 },
    { label: "Wednesday", value: 3 },
    { label: "Thursday", value: 4 },
    { label: "Friday", value: 5 },
    { label: "Saturday", value: 6 },
];

// --- STEP COMPONENTS ---

export const WelcomeStep: FC<{
  churchProfile: ChurchProfile | null;
  onSave: (
    name: string,
    denomination: string,
    address: string,
    primaryColor: string,
    secondaryColor: string,
    accentColor: string,
    font: string,
    logo: File | null
  ) => void;
}> = ({ churchProfile, onSave }) => {
  const [churchName, setChurchName] = useState(churchProfile?.name || "");
  const [denomination, setDenomination] = useState(churchProfile?.denomination || "");
  const [address, setAddress] = useState(churchProfile?.address || "");
  const [primaryColor, setPrimaryColor] = useState(churchProfile?.primaryColor || "#166534");
  const [secondaryColor, setSecondaryColor] = useState(churchProfile?.secondaryColor || "#64748b");
  const [accentColor, setAccentColor] = useState(churchProfile?.accentColor || "#f59e0b");
  const [fontFamily, setFontFamily] = useState(churchProfile?.fontFamily || "Inter");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(churchProfile?.logoUrl || null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(churchName, denomination, address, primaryColor, secondaryColor, accentColor, fontFamily, logoFile);
    setIsSaving(false);
  };

  return (
    <div className="text-center max-w-4xl mx-auto mt-8">
      <style>{`@import url('https://fonts.googleapis.com/css2?${googleFonts.map(f => `family=${f.value.replace(/ /g, '+')}:wght@400;700`).join('&')}&display=swap');`}</style>
      <h2 className="text-2xl font-bold mb-2">Welcome to Parish Scribe!</h2>
      <p className="text-muted-foreground mb-8">Let's get your church set up with some basic information and branding.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 text-left">
        {/* Left Column: Info */}
        <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="church-name">What is the name of your church?</Label>
                <Input id="church-name" value={churchName} onChange={(e) => setChurchName(e.target.value)} />
            </div>
             <div className="space-y-2">
                <Label htmlFor="denomination">Denomination</Label>
                <Select value={denomination} onValueChange={setDenomination}>
                    <SelectTrigger id="denomination"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>{denominations.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
            </div>
             <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
        </div>

        {/* Right Column: Branding */}
        <div className="space-y-4">
             <div className="space-y-2">
                <Label>Brand Colors</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="primaryColor" className="text-xs">Primary</Label>
                    <Input id="primaryColor" type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-full h-10 p-1"/>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="secondaryColor" className="text-xs">Secondary</Label>
                    <Input id="secondaryColor" type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="w-full h-10 p-1"/>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="accentColor" className="text-xs">Accent</Label>
                    <Input id="accentColor" type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-full h-10 p-1"/>
                  </div>
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="fontFamily">Default Font</Label>
                <Select value={fontFamily} onValueChange={setFontFamily}>
                    <SelectTrigger id="fontFamily"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {googleFonts.map((font) => (
                            <SelectItem key={font.value} value={font.value} style={{ fontFamily: font.value }}>{font.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label className="text-sm">Church Logo (Optional)</Label>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/png, image/jpeg" className="hidden" />
                <div className="relative h-24 w-full border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:bg-muted/50" onClick={() => fileInputRef.current?.click()}>
                {logoPreview ? (
                    <Image src={logoPreview} alt="Logo preview" layout="fill" objectFit="contain" className="p-2"/>
                ) : (
                    <div className="text-center text-muted-foreground p-4">
                    <UploadCloud className="mx-auto h-8 w-8" />
                    <p className="text-sm">Click to upload</p>
                    </div>
                )}
                </div>
            </div>
        </div>
      </div>
      <Button className="mt-8" onClick={handleSave} disabled={isSaving || !churchName.trim()}>
        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Save and Continue
      </Button>
    </div>
  );
};

export const DefineRolesStep: FC<{
    denomination?: string;
    onSave: (roles: Role[], volunteers: Volunteer[]) => void;
}> = ({ denomination, onSave }) => {
    const suggestedRoles = getSuggestedRoles(denomination);
    const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
    const [customRole, setCustomRole] = useState("");
    const [pastedText, setPastedText] = useState("");
    const [extractedVolunteers, setExtractedVolunteers] = useState<Volunteer[]>([]);
    const [extractedRoles, setExtractedRoles] = useState<Role[]>([]);
    
    const [isSaving, setIsSaving] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);

    const toggleRole = (role: string) => {
        setSelectedRoles(prev => {
            const newSet = new Set(prev);
            if (newSet.has(role)) {
                newSet.delete(role);
            } else {
                newSet.add(role);
            }
            return newSet;
        });
    };

    const handleAddCustomRole = () => {
        if (customRole.trim()) {
            setSelectedRoles(prev => new Set(prev).add(customRole.trim()));
            setCustomRole("");
        }
    };
    
    const handleExtractFromText = async () => {
        if (!pastedText.trim()) {
            toast.error("Please paste some text to extract.");
            return;
        }
        setIsExtracting(true);
        const toastId = toast.loading("Analyzing text...");
        try {
            const result = await extractDataFromText({ pastedText, dataType: "volunteers-and-roles" });
            
            const newVolunteers = result.volunteers || [];
            const newRoles = result.roles || [];
            
            setExtractedVolunteers(prev => [...prev, ...newVolunteers]);
            setExtractedRoles(prev => [...prev, ...newRoles]);
            
            newRoles.forEach(role => setSelectedRoles(prev => new Set(prev).add(role.name)));

            toast.success(result.reasoning || "Data extracted!", { id: toastId });
            setPastedText("");
        } catch (e) {
            console.error(e);
            toast.error("Could not extract data from text.", { id: toastId });
        } finally {
            setIsExtracting(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        const allRoles = [...Array.from(selectedRoles).map(name => ({name})), ...extractedRoles];
        onSave(allRoles, extractedVolunteers);
        setIsSaving(false);
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6 py-6">
            <div>
                <h3 className="font-semibold text-lg flex items-center gap-2"><UserPlus /> Step 2: Define Roles & Volunteers</h3>
                <p className="text-sm text-muted-foreground mt-1">Select from suggested roles, add your own, or import a list of volunteers.</p>
            </div>

            <Tabs defaultValue="suggestions">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="suggestions">Choose Roles</TabsTrigger>
                    <TabsTrigger value="import">Import from Text</TabsTrigger>
                </TabsList>
                <TabsContent value="suggestions" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Select Roles</CardTitle>
                            <CardDescription>Click to select common roles for a {denomination || 'church'}.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                                {suggestedRoles.map(role => (
                                    <Badge
                                        key={role}
                                        variant={selectedRoles.has(role) ? "default" : "secondary"}
                                        className="cursor-pointer text-sm"
                                        onClick={() => toggleRole(role)}
                                    >
                                        {role}
                                    </Badge>
                                ))}
                            </div>
                            <div className="border-t pt-4 space-y-2">
                                <Label htmlFor="custom-role">Add a Custom Role</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="custom-role"
                                        value={customRole}
                                        onChange={(e) => setCustomRole(e.target.value)}
                                        placeholder="e.g., Sound Tech"
                                        onKeyUp={(e) => e.key === 'Enter' && handleAddCustomRole()}
                                    />
                                    <Button onClick={handleAddCustomRole}><Plus className="h-4 w-4 mr-2"/> Add</Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="import" className="mt-4">
                    <Card>
                         <CardHeader>
                            <CardTitle>Import Volunteers & Roles from Text</CardTitle>
                            <CardDescription>Paste a list from a spreadsheet or document. The AI will attempt to extract names, emails, and role names.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="volunteer-paste">Paste list here</Label>
                                <Textarea id="volunteer-paste" rows={6} placeholder="John Doe, Lector, johndoe@example.com&#10;Jane Smith, Usher" value={pastedText} onChange={(e) => setPastedText(e.target.value)} />
                            </div>
                             <Button onClick={handleExtractFromText} disabled={isExtracting || !pastedText.trim()} className="w-full">
                                {isExtracting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <WandSparkles className="mr-2 h-4 w-4"/>}
                                Extract from Text
                             </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

             <Button onClick={handleSave} disabled={isSaving} className="w-full">
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continue to Next Step
            </Button>
        </div>
    );
};

export const RecurringServicesStep: FC<{ 
    availableRoles: Role[];
    onSave: (services: any[]) => void; 
}> = ({ availableRoles, onSave }) => {
    const [services, setServices] = useState([{ name: "", dayOfWeek: 0, time: "10:00", roles: [] as {name: string; quantity: number}[] }]);
    const [isSaving, setIsSaving] = useState(false);

    const handleServiceChange = (index: number, field: string, value: string | number) => {
        const newServices = [...services];
        (newServices[index] as any)[field] = value;
        setServices(newServices);
    };

    const handleRoleQuantityChange = (serviceIndex: number, roleName: string, quantity: number) => {
        const newServices = [...services];
        const service = newServices[serviceIndex];
        const existingRole = service.roles.find(r => r.name === roleName);
        if (existingRole) {
            existingRole.quantity = Math.max(0, quantity);
        } else {
            service.roles.push({ name: roleName, quantity: 1 });
        }
        service.roles = service.roles.filter(r => r.quantity > 0);
        setServices(newServices);
    };

    const addService = () => {
        setServices([...services, { name: "", dayOfWeek: 0, time: "10:00", roles: [] }]);
    };

    const removeService = (index: number) => {
        const newServices = services.filter((_, i) => i !== index);
        setServices(newServices);
    };

    const handleSave = async () => {
        setIsSaving(true);
        const validServices = services.filter(s => s.name.trim() !== "");
        if (validServices.length === 0) {
            toast.error("Please configure at least one recurring service or skip this step.");
            setIsSaving(false);
            return;
        }
        await onSave(validServices);
        setIsSaving(false);
    };

    return (
        <div className="max-w-2xl mx-auto space-y-4 py-6">
            <div>
                <h3 className="font-semibold text-lg flex items-center gap-2"><Repeat /> Step 3: Recurring Services</h3>
                <p className="text-sm text-muted-foreground mt-1">Define your weekly recurring services and the roles needed for each. You can add one-off events and special services later.</p>
            </div>
            
            <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                {services.map((service, index) => (
                    <div key={index} className="p-4 border rounded-lg space-y-3 relative">
                         {services.length > 1 && (
                            <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={() => removeService(index)}>
                                <X className="h-4 w-4 text-muted-foreground"/>
                            </Button>
                         )}
                        <div className="space-y-2">
                            <Label htmlFor={`service-name-${index}`}>Service Name</Label>
                            <Input id={`service-name-${index}`} placeholder="e.g., Sunday Morning Eucharist" value={service.name} onChange={(e) => handleServiceChange(index, "name", e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor={`service-day-${index}`}>Day of Week</Label>
                                <Select value={service.dayOfWeek.toString()} onValueChange={(value) => handleServiceChange(index, "dayOfWeek", parseInt(value))}>
                                    <SelectTrigger id={`service-day-${index}`}><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        {daysOfWeek.map(d => <SelectItem key={d.value} value={d.value.toString()}>{d.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor={`service-time-${index}`}>Time</Label>
                                <Input id={`service-time-${index}`} type="time" value={service.time} onChange={(e) => handleServiceChange(index, "time", e.target.value)} />
                            </div>
                        </div>
                         <div className="space-y-2">
                            <Label>Roles & Quantities</Label>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                {availableRoles.map(role => {
                                    const serviceRole = service.roles.find(r => r.name === role.name);
                                    const quantity = serviceRole?.quantity || 0;
                                    return (
                                        <div key={role.name} className="flex items-center justify-between">
                                            <Label htmlFor={`role-qty-${index}-${role.name}`} className="text-sm font-normal">{role.name}</Label>
                                            <div className="flex items-center gap-1">
                                                <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleRoleQuantityChange(index, role.name, quantity - 1)}><Minus className="h-3 w-3"/></Button>
                                                <Input id={`role-qty-${index}-${role.name}`} type="number" value={quantity} onChange={(e) => handleRoleQuantityChange(index, role.name, parseInt(e.target.value) || 0)} className="h-6 w-12 text-center p-0" />
                                                <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleRoleQuantityChange(index, role.name, quantity + 1)}><Plus className="h-3 w-3"/></Button>
                                            </div>
                                        </div>
                                    )
                                })}
                                {availableRoles.length === 0 && <p className="text-xs text-muted-foreground col-span-2">Define roles in the previous step to add them here.</p>}
                            </div>
                         </div>
                    </div>
                ))}
            </div>

             <Button variant="outline" onClick={addService} className="w-full">
                <Plus className="mr-2 h-4 w-4" /> Add Another Service
            </Button>

            <Button onClick={handleSave} disabled={isSaving} className="w-full">
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save & Continue
            </Button>
        </div>
    );
};


export const UploadScheduleStep: FC<{ onExtract: (file: File) => void }> = ({ onExtract }) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  const handleExtract = async () => {
    if (!uploadedFile) return;
    setIsExtracting(true);
    await onExtract(uploadedFile);
    setIsExtracting(false);
  };

  return (
    <div className="max-w-xl mx-auto space-y-4 py-6">
      <div><h3 className="font-semibold text-lg flex items-center gap-2"><FileUp /> Step 4: Upload a Schedule (Optional)</h3><p className="text-sm text-muted-foreground mt-1">Upload a schedule (PDF, image, .eml) to extract events and roles. This is good for one-off or special events not covered by your weekly schedule.</p></div>
      <div className="space-y-2"><Label htmlFor="file-upload">Schedule Document</Label><Input id="file-upload" type="file" onChange={(e) => e.target.files && setUploadedFile(e.target.files[0])} accept=".pdf,.png,.jpg,.jpeg,.eml" /></div>
      <Button onClick={handleExtract} disabled={isExtracting || !uploadedFile} className="w-full">
        {isExtracting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />} Upload & Add to Review
      </Button>
    </div>
  );
};


type ReviewStepProps = {
  extractedData: ExtractedData;
  setExtractedData: React.Dispatch<React.SetStateAction<ExtractedData>>;
  onRemoveItem: (type: keyof ExtractedData, item: any, uniqueId: string) => void;
};

export const ReviewStep: FC<ReviewStepProps> = ({ extractedData, setExtractedData, onRemoveItem }) => {
  const [volunteerSort, setVolunteerSort] = useState<'lastName' | 'firstName'>('lastName');
  const [selectedVolunteerIndices, setSelectedVolunteerIndices] = useState<Set<number>>(new Set());
  const [isMergeVolunteersOpen, setIsMergeVolunteersOpen] = useState(false);
  const [primaryVolunteerIndex, setPrimaryVolunteerIndex] = useState<number | null>(null);

  const [selectedRoleIndices, setSelectedRoleIndices] = useState<Set<number>>(new Set());
  const [isMergeRolesOpen, setIsMergeRolesOpen] = useState(false);
  const [primaryRoleIndex, setPrimaryRoleIndex] = useState<number | null>(null);
  
  const [editingRole, setEditingRole] = useState<{ index: number; name: string } | null>(null);

  const sortedVolunteers = React.useMemo(() => [...extractedData.volunteers].sort((a, b) => (volunteerSort === 'firstName' ? (a.firstName || '').localeCompare(b.firstName || '') : (a.lastName || '').localeCompare(b.lastName || ''))), [extractedData.volunteers, volunteerSort]);
  const sortedRoles = React.useMemo(() => [...extractedData.roles].sort((a, b) => a.name.localeCompare(b.name)), [extractedData.roles]);
  const sortedTemplates = React.useMemo(() => [...extractedData.serviceTemplates].sort((a, b) => a.name.localeCompare(b.name)), [extractedData.serviceTemplates]);
  const sortedEvents = React.useMemo(() => [...extractedData.events].sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()), [extractedData.events]);

  const selectedVolunteers = React.useMemo(() => Array.from(selectedVolunteerIndices).map(index => sortedVolunteers[index]), [selectedVolunteerIndices, sortedVolunteers]);
  const selectedRoles = React.useMemo(() => Array.from(selectedRoleIndices).map(index => sortedRoles[index]), [selectedRoleIndices, sortedRoles]);
  
  // --- Volunteer Handlers ---
  const handleVolunteerSelect = (index: number, checked: boolean) => {
    setSelectedVolunteerIndices(prev => { const newSet = new Set(prev); if (checked) newSet.add(index); else newSet.delete(index); return newSet; });
  };

  const handleMergeVolunteersClick = () => {
    if (selectedVolunteers.length < 2) { toast.error("Please select at least two volunteers to merge."); return; }
    setPrimaryVolunteerIndex(0);
    setIsMergeVolunteersOpen(true);
  };
  
  const handleConfirmVolunteerMerge = () => {
    if (primaryVolunteerIndex === null || selectedVolunteers.length < 2) return;
    const primaryVolunteer = selectedVolunteers[primaryVolunteerIndex];
    const otherVolunteers = selectedVolunteers.filter((_, i) => i !== primaryVolunteerIndex);
    const mergedVolunteer: Volunteer = { ...primaryVolunteer, inferredRoleNames: [...new Set([...(primaryVolunteer.inferredRoleNames || []), ...otherVolunteers.flatMap(o => o.inferredRoleNames || [])])] };
    otherVolunteers.forEach(other => { if (!mergedVolunteer.email && other.email) mergedVolunteer.email = other.email; });
    setExtractedData(prev => ({ ...prev, volunteers: [...prev.volunteers.filter(v => !selectedVolunteers.some(sv => sv.firstName === v.firstName && sv.lastName === v.lastName)), mergedVolunteer] }));
    toast.success("Volunteers merged!");
    setIsMergeVolunteersOpen(false);
    setSelectedVolunteerIndices(new Set());
  };

  const handleRemoveInferredRole = (volunteer: Volunteer, roleToRemove: string) => {
    setExtractedData(prev => ({ ...prev, volunteers: prev.volunteers.map(v => v.firstName === volunteer.firstName && v.lastName === volunteer.lastName ? { ...v, inferredRoleNames: v.inferredRoleNames?.filter(role => role !== roleToRemove) } : v) }));
  };

  // --- Role Handlers ---
  const handleRoleSelect = (index: number, checked: boolean) => {
    setSelectedRoleIndices(prev => { const newSet = new Set(prev); if (checked) newSet.add(index); else newSet.delete(index); return newSet; });
  };
  
  const handleMergeRolesClick = () => {
    if (selectedRoles.length < 2) { toast.error("Please select at least two roles to merge."); return; }
    setPrimaryRoleIndex(0);
    setIsMergeRolesOpen(true);
  };

  const handleConfirmRoleMerge = () => {
    if (primaryRoleIndex === null || selectedRoles.length < 2) return;
    const primaryRole = selectedRoles[primaryRoleIndex];
    const otherRoles = selectedRoles.filter((_, i) => i !== primaryRoleIndex);
    const otherRoleNames = otherRoles.map(r => r.name.toLowerCase());
    
    setExtractedData(prev => {
        const remainingRoles = prev.roles.filter(r => !selectedRoles.some(sr => sr.name === r.name));
        const updatedTemplates = prev.serviceTemplates.map(t => ({...t, roles: t.roles.map(r => otherRoleNames.includes(r.name.toLowerCase()) ? {...r, name: primaryRole.name} : r)}));
        const updatedVolunteers = prev.volunteers.map(v => ({...v, inferredRoleNames: v.inferredRoleNames?.map(ir => otherRoleNames.includes(ir.toLowerCase()) ? primaryRole.name : ir)}));

        return { ...prev, roles: [...remainingRoles, primaryRole], volunteers: updatedVolunteers, serviceTemplates: updatedTemplates };
    });
    
    toast.success("Roles merged successfully!");
    setIsMergeRolesOpen(false);
    setSelectedRoleIndices(new Set());
  };
  
  const handleSaveRoleRename = () => {
    if (!editingRole) return;
    const oldName = sortedRoles[editingRole.index].name;
    const newName = editingRole.name;
    
    setExtractedData(prev => {
        const updatedRoles = prev.roles.map(r => r.name === oldName ? { ...r, name: newName } : r);
        const updatedTemplates = prev.serviceTemplates.map(t => ({...t, roles: t.roles.map(r => r.name === oldName ? {...r, name: newName} : r)}));
        const updatedVolunteers = prev.volunteers.map(v => ({...v, inferredRoleNames: v.inferredRoleNames?.map(ir => ir === oldName ? newName : ir)}));
        return { ...prev, roles: updatedRoles, volunteers: updatedVolunteers, serviceTemplates: updatedTemplates };
    });
    setEditingRole(null);
  };
  
  // --- Template Handlers ---
  const handleQuantityChange = (templateName: string, roleName: string, change: number) => {
    setExtractedData(prev => ({
        ...prev,
        serviceTemplates: prev.serviceTemplates.map(t => t.name === templateName ? {
            ...t,
            roles: t.roles.map(r => r.name === roleName ? { ...r, quantity: Math.max(1, r.quantity + change) } : r)
        } : t)
    }));
  };

  const handleRemoveTemplateRole = (templateName: string, roleToRemove: string) => {
    setExtractedData(prev => ({ ...prev, serviceTemplates: prev.serviceTemplates.map(t => t.name === templateName ? { ...t, roles: t.roles.filter(r => r.name !== roleToRemove) } : t) }));
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-lg">Step 5: Review Extracted Data</h3>
        <p className="text-muted-foreground text-sm">Please check the data in each tab below. You can merge duplicates, edit names, and adjust quantities.</p>
      </div>

      <Tabs defaultValue="events" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="events">Events ({sortedEvents.length})</TabsTrigger>
          <TabsTrigger value="volunteers">Volunteers ({sortedVolunteers.length})</TabsTrigger>
          <TabsTrigger value="roles">Roles ({sortedRoles.length})</TabsTrigger>
          <TabsTrigger value="templates">Templates ({sortedTemplates.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="events" className="mt-4"><Card><CardHeader><CardTitle>Events</CardTitle><CardDescription>A list of upcoming services and events.</CardDescription></CardHeader><CardContent className="space-y-3 max-h-80 overflow-y-auto">{sortedEvents.map((item, index) => (<div key={index} className="flex flex-col items-start p-2 rounded-md bg-muted/50"><div className="flex justify-between w-full items-center"><span className="font-medium text-sm truncate pr-2">{item.eventName}</span><Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => onRemoveItem("events", item, item.eventDate)}><Trash2 className="h-3 w-3" /></Button></div><div className="flex flex-wrap gap-1 mt-1"><Badge variant="secondary" className="text-xs">{new Date(item.eventDate).toLocaleString()}</Badge></div></div>))}</CardContent></Card></TabsContent>
        <TabsContent value="volunteers" className="mt-4"><Card><CardHeader><div className="flex justify-between items-center"><div><CardTitle>Volunteers</CardTitle><CardDescription>A list of people found. Select at least two to merge them.</CardDescription></div><div className="flex items-center gap-2">{selectedVolunteers.length > 1 && (<Button size="sm" onClick={handleMergeVolunteersClick}><Merge className="mr-2 h-4 w-4"/>Merge Selected</Button>)}{<Select value={volunteerSort} onValueChange={(value) => setVolunteerSort(value as 'lastName' | 'firstName')}><SelectTrigger className="w-[120px] text-xs h-8"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="lastName">Sort by Last</SelectItem><SelectItem value="firstName">Sort by First</SelectItem></SelectContent></Select>}</div></div></CardHeader><CardContent className="space-y-3 max-h-80 overflow-y-auto">{sortedVolunteers.map((item, index) => (<div key={index} className="flex flex-col items-start p-3 rounded-md bg-muted/50"><div className="flex justify-between w-full items-center"><div className="flex items-center gap-3"><Checkbox id={`volunteer-${index}`} onCheckedChange={(checked) => handleVolunteerSelect(index, !!checked)} checked={selectedVolunteerIndices.has(index)} /><Label htmlFor={`volunteer-${index}`} className="font-medium text-sm cursor-pointer">{item.firstName} {item.lastName}</Label></div><Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => onRemoveItem("volunteers", item, `${item.firstName}${item.lastName}`)}><Trash2 className="h-3 w-3" /></Button></div>{ (item.email || (item.inferredRoleNames && item.inferredRoleNames.length > 0)) && <div className="flex flex-wrap gap-1 mt-2 pl-8">{item.email && <Badge variant="secondary" className="text-xs">{item.email}</Badge>}{item.inferredRoleNames?.map(role => <Badge key={role} variant="outline" className="text-xs pr-1">{role}<button onClick={() => handleRemoveInferredRole(item, role)} className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"><X className="h-2 w-2"/></button></Badge>)}</div>}</div>))}</CardContent></Card></TabsContent>
        <TabsContent value="roles" className="mt-4"><Card><CardHeader><div className="flex justify-between items-center"><div><CardTitle>Roles</CardTitle><CardDescription>Volunteer positions to be created. Select at least two to merge.</CardDescription></div>{selectedRoles.length > 1 && (<Button size="sm" onClick={handleMergeRolesClick}><Merge className="mr-2 h-4 w-4"/>Merge Selected</Button>)}</div></CardHeader><CardContent className="space-y-2 max-h-80 overflow-y-auto">{sortedRoles.map((item, index) => (<div key={index} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded-md"><div className="flex items-center gap-2"><Checkbox id={`role-${index}`} onCheckedChange={(checked) => handleRoleSelect(index, !!checked)} checked={selectedRoleIndices.has(index)} /><span className="truncate pr-2">{item.name}</span></div><div className="flex items-center"><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingRole({ index, name: item.name })}><Edit className="h-3 w-3" /></Button><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRemoveItem("roles", item, item.name)}><Trash2 className="h-3 w-3 text-destructive" /></Button></div></div>))}</CardContent></Card></TabsContent>
        <TabsContent value="templates" className="mt-4"><Card><CardHeader><CardTitle>Service Templates</CardTitle><CardDescription>Reusable groups of roles for services.</CardDescription></CardHeader><CardContent className="space-y-3 max-h-80 overflow-y-auto">{sortedTemplates.map((item, index) => (<div key={index} className="flex flex-col items-start p-3 rounded-md bg-muted/50"><div className="flex justify-between w-full items-center"><span className="font-medium text-sm">{item.name}</span><Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => onRemoveItem("serviceTemplates", item, item.name)}><Trash2 className="h-3 w-3" /></Button></div><div className="flex flex-wrap gap-2 mt-2">{item.roles.map(role => (<div key={role.name} className="flex items-center gap-1 rounded-full border border-primary/50 bg-primary/10 pl-2 pr-1 text-xs text-primary/80"><span className="font-medium">{role.name}</span><span className="font-bold text-primary/100">({role.quantity})</span><div className="flex items-center"><Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => handleQuantityChange(item.name, role.name, -1)}><Minus className="h-3 w-3"/></Button><Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => handleQuantityChange(item.name, role.name, 1)}><Plus className="h-3 w-3"/></Button></div><button onClick={() => handleRemoveTemplateRole(item.name, role.name)} className="rounded-full hover:bg-destructive/20 p-0.5"><X className="h-2.5 w-2.5"/></button></div>))}</div></div>))}</CardContent></Card></TabsContent>
      </Tabs>
      
      {/* Volunteer Merge Dialog */}
      <Dialog open={isMergeVolunteersOpen} onOpenChange={setIsMergeVolunteersOpen}><DialogContent><DialogHeader><DialogTitle>Merge Volunteers</DialogTitle><DialogDescription>Select the primary profile to keep. Others will be removed, and their data merged.</DialogDescription></DialogHeader><RadioGroup value={primaryVolunteerIndex?.toString() || "0"} onValueChange={(value) => setPrimaryVolunteerIndex(parseInt(value))}>{selectedVolunteers.map((v, i) => (<div key={i} className="flex items-center space-x-2 p-3 border rounded-md"><RadioGroupItem value={i.toString()} id={`merge-v-option-${i}`}/><Label htmlFor={`merge-v-option-${i}`} className="w-full"><p className="font-semibold">{v.firstName} {v.lastName}</p><p className="text-xs text-muted-foreground">{v.email}</p></Label></div>))}</RadioGroup><DialogFooter><DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose><Button onClick={handleConfirmVolunteerMerge}>Confirm Merge</Button></DialogFooter></DialogContent></Dialog>
      
      {/* Role Merge Dialog */}
      <Dialog open={isMergeRolesOpen} onOpenChange={setIsMergeRolesOpen}><DialogContent><DialogHeader><DialogTitle>Merge Roles</DialogTitle><DialogDescription>Select the primary role to keep. Others will be removed and their references updated.</DialogDescription></DialogHeader><RadioGroup value={primaryRoleIndex?.toString() || "0"} onValueChange={(value) => setPrimaryRoleIndex(parseInt(value))}>{selectedRoles.map((r, i) => (<div key={i} className="flex items-center space-x-2 p-3 border rounded-md"><RadioGroupItem value={i.toString()} id={`merge-r-option-${i}`}/><Label htmlFor={`merge-r-option-${i}`} className="font-semibold">{r.name}</Label></div>))}</RadioGroup><DialogFooter><DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose><Button onClick={handleConfirmRoleMerge}>Confirm Merge</Button></DialogFooter></DialogContent></Dialog>

      {/* Role Edit Dialog */}
      <Dialog open={!!editingRole} onOpenChange={(open) => !open && setEditingRole(null)}><DialogContent><DialogHeader><DialogTitle>Edit Role Name</DialogTitle></DialogHeader><Input value={editingRole?.name || ""} onChange={(e) => editingRole && setEditingRole({...editingRole, name: e.target.value})} onKeyUp={(e) => e.key === "Enter" && handleSaveRoleRename()} /><DialogFooter><DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose><Button onClick={handleSaveRoleRename}>Save</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}

export const AllSetStep: FC<{ onFinish: () => void }> = ({ onFinish }) => (
  <div className="text-center max-w-2xl mx-auto py-12">
    <h2 className="text-2xl font-bold mb-2">You're All Set!</h2>
    <p className="text-muted-foreground mb-6">Your data has been imported. You can now manage events, assign volunteers, and much more.</p>
    <Button size="lg" onClick={onFinish}>Go to my Dashboard</Button>
  </div>
);

// --- WIZARD FOOTER ---
export const WizardFooter: FC<{ stepper: UseStepperReturn; isSaving: boolean; onSave: () => void; isLastStep: boolean; }> = ({ stepper, isSaving, onSave, isLastStep }) => {
  if (stepper.activeStep === 0 || isLastStep) return null;

  const isReviewStep = stepper.activeStep === 4;

  return (
    <CardFooter className="justify-between border-t pt-6">
      <Button variant="outline" onClick={stepper.prevStep} disabled={stepper.isFirstStep || isSaving}>Back</Button>
      {isReviewStep ? (
        <Button onClick={onSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Confirm & Save All
        </Button>
      ) : (
        <Button onClick={stepper.nextStep} disabled={isSaving}>Skip for now</Button>
      )}
    </CardFooter>
  );
};
