
"use client";

import { useState, useEffect, useRef } from "react";
import { useUser, useFirestore, useDoc, useMemoFirebase, errorEmitter, useCollection } from "@/firebase";
import { doc, collection, writeBatch, serverTimestamp, updateDoc, query, where } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  Card,
  CardHeader,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Stepper, StepperItem, useExternalStepper } from "@/components/ui/stepper";
import { Loader2, Check } from "lucide-react";
import toast from "react-hot-toast";
import { extractDataFromText } from "@/ai/flows/extract-data-flow";
import { useRouter } from "next/navigation";
import type { ParsedEvent, Volunteer, Role, DocumentExtractionOutput, ParsedServiceTemplate } from "@/ai/flows/types";
import { uniq, uniqBy } from "lodash";
import { FirestorePermissionError } from "@/firebase/errors";
import {
  WelcomeStep,
  RecurringServicesStep,
  UploadScheduleStep,
  DefineRolesStep,
  ReviewStep,
  AllSetStep,
  WizardFooter,
} from "@/components/onboarding-wizard";
import type { DateRange } from "react-day-picker";
import { RRule } from "rrule";
import { addMonths } from "date-fns";


// --- TYPE DEFINITIONS ---
interface ExtractedData {
  volunteers: Volunteer[];
  roles: Role[];
  events: ParsedEvent[];
  serviceTemplates: ParsedServiceTemplate[];
}

interface UserProfile {
  churchId?: string;
}

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

// Redefine Volunteer and Role types for Firestore documents
interface DbVolunteer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  availableRoleIds?: string[];
}

interface DbRole {
  id: string;
  name: string;
}

type DeletedItem = {
    type: keyof ExtractedData;
    item: any;
};


const steps = [
  { label: "Welcome" },
  { label: "Upload Schedule" },
  { label: "Define Roles" },
  { label: "Recurring Services" },
  { label: "Review & Confirm" },
  { label: "All Set!" },
];

const scheduleLoadingMessages = [
    "Brewing the coffee for the social hour...",
    "Finding a good hymn to sing...",
    "Untangling the microphone cords...",
    "Polishing the pews...",
    "Checking if the sermon notes are finished...",
    "Making sure the organ is in tune...",
];

const volunteerLoadingMessages = [
    "Alphabetizing the church directory...",
    "Finding everyone's name tag...",
    "Making sure the potluck dish has a name on it...",
    "Counting the offering... again...",
    "Updating the prayer list...",
];

