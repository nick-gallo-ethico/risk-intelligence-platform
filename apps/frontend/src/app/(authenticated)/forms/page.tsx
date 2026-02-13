"use client";

/**
 * Forms Hub Page
 *
 * Central page for managing all form definitions.
 * Provides type filtering, quick links to specialized hubs,
 * and access to create new forms.
 */

import React, { Suspense, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  FileText,
  ClipboardList,
  ArrowRight,
  FormInput,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormsList } from "@/components/forms/forms-list";
import { useForms } from "@/hooks/use-forms";
import type { FormType } from "@/lib/forms-api";

/**
 * Quick links to specialized form hubs.
 */
const QUICK_LINKS = [
  {
    id: "disclosures",
    title: "Disclosures",
    description: "COI, gifts, outside activities",
    href: "/disclosures",
    icon: FileText,
  },
  {
    id: "intake-forms",
    title: "Intake Forms",
    description: "Ethics portal submissions",
    href: "/intake-forms",
    icon: ClipboardList,
  },
];

function FormsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse type filter from URL
  const typeFilter = useMemo(() => {
    const type = searchParams?.get("type") as FormType | null;
    return type || undefined;
  }, [searchParams]);

  // Fetch forms with current filter
  const { data: formsData, isLoading } = useForms({ type: typeFilter });

  // Handle type filter change
  const handleTypeFilter = useCallback(
    (type?: FormType) => {
      const params = new URLSearchParams(searchParams?.toString() || "");
      if (type) {
        params.set("type", type);
      } else {
        params.delete("type");
      }
      const queryString = params.toString();
      router.push(`/forms${queryString ? `?${queryString}` : ""}`, {
        scroll: false,
      });
    },
    [router, searchParams],
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Forms</h1>
          <p className="text-muted-foreground mt-1">
            Manage form templates for campaigns and submissions
          </p>
        </div>
        <Button onClick={() => router.push("/forms/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Create Form
        </Button>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {QUICK_LINKS.map((link) => (
          <Card
            key={link.id}
            className="hover:border-primary/50 transition-colors cursor-pointer"
          >
            <Link href={link.href}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <link.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{link.title}</CardTitle>
                      <CardDescription>{link.description}</CardDescription>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
            </Link>
          </Card>
        ))}
      </div>

      {/* Forms List */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <FormInput className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Form Templates</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <FormsList
            forms={formsData?.data || []}
            isLoading={isLoading}
            onTypeFilter={handleTypeFilter}
            activeType={typeFilter}
          />
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Forms Hub Page
 * Route: /forms
 */
export default function FormsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">Loading forms...</div>
        </div>
      }
    >
      <FormsContent />
    </Suspense>
  );
}
