"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Briefcase,
  Search as SearchIcon,
  Users,
  FileText,
  Megaphone,
  ClipboardList,
  GitBranch,
  AlertTriangle,
  Scroll,
  ExternalLink,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Platform object type definition.
 */
interface PlatformObject {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  entityType?: string; // For linking to properties page
  propertiesLink?: string;
  color: string;
}

/**
 * Platform objects data.
 */
const PLATFORM_OBJECTS: PlatformObject[] = [
  {
    id: "cases",
    name: "Cases",
    description:
      "Work containers for investigating reports and issues. Cases are created from RIUs and track investigation progress through resolution.",
    icon: <Briefcase className="h-8 w-8" />,
    entityType: "CASE",
    propertiesLink: "/settings/properties?entity=CASE",
    color: "bg-blue-100 text-blue-700",
  },
  {
    id: "investigations",
    name: "Investigations",
    description:
      "In-depth review processes within cases. Investigations include interviews, evidence collection, findings, and remediation plans.",
    icon: <SearchIcon className="h-8 w-8" />,
    entityType: "INVESTIGATION",
    propertiesLink: "/settings/properties?entity=INVESTIGATION",
    color: "bg-purple-100 text-purple-700",
  },
  {
    id: "persons",
    name: "People",
    description:
      "Individuals involved in cases and investigations. Track subjects, witnesses, and reporters across your compliance program.",
    icon: <Users className="h-8 w-8" />,
    entityType: "PERSON",
    propertiesLink: "/settings/properties?entity=PERSON",
    color: "bg-green-100 text-green-700",
  },
  {
    id: "rius",
    name: "RIUs",
    description:
      "Risk Intelligence Units are immutable intake records. Reports, disclosures, and submissions are captured as RIUs before becoming cases.",
    icon: <AlertTriangle className="h-8 w-8" />,
    entityType: "RIU",
    propertiesLink: "/settings/properties?entity=RIU",
    color: "bg-amber-100 text-amber-700",
  },
  {
    id: "policies",
    name: "Policies",
    description:
      "Organizational policies with versioning, approval workflows, and attestation tracking. Manage the complete policy lifecycle.",
    icon: <Scroll className="h-8 w-8" />,
    color: "bg-indigo-100 text-indigo-700",
  },
  {
    id: "campaigns",
    name: "Campaigns",
    description:
      "Outbound disclosure, attestation, and survey campaigns. Track employee responses and automate follow-up reminders.",
    icon: <Megaphone className="h-8 w-8" />,
    color: "bg-pink-100 text-pink-700",
  },
  {
    id: "disclosures",
    name: "Disclosures",
    description:
      "Conflict of interest, gift, and entertainment disclosures. Configure forms and review submitted declarations.",
    icon: <ClipboardList className="h-8 w-8" />,
    color: "bg-teal-100 text-teal-700",
  },
  {
    id: "workflows",
    name: "Workflows",
    description:
      "Automated workflow templates for case routing, approvals, and escalations. Build visual workflow diagrams with conditional logic.",
    icon: <GitBranch className="h-8 w-8" />,
    color: "bg-orange-100 text-orange-700",
  },
];

/**
 * Objects Browser Page
 *
 * Platform data model overview showing all major object types
 * with descriptions and links to their custom properties.
 */
export default function ObjectsPage() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/settings"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Settings
        </Link>
        <span>/</span>
        <span className="text-foreground">Objects</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Data Objects</h1>
        <p className="text-muted-foreground">
          Overview of the core data types in your compliance platform
        </p>
      </div>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-primary/10 p-3">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-medium mb-1">About Data Objects</h3>
              <p className="text-sm text-muted-foreground">
                Objects are the core entities in your compliance platform. Each
                object type can have custom properties to capture additional
                information specific to your organization. Click &quot;View
                Properties&quot; to manage the custom fields for each object
                type.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Objects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PLATFORM_OBJECTS.map((obj) => (
          <Card key={obj.id} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${obj.color}`}>{obj.icon}</div>
                <CardTitle className="text-lg">{obj.name}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <CardDescription className="flex-1 line-clamp-3 mb-4">
                {obj.description}
              </CardDescription>
              {obj.propertiesLink && (
                <Button variant="outline" size="sm" asChild className="w-full">
                  <Link href={obj.propertiesLink}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Properties
                  </Link>
                </Button>
              )}
              {!obj.propertiesLink && (
                <Button variant="outline" size="sm" disabled className="w-full">
                  Properties Not Configurable
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Additional Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Object Relationships</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Objects in the platform are connected through relationships:
          </p>
          <ul className="text-sm text-muted-foreground space-y-2 ml-4">
            <li>
              <span className="font-medium text-foreground">RIUs</span> are
              linked to{" "}
              <span className="font-medium text-foreground">Cases</span> through
              associations (a case can have multiple RIUs)
            </li>
            <li>
              <span className="font-medium text-foreground">Cases</span> contain{" "}
              <span className="font-medium text-foreground">
                Investigations
              </span>{" "}
              and reference{" "}
              <span className="font-medium text-foreground">People</span>
            </li>
            <li>
              <span className="font-medium text-foreground">Campaigns</span>{" "}
              generate <span className="font-medium text-foreground">RIUs</span>{" "}
              when employees submit disclosures or attestations
            </li>
            <li>
              <span className="font-medium text-foreground">Workflows</span> can
              be attached to any object type for automated routing and approvals
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
