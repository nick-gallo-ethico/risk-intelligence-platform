"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, User, Plus, Check } from "lucide-react";

/**
 * Person-case association label types
 */
type PersonCaseLabel =
  | "REPORTER"
  | "SUBJECT"
  | "WITNESS"
  | "ASSIGNED_INVESTIGATOR"
  | "APPROVER"
  | "STAKEHOLDER"
  | "MANAGER_OF_SUBJECT"
  | "REVIEWER"
  | "LEGAL_COUNSEL";

/**
 * Person entity from backend
 */
interface Person {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  department: string | null;
}

interface AddPersonModalProps {
  caseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPersonAdded: () => void;
}

/**
 * Evidentiary labels for the select dropdown
 */
const EVIDENTIARY_LABELS: { value: PersonCaseLabel; label: string }[] = [
  { value: "REPORTER", label: "Reporter" },
  { value: "SUBJECT", label: "Subject" },
  { value: "WITNESS", label: "Witness" },
];

/**
 * Role labels for the select dropdown
 */
const ROLE_LABELS: { value: PersonCaseLabel; label: string }[] = [
  { value: "ASSIGNED_INVESTIGATOR", label: "Investigator" },
  { value: "LEGAL_COUNSEL", label: "Legal Counsel" },
  { value: "APPROVER", label: "Approver" },
  { value: "REVIEWER", label: "Reviewer" },
  { value: "MANAGER_OF_SUBJECT", label: "Manager of Subject" },
  { value: "STAKEHOLDER", label: "Stakeholder" },
];

/**
 * Get initials from person name
 */
function getInitials(person: Person): string {
  const first = person.firstName?.[0] || "";
  const last = person.lastName?.[0] || "";
  return (first + last).toUpperCase() || "?";
}

/**
 * Get full name from person
 */
function getFullName(person: Person): string {
  const parts = [person.firstName, person.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "Unknown Person";
}

/**
 * AddPersonModal allows adding a person to a case with an evidentiary label.
 * Supports both searching existing persons and creating new ones.
 */
export function AddPersonModal({
  caseId,
  open,
  onOpenChange,
  onPersonAdded,
}: AddPersonModalProps) {
  // Mode: 'search' or 'create'
  const [mode, setMode] = useState<"search" | "create">("search");

  // Search mode state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Person[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

  // Create mode state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Shared state
  const [label, setLabel] = useState<PersonCaseLabel | "">("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setMode("search");
      setSearchQuery("");
      setSearchResults([]);
      setSelectedPerson(null);
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setLabel("");
      setNotes("");
      setError(null);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (mode !== "search" || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await apiClient.get<{
          data: Person[];
          total: number;
        }>("/persons", {
          params: { search: searchQuery, limit: 10 },
        });
        setSearchResults(response.data);
      } catch (err) {
        console.error("Failed to search persons:", err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, mode]);

  const handleSelectPerson = useCallback((person: Person) => {
    setSelectedPerson(person);
    setSearchQuery("");
    setSearchResults([]);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!label) {
      setError("Please select a role/label");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let personId: string;

      if (mode === "create") {
        // Validate create mode
        if (!firstName.trim() && !lastName.trim()) {
          setError("Please enter at least a first or last name");
          setSubmitting(false);
          return;
        }

        // Create the person first
        const newPerson = await apiClient.post<Person>("/persons", {
          firstName: firstName.trim() || null,
          lastName: lastName.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          type: "EXTERNAL_CONTACT",
          source: "MANUAL_ENTRY",
        });
        personId = newPerson.id;
      } else {
        // Search mode - must have selected person
        if (!selectedPerson) {
          setError("Please select a person");
          setSubmitting(false);
          return;
        }
        personId = selectedPerson.id;
      }

      // Create the association
      await apiClient.post(`/cases/${caseId}/persons`, {
        personId,
        label,
        notes: notes.trim() || undefined,
      });

      onPersonAdded();
    } catch (err) {
      console.error("Failed to add person to case:", err);
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as {
          response?: { data?: { message?: string } };
        };
        setError(axiosError.response?.data?.message || "Failed to add person");
      } else {
        setError("Failed to add person");
      }
    } finally {
      setSubmitting(false);
    }
  }, [
    mode,
    selectedPerson,
    firstName,
    lastName,
    email,
    phone,
    label,
    notes,
    caseId,
    onPersonAdded,
  ]);

  const canSubmit =
    label &&
    ((mode === "search" && selectedPerson) ||
      (mode === "create" && (firstName.trim() || lastName.trim())));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Person to Case</DialogTitle>
          <DialogDescription>
            Search for an existing person or add a new one.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {mode === "search" ? (
            <>
              {/* Search mode */}
              {selectedPerson ? (
                <div className="border rounded-md p-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {getInitials(selectedPerson)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {getFullName(selectedPerson)}
                        </p>
                        {selectedPerson.email && (
                          <p className="text-sm text-muted-foreground">
                            {selectedPerson.email}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedPerson(null)}
                    >
                      Change
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="search">Search People</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  {/* Search results */}
                  {searching && (
                    <div className="space-y-2 py-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-3 p-2">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <div className="space-y-1">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {!searching && searchQuery.length >= 2 && (
                    <div className="border rounded-md max-h-48 overflow-y-auto">
                      {searchResults.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No people found
                        </div>
                      ) : (
                        searchResults.map((person) => (
                          <button
                            key={person.id}
                            type="button"
                            onClick={() => handleSelectPerson(person)}
                            className="w-full flex items-center gap-3 p-2 hover:bg-muted/50 transition-colors text-left"
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {getInitials(person)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {getFullName(person)}
                              </p>
                              {person.email && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {person.email}
                                </p>
                              )}
                            </div>
                            <Check className="h-4 w-4 opacity-0" />
                          </button>
                        ))
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setMode("create")}
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Plus className="h-3 w-3" />
                    Or add a new person
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Create mode */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email (optional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john.doe@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <button
                type="button"
                onClick={() => setMode("search")}
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <User className="h-3 w-3" />
                Or search existing people
              </button>
            </>
          )}

          {/* Label selection - shown in both modes */}
          <div className="space-y-2 pt-2 border-t">
            <Label htmlFor="label">Role / Label *</Label>
            <Select
              value={label}
              onValueChange={(v) => setLabel(v as PersonCaseLabel)}
            >
              <SelectTrigger id="label">
                <SelectValue placeholder="Select role..." />
              </SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  Evidentiary
                </div>
                {EVIDENTIARY_LABELS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-1">
                  Roles
                </div>
                {ROLE_LABELS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any relevant notes about this person's involvement..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting ? "Adding..." : "Add Person"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AddPersonModal;
