"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { apiClient } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Mail, Copy, Check } from "lucide-react";
import { AssociationCard } from "@/components/ui/association-card";
import { AddPersonModal } from "./add-person-modal";

/**
 * Person-case association label types from backend
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
 * Evidentiary status for REPORTER, SUBJECT, WITNESS associations
 */
type EvidentiaryStatus = "ACTIVE" | "CLEARED" | "SUBSTANTIATED" | "WITHDRAWN";

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
  organizationId: string;
}

/**
 * Person-case association from GET /cases/:id/persons
 */
interface PersonCaseAssociation {
  id: string;
  personId: string;
  caseId: string;
  label: PersonCaseLabel;
  notes: string | null;
  evidentiaryStatus: EvidentiaryStatus | null;
  createdAt: string;
  person: Person;
}

interface ConnectedPeopleCardProps {
  caseId: string;
  organizationId?: string;
}

/**
 * Label configuration for display and styling
 */
const LABEL_CONFIG: Record<
  PersonCaseLabel,
  { display: string; color: string; group: "evidentiary" | "role" }
> = {
  REPORTER: {
    display: "Reporter",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    group: "evidentiary",
  },
  SUBJECT: {
    display: "Subject",
    color: "bg-red-100 text-red-800 border-red-200",
    group: "evidentiary",
  },
  WITNESS: {
    display: "Witness",
    color: "bg-amber-100 text-amber-800 border-amber-200",
    group: "evidentiary",
  },
  ASSIGNED_INVESTIGATOR: {
    display: "Investigator",
    color: "bg-green-100 text-green-800 border-green-200",
    group: "role",
  },
  APPROVER: {
    display: "Approver",
    color: "bg-purple-100 text-purple-800 border-purple-200",
    group: "role",
  },
  STAKEHOLDER: {
    display: "Stakeholder",
    color: "bg-gray-100 text-gray-800 border-gray-200",
    group: "role",
  },
  MANAGER_OF_SUBJECT: {
    display: "Manager",
    color: "bg-indigo-100 text-indigo-800 border-indigo-200",
    group: "role",
  },
  REVIEWER: {
    display: "Reviewer",
    color: "bg-teal-100 text-teal-800 border-teal-200",
    group: "role",
  },
  LEGAL_COUNSEL: {
    display: "Legal Counsel",
    color: "bg-violet-100 text-violet-800 border-violet-200",
    group: "role",
  },
};

/**
 * Evidentiary labels grouped for display order
 */
const EVIDENTIARY_ORDER: PersonCaseLabel[] = ["SUBJECT", "REPORTER", "WITNESS"];

/**
 * Role labels grouped for display order
 */
const ROLE_ORDER: PersonCaseLabel[] = [
  "ASSIGNED_INVESTIGATOR",
  "LEGAL_COUNSEL",
  "APPROVER",
  "REVIEWER",
  "MANAGER_OF_SUBJECT",
  "STAKEHOLDER",
];

/**
 * Group header display names
 */
const GROUP_HEADERS: Record<PersonCaseLabel, string> = {
  SUBJECT: "Subjects",
  REPORTER: "Reporters",
  WITNESS: "Witnesses",
  ASSIGNED_INVESTIGATOR: "Investigators",
  LEGAL_COUNSEL: "Legal Counsel",
  APPROVER: "Approvers",
  REVIEWER: "Reviewers",
  MANAGER_OF_SUBJECT: "Managers",
  STAKEHOLDER: "Stakeholders",
};

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
 * ConnectedPeopleCard displays all persons connected to a case,
 * grouped by their evidentiary label or role.
 * Uses AssociationCard wrapper for HubSpot-style association cards.
 */
