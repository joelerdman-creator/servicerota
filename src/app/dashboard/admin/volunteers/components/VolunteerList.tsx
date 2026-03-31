import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Shield, CheckCircle, XCircle } from "lucide-react";
import { cn, getServiceColor } from "@/lib/utils";
import { Volunteer, RecurringService } from "../types";
import { WithId } from "@/firebase";

interface VolunteerListProps {
  volunteers: WithId<Volunteer>[];
  recurringServices: RecurringService[];
  onApprove: (volunteerId: string) => void;
  onDeny: (volunteerId: string) => void;
  onSelect: (volunteer: WithId<Volunteer>) => void;
}

export function VolunteerList({
  volunteers,
  recurringServices,
  onApprove,
  onDeny,
  onSelect,
}: VolunteerListProps) {
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  const getStatusBadge = (status?: "active" | "pending_approval" | "pending_invitation") => {
    switch (status) {
      case "pending_approval":
        return <Badge variant="secondary">Pending Approval</Badge>;
      case "pending_invitation":
        return <Badge variant="outline">Invitation Sent</Badge>;
      default:
        return null;
    }
  };

  if (volunteers.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No users found for your search.
      </div>
    );
  }

  return (
    <div className="border rounded-md">
      {volunteers.map((volunteer) => (
        <div
          key={volunteer.id}
          className="flex items-center justify-between p-3 border-b last:border-b-0 "
        >
          <div className="flex items-center gap-4 flex-1">
            <Avatar>
              <AvatarImage
                src={volunteer.photoURL}
                alt={`${volunteer.firstName} ${volunteer.lastName}`}
              />
              <AvatarFallback>
                {getInitials(volunteer.firstName, volunteer.lastName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold flex items-center gap-2 flex-wrap">
                {volunteer.firstName} {volunteer.lastName}
                {volunteer.isAdmin && (
                  <Badge>
                    <Shield className="h-3 w-3 mr-1" />
                    Admin
                  </Badge>
                )}
                {volunteer.isManagedByAdmin && !volunteer.isAdmin && (
                  <Badge variant="outline">Admin-Managed</Badge>
                )}
                {volunteer.availableRecurringEventSeriesIds?.map((seriesId) => {
                  const service = recurringServices.find((s) => s.seriesId === seriesId);
                  if (!service) return null;
                  return (
                    <Badge
                      key={seriesId}
                      variant="secondary"
                      className={cn(getServiceColor(seriesId), "border-none font-normal")}
                    >
                      {service.eventName}
                    </Badge>
                  );
                })}
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                {volunteer.email || "No email provided"}
                {getStatusBadge(volunteer.status)}
              </p>
            </div>
          </div>

          {volunteer.status === "pending_approval" ||
          volunteer.status === "pending_invitation" ? (
            <div className="flex items-center gap-2">
              {volunteer.status === "pending_approval" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8"
                  onClick={() => onApprove(volunteer.id)}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-destructive hover:text-destructive"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    {volunteer.status === "pending_approval" ? "Deny" : "Revoke"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the pending request for{" "}
                      {volunteer.firstName}. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDeny(volunteer.id)}>
                      Confirm
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => onSelect(volunteer)}>
                Manage
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
