/**
 * Create New Report Page
 *
 * Renders the report designer wizard. Supports pre-populating from a template
 * via the ?template=id URL parameter.
 */
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ReportDesignerWizard } from "@/components/reports/ReportDesignerWizard";
import type { SavedReport } from "@/types/reports";

function ReportDesignerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams?.get("template") || undefined;

  const handleSave = (report: SavedReport) => {
    // Navigate to the report detail/run page
    router.push(`/reports/${report.id}`);
  };

  const handleCancel = () => {
    router.push("/reports");
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Create New Report</h1>
        <p className="text-muted-foreground mt-1">
          Build a custom report by selecting data, fields, and visualization
        </p>
      </div>

      <div className="bg-background border rounded-lg p-6">
        <ReportDesignerWizard
          templateId={templateId}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}

export default function NewReportPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto py-6 px-4 max-w-6xl">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold">Create New Report</h1>
            <p className="text-muted-foreground mt-1">Loading...</p>
          </div>
        </div>
      }
    >
      <ReportDesignerContent />
    </Suspense>
  );
}
