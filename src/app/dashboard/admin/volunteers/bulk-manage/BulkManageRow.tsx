import React, { memo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TableRow, TableCell } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Volunteer, RecurringService } from "../types";
import { WithId } from "@/firebase";
import { cn, getServiceColor } from "@/lib/utils";

interface HouseholdInfo {
  id: string;
  familyId: string | null;
  lastName: string;
}

export interface StagedChanges {
  availableRoleIds?: string[];
  availableRecurringEventSeriesIds?: string[];
  familyId?: string | null;
  isHouseholdManager?: boolean;
}

interface BulkManageRowProps {
  volunteer: WithId<Volunteer>;
  changes?: StagedChanges;
  roles: WithId<{ name: string }>[] | undefined;
  recurringServices: RecurringService[];
  households: HouseholdInfo[];
  isSelected: boolean;
  onSelectToggle: (id: string, isChecked: boolean) => void;
  onRoleToggle: (volunteerId: string, roleId: string, isChecked: boolean) => void;
  onFamilyChange: (volunteerId: string, familyId: string) => void;
}

function getInitials(firstName: string = "", lastName: string = "") {
  return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
}

function BulkManageRowComponent({
  volunteer,
  changes,
  roles,
  recurringServices,
  households,
  isSelected,
  onSelectToggle,
  onRoleToggle,
  onFamilyChange,
}: BulkManageRowProps) {
  const currentRoles = changes?.availableRoleIds ?? volunteer.availableRoleIds ?? [];
  const activeSeriesIds = changes?.availableRecurringEventSeriesIds ?? volunteer.availableRecurringEventSeriesIds;

  return (
    <TableRow>
      <TableCell className="text-center">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelectToggle(volunteer.id, !!checked)}
        />
      </TableCell>
      <TableCell className="font-medium sticky left-0 bg-background z-10 border-r">
        <div className="flex items-start gap-3">
          <Avatar className="h-8 w-8 mt-1">
            <AvatarImage src={volunteer.photoURL} />
            <AvatarFallback>{getInitials(volunteer.firstName, volunteer.lastName)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1 w-full max-w-[180px]">
            <span className="truncate" title={`${volunteer.firstName} ${volunteer.lastName}`}>
              {volunteer.firstName} {volunteer.lastName}
            </span>
            <div className="flex flex-wrap gap-1">
              {activeSeriesIds?.map((seriesId) => {
                const service = recurringServices?.find((s) => s.seriesId === seriesId);
                if (!service) return null;
                return (
                  <Badge
                    key={seriesId}
                    variant="secondary"
                    className={cn(
                      getServiceColor(seriesId),
                      "border-none font-normal text-[0.65rem] px-1.5 py-0 h-4 truncate"
                    )}
                    title={service.eventName}
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
        <Select
          value={changes?.familyId ?? volunteer.familyId ?? "none"}
          onValueChange={(familyId) => onFamilyChange(volunteer.id, familyId)}
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
        <TableCell key={role.id} className="text-center bg-background">
          <Checkbox
            checked={currentRoles.includes(role.id)}
            onCheckedChange={(checked) => onRoleToggle(volunteer.id, role.id, !!checked)}
          />
        </TableCell>
      ))}
    </TableRow>
  );
}

// React.memo ensures the row ONLY re-renders if its specific props change.
export const BulkManageRow = memo(BulkManageRowComponent);
