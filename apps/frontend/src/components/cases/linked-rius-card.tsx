"use client";

import { Phone, FileInput, Star } from "lucide-react";
import { AssociationCard } from "@/components/ui/association-card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type { RiuAssociation } from "@/types/case";

interface LinkedRiusCardProps {
  riuAssociations: RiuAssociation[];
}

const RIU_TYPE_ICONS: Record<string, typeof Phone> = {
  HOTLINE_REPORT: Phone,
  WEB_FORM_SUBMISSION: FileInput,
};

const RIU_TYPE_LABELS: Record<string, string> = {
  HOTLINE_REPORT: "Hotline Report",
  WEB_FORM_SUBMISSION: "Web Form",
  DISCLOSURE_RESPONSE: "Disclosure",
  ATTESTATION_RESPONSE: "Attestation",
  CHATBOT_TRANSCRIPT: "Chatbot",
};

export function LinkedRiusCard({ riuAssociations }: LinkedRiusCardProps) {
  return (
    <AssociationCard
      title="Intake Records"
      count={riuAssociations.length}
      icon={FileInput}
      onAdd={() => {
        /* TODO: Link RIU modal */
      }}
      onSettings={() => {}}
      viewAllHref="#" // RIUs are shown inline, no separate page
      viewAllLabel="View all associated Records"
    >
      {riuAssociations.length === 0 ? (
        <p className="text-sm text-gray-500 py-2">No intake records linked</p>
      ) : (
        <div className="space-y-2">
          {riuAssociations.map((assoc) => {
            const Icon = RIU_TYPE_ICONS[assoc.riu.type] || FileInput;
            const isPrimary = assoc.associationType === "PRIMARY";

            return (
              <Link
                key={assoc.id}
                href={`/rius/${assoc.riuId}`}
                className={`block p-2 rounded-md hover:bg-gray-50 border ${
                  isPrimary ? "border-blue-200 bg-blue-50/50" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium">
                      {assoc.riu.referenceNumber}
                    </span>
                    {isPrimary && (
                      <Star className="h-3 w-3 text-blue-500 fill-blue-500" />
                    )}
                  </div>
                  <Badge
                    variant={isPrimary ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {assoc.associationType}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {RIU_TYPE_LABELS[assoc.riu.type] || assoc.riu.type} ·{" "}
                  {new Date(assoc.riu.createdAt).toLocaleDateString()}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </AssociationCard>
  );
}
