import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { RecurringService } from "../types";

export interface AddVolunteerData {
  firstName: string;
  lastName: string;
  email: string;
  sendInvite: boolean;
  makeAdmin: boolean;
  selectedRoleIds: string[];
  selectedServiceIds: string[];
}

interface AddVolunteerDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  roles: { id: string; name: string }[] | undefined;
  recurringServices: RecurringService[];
  onAddVolunteer: (data: AddVolunteerData) => Promise<boolean>;
}

export function AddVolunteerDialog({
  isOpen,
  setIsOpen,
  roles,
  recurringServices,
  onAddVolunteer,
}: AddVolunteerDialogProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [sendInvite, setSendInvite] = useState(false);
  const [makeAdmin, setMakeAdmin] = useState(false);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetDialog = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setSendInvite(false);
    setMakeAdmin(false);
    setSelectedRoleIds([]);
    setSelectedServiceIds([]);
    setIsOpen(false);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const success = await onAddVolunteer({
      firstName,
      lastName,
      email,
      sendInvite,
      makeAdmin,
      selectedRoleIds,
      selectedServiceIds,
    });
    if (success) {
      resetDialog();
    }
    setIsSubmitting(false);
  };

  const handleRoleToggle = (roleId: string, isChecked: boolean) => {
    setSelectedRoleIds((prev) =>
      isChecked ? [...prev, roleId] : prev.filter((id) => id !== roleId)
    );
  };

  const handleServiceToggle = (seriesId: string, isChecked: boolean) => {
    setSelectedServiceIds((prev) =>
      isChecked ? [...prev, seriesId] : prev.filter((id) => id !== seriesId)
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Create a new profile. You can apply initial roles and preferences below.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first-name">First Name</Label>
              <Input
                id="first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last-name">Last Name</Label>
              <Input
                id="last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4 border-b pb-4">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="send-invite"
                checked={sendInvite}
                onCheckedChange={(checked) => setSendInvite(!!checked)}
                className="mt-1"
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="send-invite"
                  className="font-medium cursor-pointer"
                >
                  Send email invitation
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Allow this user to log in and manage their own account.
                </p>
              </div>
            </div>
            {sendInvite && (
              <div className="space-y-2 pl-7 animate-in slide-in-from-top-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                />
              </div>
            )}
            <div className="flex items-start space-x-3">
              <Checkbox
                id="make-admin"
                checked={makeAdmin}
                onCheckedChange={(checked) => setMakeAdmin(!!checked)}
                className="mt-1"
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="make-admin"
                  className="font-medium cursor-pointer"
                >
                  Make this user an Administrator
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Admins can manage events, users, and church settings.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Initial Roles</h4>
              {roles?.length === 0 ? (
                <p className="text-sm text-muted-foreground">No roles configured.</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-2 border rounded-md p-2">
                  {roles?.map((role) => (
                    <div key={role.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`new-role-${role.id}`}
                        checked={selectedRoleIds.includes(role.id)}
                        onCheckedChange={(checked) => handleRoleToggle(role.id, !!checked)}
                      />
                      <Label htmlFor={`new-role-${role.id}`} className="font-normal cursor-pointer text-sm">
                        {role.name}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Serving Preferences</h4>
              {recurringServices?.length === 0 ? (
                <p className="text-sm text-muted-foreground">No services configured.</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-2 border rounded-md p-2">
                  {recurringServices?.map((service) => (
                    <div key={service.seriesId} className="flex items-center space-x-2">
                      <Checkbox
                        id={`new-service-${service.seriesId}`}
                        checked={selectedServiceIds.includes(service.seriesId)}
                        onCheckedChange={(checked) => handleServiceToggle(service.seriesId, !!checked)}
                      />
                      <Label htmlFor={`new-service-${service.seriesId}`} className="font-normal cursor-pointer text-sm">
                        {service.eventName}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={resetDialog}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
