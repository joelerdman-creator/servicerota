import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CalendarOff, ListTodo, UserCog, Users } from "lucide-react";
import Link from "next/link";
import { RecurringService, Volunteer } from "../types";
import { WithId } from "@/firebase";

interface VolunteerManagementSheetProps {
  volunteer: WithId<Volunteer> | null;
  onClose: () => void;
  roles: { id: string; name: string }[] | undefined;
  recurringServices: RecurringService[];
  areRolesLoading: boolean;
  areServicesLoading: boolean;
  onPermissionChange: (volunteerId: string, isAdmin: boolean) => void;
  onRoleToggle: (roleId: string, isChecked: boolean) => void;
  onServicePreferenceToggle: (seriesId: string, isChecked: boolean) => void;
}

export function VolunteerManagementSheet({
  volunteer,
  onClose,
  roles,
  recurringServices,
  areRolesLoading,
  areServicesLoading,
  onPermissionChange,
  onRoleToggle,
  onServicePreferenceToggle,
}: VolunteerManagementSheetProps) {
  if (!volunteer) return null;

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  return (
    <Sheet open={!!volunteer} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-lg w-full flex flex-col">
        <SheetHeader className="pr-12">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage
                src={volunteer.photoURL}
                alt={`${volunteer.firstName} ${volunteer.lastName}`}
              />
              <AvatarFallback className="text-xl">
                {getInitials(volunteer.firstName, volunteer.lastName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <SheetTitle className="text-2xl">
                {volunteer.firstName} {volunteer.lastName}
              </SheetTitle>
              <SheetDescription>{volunteer.email}</SheetDescription>
            </div>
          </div>
        </SheetHeader>
        <div className="py-6 space-y-8 flex-grow overflow-y-auto pr-2">
          <Card className="bg-muted/50 border-brand-accent/20">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center">
                <UserCog className="mr-2 h-5 w-5 text-brand-accent" />
                User Permissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={volunteer.isAdmin ? "admin" : "volunteer"}
                onValueChange={(value) => onPermissionChange(volunteer.id, value === "admin")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a permission level..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="volunteer">Volunteer</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                Administrators can manage settings, events, and other users.
              </p>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h3 className="font-medium text-lg">Available Roles</h3>
            {areRolesLoading && <p>Loading roles...</p>}
            {roles?.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No roles have been created yet. Go to "Settings" to add some.
              </p>
            )}
            <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
              {roles?.map((role) => (
                <div key={role.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`role-${role.id}`}
                    checked={volunteer.availableRoleIds?.includes(role.id)}
                    onCheckedChange={(checked) => onRoleToggle(role.id, !!checked)}
                  />
                  <Label htmlFor={`role-${role.id}`} className="font-normal cursor-pointer">
                    {role.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium text-lg flex items-center gap-2">
              <ListTodo />
              Serving Preferences
            </h3>
            <p className="text-sm text-muted-foreground">
              Select the recurring services this volunteer is available to serve at.
            </p>
            {areServicesLoading && <p>Loading services...</p>}
            <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
              {recurringServices?.map((service) => (
                <div key={service.seriesId} className="flex items-center space-x-2">
                  <Checkbox
                    id={`service-${service.seriesId}`}
                    checked={volunteer.availableRecurringEventSeriesIds?.includes(service.seriesId)}
                    onCheckedChange={(checked) =>
                      onServicePreferenceToggle(service.seriesId, !!checked)
                    }
                  />
                  <Label
                    htmlFor={`service-${service.seriesId}`}
                    className="font-normal cursor-pointer"
                  >
                    {service.eventName}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 border-t pt-6">
            <h3 className="font-medium text-lg">Other Actions</h3>
            <div className="flex flex-col gap-2">
              <Button asChild variant="outline">
                <Link href={`/dashboard/admin/manage/${volunteer.id}/availability`}>
                  <CalendarOff className="mr-2 h-4 w-4" />
                  Manage Availability
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/dashboard/admin/manage/${volunteer.id}/family`}>
                  <Users className="mr-2 h-4 w-4" />
                  Manage Family
                </Link>
              </Button>
            </div>
          </div>
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button>Done</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