export function ConnectedPeopleCard({ caseId }: ConnectedPeopleCardProps) {
  const [associations, setAssociations] = useState<PersonCaseAssociation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addPersonOpen, setAddPersonOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchPeople = useCallback(async () => {
    if (!caseId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await apiClient.get<PersonCaseAssociation[]>(
        `/cases/${caseId}/persons`,
      );
      setAssociations(data);
    } catch (err) {
      console.error("Failed to fetch connected people:", err);
      setError("Failed to load connected people");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchPeople();
  }, [fetchPeople]);

  const handlePersonAdded = () => {
    fetchPeople();
    setAddPersonOpen(false);
  };

  // Filter associations by search query
  const filteredAssociations = useMemo(() => {
    if (!searchQuery.trim()) return associations;
    const query = searchQuery.toLowerCase();
    return associations.filter((assoc) => {
      const name = getFullName(assoc.person).toLowerCase();
      const email = assoc.person.email?.toLowerCase() || "";
      return name.includes(query) || email.includes(query);
    });
  }, [associations, searchQuery]);

  // Group filtered associations by label
  const groupedAssociations = [...EVIDENTIARY_ORDER, ...ROLE_ORDER].reduce(
    (acc, label) => {
      const people = filteredAssociations.filter((a) => a.label === label);
      if (people.length > 0) {
        acc[label] = people;
      }
      return acc;
    },
    {} as Record<PersonCaseLabel, PersonCaseAssociation[]>,
  );

  const totalCount = associations.length;
  const hasGroups = Object.keys(groupedAssociations).length > 0;

  if (loading) {
    return (
      <AssociationCard
        title="Connected People"
        count={0}
        icon={Users}
        collapsible={false}
      >
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </AssociationCard>
    );
  }

  if (error) {
    return (
      <AssociationCard
        title="Connected People"
        count={0}
        icon={Users}
        onAdd={() => setAddPersonOpen(true)}
        onSettings={() => {}}
      >
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={fetchPeople}
          className="mt-2 text-sm text-blue-600 hover:underline"
        >
          Retry
        </button>
      </AssociationCard>
    );
  }

  return (
    <>
      <AssociationCard
        title="Connected People"
        count={totalCount}
        icon={Users}
        onAdd={() => setAddPersonOpen(true)}
        onSettings={() => {}}
        viewAllHref={`/cases/${caseId}/people`}
        viewAllLabel="View all associated People"
        searchThreshold={5}
        searchPlaceholder="Search people..."
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      >
        {!hasGroups ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              {searchQuery ? "No matching people" : "No connected people"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {[...EVIDENTIARY_ORDER, ...ROLE_ORDER].map((label) => {
              const people = groupedAssociations[label];
              if (!people) return null;

              return (
                <div key={label}>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    {GROUP_HEADERS[label]}
                  </h4>
                  <div className="space-y-2">
                    {people.map((assoc) => (
                      <PersonRow
                        key={assoc.id}
                        association={assoc}
                        labelConfig={LABEL_CONFIG[assoc.label]}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </AssociationCard>

      <AddPersonModal
        caseId={caseId}
        open={addPersonOpen}
        onOpenChange={setAddPersonOpen}
        onPersonAdded={handlePersonAdded}
      />
    </>
  );
}

/**
 * Individual person row within a group
 */
function PersonRow({
  association,
  labelConfig,
}: {
  association: PersonCaseAssociation;
  labelConfig: {
    display: string;
    color: string;
    group: "evidentiary" | "role";
  };
}) {
  const { person } = association;
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!person.email) return;

    try {
      await navigator.clipboard.writeText(person.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy email:", err);
    }
  };

  return (
    <div className="flex items-center gap-3 py-1">
      <Avatar className="h-8 w-8">
        <AvatarFallback className="text-xs bg-gray-100">
          {getInitials(person)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">
            {getFullName(person)}
          </span>
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0 ${labelConfig.color}`}
          >
            {labelConfig.display}
          </Badge>
        </div>
        {(person.jobTitle || person.department) && (
          <p className="text-xs text-muted-foreground truncate">
            {[person.jobTitle, person.department].filter(Boolean).join(" - ")}
          </p>
        )}
        {person.email && (
          <div className="flex items-center gap-1 mt-0.5 group">
            <Mail className="h-3 w-3 text-gray-400" />
            <span className="text-xs text-gray-500 truncate">
              {person.email}
            </span>
            <button
              onClick={handleCopyEmail}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-gray-100 rounded"
              title="Copy email"
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3 text-gray-400" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ConnectedPeopleCard;