// --- ONBOARDING PAGE ---
export default function OnboardingWizardPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // --- STATE ---
  const [extractedData, setExtractedData] = useState<ExtractedData>({
    volunteers: [],
    roles: [],
    events: [],
    serviceTemplates: [],
  });
  const [isSaving, setIsSaving] = useState(false);
  const stepper = useExternalStepper({ initialStep: 0, steps });
  const [lastDeleted, setLastDeleted] = useState<DeletedItem | null>(null);


  // --- DATA FETCHING ---
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(
    useMemoFirebase(
      () => (user?.uid && firestore ? doc(firestore, "users", user.uid) : null),
      [user, firestore],
    ),
  );

  const { data: churchProfile, isLoading: isChurchLoading } = useDoc<ChurchProfile>(
    useMemoFirebase(
      () =>
        userProfile?.churchId && firestore
          ? doc(firestore, "churches", userProfile.churchId)
          : null,
      [firestore, userProfile?.churchId],
    ),
  );

  // Fetch existing data for merging
   const { data: existingVolunteers, isLoading: isVolunteersLoading } = useCollection<DbVolunteer>(
    useMemoFirebase(() => (userProfile?.churchId && firestore ? query(collection(firestore, 'users'), where("churchId", "==", userProfile.churchId)) : null), [userProfile?.churchId, firestore])
  );

  const { data: existingRoles, isLoading: isRolesLoading } = useCollection<DbRole>(
    useMemoFirebase(() => (userProfile?.churchId && firestore ? collection(firestore, `churches/${userProfile.churchId}/role_templates`) : null), [userProfile?.churchId, firestore])
  );


  // --- UTILITY FUNCTIONS ---
  const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

 const mergeExtractedData = (newData: Partial<DocumentExtractionOutput>) => {
    setExtractedData((prev) => {
      const normalize = (str: string) => (str || "").trim().toLowerCase();

      // Merge and de-duplicate volunteers
      const allVolunteers = [...(existingVolunteers || []), ...prev.volunteers, ...(newData.volunteers || [])];
      
      const uniqueVolunteersWithMergedRoles = uniqBy(allVolunteers, (v) => `${normalize(v.firstName)}${normalize(v.lastName)}`).map(volunteer => {
        // Find all occurrences of this volunteer to merge their roles
        const allInstances = allVolunteers.filter(v => normalize(v.firstName) === normalize(volunteer.firstName) && normalize(v.lastName) === normalize(volunteer.lastName));
        const allInferredRoles = allInstances.flatMap(v => (v as any).inferredRoleNames || []);
        
        return {
          ...volunteer,
          inferredRoleNames: uniq(allInferredRoles), // Deduplicate inferred roles
        };
      });

      // Merge and de-duplicate roles
      const allRoles = [...(existingRoles || []), ...prev.roles, ...(newData.roles || [])];
      const uniqueRoles = uniqBy(
        allRoles,
        (r) => normalize(r.name)
      );
      
      // Merge service templates, ensuring roles within each are also unique.
      const allTemplates = [...(prev.serviceTemplates || []), ...(newData.serviceTemplates || [])];
      const uniqueTemplates = uniqBy(allTemplates, (t) => normalize(t.name)).map(template => {
          const allTemplateRoles = allTemplates
            .filter(t => normalize(t.name) === normalize(template.name))
            .flatMap(t => t.roles);
          
          const rolesMap = new Map<string, { name: string, quantity: number }>();
          allTemplateRoles.forEach(role => {
            const roleKey = normalize(role.name);
            if (rolesMap.has(roleKey)) {
              // Sum quantities for the same role
              rolesMap.get(roleKey)!.quantity += role.quantity;
            } else {
              rolesMap.set(roleKey, { ...role });
            }
          });

          return {
              ...template,
              roles: Array.from(rolesMap.values()),
          };
      });


      return {
        ...prev,
        volunteers: uniqueVolunteersWithMergedRoles,
        roles: uniqueRoles.map(r => ({...r})), // create new objects
        events: uniqBy([...prev.events, ...(newData.events || [])], (e) => e.eventDate),
        serviceTemplates: uniqueTemplates,
      };
    });
  };

  // --- HANDLERS ---
  const handleSaveChurchInfo = async (
    churchName: string,
    denomination: string,
    address: string,
    primaryColor: string,
    secondaryColor: string,
    accentColor: string,
    fontFamily: string,
    logoFile: File | null,
  ) => {
    const isComponentMounted = isMountedRef.current;
    if (!firestore || !userProfile?.churchId || !churchName.trim()) {
      toast.error("Church name cannot be empty.");
      return;
    }
    const loadingToast = toast.loading("Saving church info...");

    try {
      const churchDocRef = doc(firestore, "churches", userProfile.churchId);
      let logoUrlToSave = churchProfile?.logoUrl;

      if (logoFile) {
        const storage = getStorage();
        const filePath = `logos/${userProfile.churchId}/${new Date().getTime()}_${logoFile.name}`;
        const storageRef = ref(storage, filePath);
        const snapshot = await uploadBytes(storageRef, logoFile);
        logoUrlToSave = await getDownloadURL(snapshot.ref);
      }

      await updateDoc(churchDocRef, {
        name: churchName.trim(),
        denomination,
        address,
        primaryColor,
        secondaryColor,
        accentColor,
        fontFamily,
        logoUrl: logoUrlToSave,
      });

      if (!isComponentMounted) return;
      toast.success("Church info saved!", { id: loadingToast });
      stepper.nextStep();
    } catch (e) {
      if (!isComponentMounted) return;
      toast.error("Failed to save church info.", { id: loadingToast });
      console.error(e);
      if (userProfile.churchId) {
        errorEmitter.emit(
          "permission-error",
          new FirestorePermissionError({
            path: `churches/${userProfile.churchId}`,
            operation: "update",
          }),
        );
      }
    }
  };
  
 const handleCreateRecurringServices = async (services: any[]) => {
    setExtractedData(prev => ({
        ...prev,
        serviceTemplates: uniqBy([...prev.serviceTemplates, ...services], 'name')
    }));

    toast.success(`${services.length} recurring service template(s) added for review.`);
    stepper.nextStep();
};


 const runFunnyLoader = (messages: string[]) => {
    let messageIndex = 0;
    const toastId = toast.loading(messages[messageIndex], { duration: Infinity });
  
    const intervalId = setInterval(() => {
      messageIndex = (messageIndex + 1) % messages.length;
      toast.loading(messages[messageIndex], { id: toastId, duration: Infinity });
    }, 3000);
  
    return { toastId, intervalId };
  };

  const handleExtractFromFile = async (uploadedFile: File) => {
    const isComponentMounted = isMountedRef.current;
    const { toastId, intervalId } = runFunnyLoader(scheduleLoadingMessages);

    try {
      const dataUri = await fileToDataUri(uploadedFile);
      const knownRoleNames = [
        ...(existingRoles?.map(r => r.name) || []),
        ...extractedData.roles.map(r => r.name),
      ];

      const endpoint = uploadedFile.name.endsWith(".eml")
        ? "/api/extract/eml"
        : "/api/extract/document";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentDataUri: dataUri, knownRoleNames }),
      });

      const output: DocumentExtractionOutput & { error?: string } = await res.json();

      clearInterval(intervalId);
      if (!isComponentMounted) {
        toast.dismiss(toastId);
        return;
      }

      if (!res.ok || output.error) {
        toast.error(`Extraction failed: ${output.error || res.statusText}`, { id: toastId, duration: 8000 });
        return;
      }

      // Filter out past events before merging
      const now = new Date();
      const futureEvents = output.events?.filter(event => new Date(event.eventDate) >= now) || [];

      toast.success(output.reasoning || "Successfully extracted data.", { id: toastId, duration: 4000 });
      mergeExtractedData({ ...output, events: futureEvents });
      stepper.nextStep();
    } catch (error: any) {
      clearInterval(intervalId);
      if (!isComponentMounted) {
        toast.dismiss(toastId);
        return;
      }
      toast.error(`Extraction failed: ${error?.message || "Unknown error"}`, { id: toastId, duration: 8000 });
    }
  };

  const handleDefineRolesAndVolunteers = (roles: Role[], volunteers: Volunteer[]) => {
     mergeExtractedData({ roles, volunteers });
     toast.success("Roles and volunteers added for review.");
     stepper.nextStep();
  };

  const undoDelete = () => {
    if (lastDeleted) {
        setExtractedData(prev => {
            const items = [...prev[lastDeleted.type], lastDeleted.item];
            return { ...prev, [lastDeleted.type]: items };
        });
        setLastDeleted(null);
        toast.dismiss("undo-toast");
        toast.success("Item restored!");
    }
  };

  const removeItem = (itemType: keyof ExtractedData, item: any, uniqueId: string) => {
    let newItems;
    let removedItem;
    
    setExtractedData((prev) => {
      const items = prev[itemType] as any[];
      switch (itemType) {
        case "volunteers":
          newItems = items.filter(v => `${v.firstName}${v.lastName}` !== uniqueId);
          removedItem = items.find(v => `${v.firstName}${v.lastName}` === uniqueId);
          break;
        case "roles":
        case "serviceTemplates":
          newItems = items.filter(i => i.name !== uniqueId);
          removedItem = items.find(i => i.name === uniqueId);
          break;
        case "events":
          newItems = items.filter(e => e.eventDate !== uniqueId);
          removedItem = items.find(e => e.eventDate === uniqueId);
          break;
        default:
          newItems = items;
      }
      return { ...prev, [itemType]: newItems };
    });

    if (removedItem) {
        setLastDeleted({ type: itemType, item: removedItem });
        toast(
          (t) => (
            <div className="flex items-center justify-between w-full">
              <span>Item removed.</span>
              <Button variant="ghost" size="sm" onClick={() => undoDelete()}>
                Undo
              </Button>
            </div>
          ),
          { id: "undo-toast", duration: 5000 }
        );
    }
  };


  const handleConfirmAndSave = async () => {
    const isComponentMounted = isMountedRef.current;
    if (!firestore || !userProfile?.churchId || !existingRoles) {
      toast.error("Cannot save data: user, church ID, or roles not loaded.");
      return;
    }
    setIsSaving(true);
    const loadingToastId = toast.loading("Saving your data...");
    const churchId = userProfile.churchId;
    const batch = writeBatch(firestore);

    try {
      const roleNameToIdMap = new Map(existingRoles.map(r => [r.name.trim().toLowerCase(), r.id]));
      
      // 1. Save Roles
      for (const role of extractedData.roles) {
          if (!roleNameToIdMap.has(role.name.trim().toLowerCase())) {
              const roleRef = doc(collection(firestore, `churches/${churchId}/role_templates`));
              batch.set(roleRef, { churchId, name: role.name, createdAt: serverTimestamp() });
              roleNameToIdMap.set(role.name.trim().toLowerCase(), roleRef.id);
          }
      }
      
      // 2. Save Service Templates
      extractedData.serviceTemplates.forEach((template) => {
        const templateRef = doc(collection(firestore, `churches/${churchId}/service_templates`));
        const roles = template.roles.map(role => ({
            name: role.name,
            quantity: role.quantity
        }));
        
        batch.set(templateRef, { 
            name: template.name,
            dayOfWeek: template.dayOfWeek,
            timeOfDay: template.timeOfDay,
            roles, // Storing role name and quantity now
            churchId, 
            createdAt: serverTimestamp() 
        });
      });

      // 3. Save Volunteers
      const existingVolunteerNames = new Set(existingVolunteers?.map(v => `${v.firstName.trim()}${v.lastName.trim()}`.toLowerCase()));
      for (const volunteer of extractedData.volunteers) {
          if (!existingVolunteerNames.has(`${volunteer.firstName.trim()}${volunteer.lastName.trim()}`.toLowerCase())) {
              const volunteerRef = doc(collection(firestore, "users"));
              const availableRoleIds = (volunteer.inferredRoleNames || [])
                ?.map(name => roleNameToIdMap.get(name.trim().toLowerCase()))
                .filter(id => !!id) as string[] || [];
              const { inferredRoleNames, ...volunteerData } = volunteer; // remove inferred roles before saving
              batch.set(volunteerRef, { ...volunteerData, churchId, status: "active", isManagedByAdmin: true, role: "volunteer", createdAt: serverTimestamp(), availableRoleIds });
          }
      }

      // 4. Save explicit events
      extractedData.events.forEach((event) => {
        const eventRef = doc(collection(firestore, `churches/${churchId}/events`));
        batch.set(eventRef, { ...event, churchId, isPublished: false, createdAt: serverTimestamp() });
      });

      // 5. Generate events from service templates for the next 3 months
      const startDate = new Date();
      const endDate = addMonths(startDate, 3);
      extractedData.serviceTemplates.forEach((template) => {
          if (template.dayOfWeek === undefined || !template.timeOfDay) return;

          const rule = new RRule({
              freq: RRule.WEEKLY,
              byweekday: template.dayOfWeek,
              dtstart: startDate,
              until: endDate,
          });

          const occurrences = rule.all();
          const [hours, minutes] = template.timeOfDay.split(":").map(Number);
          
          occurrences.forEach(occurrenceDate => {
              const eventDate = new Date(occurrenceDate);
              eventDate.setHours(hours, minutes, 0, 0);

              const eventRef = doc(collection(firestore, `churches/${churchId}/events`));
              batch.set(eventRef, {
                  eventName: template.name,
                  eventDate: eventDate.toISOString(),
                  eventType: "Service",
                  churchId: churchId,
                  isPublished: false,
                  createdAt: serverTimestamp()
              });
              
              template.roles.forEach(roleInTemplate => {
                  for (let i = 0; i < roleInTemplate.quantity; i++) {
                      const roleRef = doc(collection(eventRef, 'roles'));
                      batch.set(roleRef, {
                          eventId: eventRef.id,
                          roleName: roleInTemplate.name,
                          status: "Pending"
                      });
                  }
              });
          });
      });

      batch.update(doc(firestore, "churches", churchId), { onboardingCompleted: true });

      await batch.commit();
      if (!isComponentMounted) return;
      toast.success("All data has been saved successfully!", { id: loadingToastId });
      stepper.nextStep();
    } catch (error: any) {
      if (!isComponentMounted) return;
      const message = error instanceof Error ? error.message : "An unexpected error occurred during saving.";
      toast.error(message, { id: loadingToastId, duration: 6000 });
      errorEmitter.emit("permission-error", new FirestorePermissionError({ path: "Multiple collections", operation: "write" }));
    } finally {
      if (isMountedRef.current) setIsSaving(false);
    }
  };

  const renderStepContent = () => {
    switch (stepper.activeStep) {
      case 0:
        return <WelcomeStep churchProfile={churchProfile} onSave={handleSaveChurchInfo} />;
      case 1:
        return <UploadScheduleStep onExtract={handleExtractFromFile} />;
      case 2:
        return <DefineRolesStep onSave={handleDefineRolesAndVolunteers} denomination={churchProfile?.denomination} />;
      case 3:
        return <RecurringServicesStep availableRoles={extractedData.roles} onSave={handleCreateRecurringServices} />;
      case 4:
        return <ReviewStep extractedData={extractedData} setExtractedData={setExtractedData} onRemoveItem={removeItem} />;
      case 5:
        return <AllSetStep onFinish={() => router.push("/dashboard/admin")} />;
      default:
        return null;
    }
  };

  if (isProfileLoading || isChurchLoading || isVolunteersLoading || isRolesLoading) return <p>Loading Onboarding Wizard...</p>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-muted/40 p-4">
      <div className="w-full max-w-5xl">
        <Card>
          <CardHeader>
            <Stepper {...stepper}>
              {steps.map((step, index) => (
                <StepperItem key={step.label} index={index} label={step.label} checkIcon={Check} />
              ))}
            </Stepper>
          </CardHeader>
          <CardContent className="min-h-[400px] flex flex-col justify-center">
            {renderStepContent()}
          </CardContent>
          <WizardFooter
            stepper={stepper}
            isSaving={isSaving}
            onSave={handleConfirmAndSave}
            isLastStep={stepper.activeStep === steps.length - 1}
          />
        </Card>
      </div>
    </div>
  );
}
