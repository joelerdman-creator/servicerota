
"use client";

import * as React from "react";
import { Check, ChevronsUpDown, UserPlus, UserX, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { WithId } from "@/firebase";
import { useDebounce } from "@/hooks/use-debounce";

interface Volunteer {
  id: string;
  firstName: string;
  lastName: string;
}

interface VolunteerComboboxProps {
  allVolunteers: WithId<Volunteer>[] | null; // All possible volunteers passed as a prop
  isLoading: boolean; // Loading state passed from parent
  selectedVolunteerId: string | null;
  onSelect: (volunteer: WithId<Volunteer> | null | undefined) => void;
  unassignLabel?: string;
  oneTimeLabel?: string;
}

export function VolunteerCombobox({
  allVolunteers,
  isLoading,
  selectedVolunteerId,
  onSelect,
  unassignLabel = "Unassign",
  oneTimeLabel,
}: VolunteerComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebounce(search, 300);

  const filteredVolunteers = React.useMemo(() => {
    if (!allVolunteers) return [];
    if (!debouncedSearch) return allVolunteers.slice(0, 50); // Limit initial list size

    const searchTerm = debouncedSearch.toLowerCase();
    return allVolunteers.filter(
      (v) =>
        v.firstName.toLowerCase().includes(searchTerm) ||
        v.lastName.toLowerCase().includes(searchTerm),
    ).slice(0, 50);
  }, [allVolunteers, debouncedSearch]);

  const selectedVolunteer =
    allVolunteers?.find((v) => v.id === selectedVolunteerId) || null;

  const handleSelect = (volunteer: WithId<Volunteer> | null | undefined) => {
    onSelect(volunteer);
    setOpen(false);
  };
  
  const getDisplayName = (v: WithId<Volunteer> | null) => {
    if (!v) return unassignLabel;
    return `${v.firstName} ${v.lastName}`;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span className="truncate">
            {getDisplayName(selectedVolunteer)}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput
            placeholder="Search volunteer..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {isLoading && (
              <div className="p-4 text-center text-sm text-muted-foreground flex items-center justify-center">
                 <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
              </div>
            )}
            {!isLoading && <CommandEmpty>No volunteer found.</CommandEmpty>}

            <CommandGroup>
              <CommandItem onSelect={() => handleSelect(null)}>
                <UserX className="mr-2 h-4 w-4" />
                {unassignLabel}
              </CommandItem>
              {oneTimeLabel && (
                 <CommandItem onSelect={() => handleSelect(undefined)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    {oneTimeLabel}
                </CommandItem>
              )}
            </CommandGroup>

            <CommandGroup heading="Volunteers">
              {filteredVolunteers?.map((volunteer) => (
                <CommandItem
                  key={volunteer.id}
                  value={`${volunteer.firstName} ${volunteer.lastName}`}
                  onSelect={() => handleSelect(volunteer)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedVolunteerId === volunteer.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {getDisplayName(volunteer)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
