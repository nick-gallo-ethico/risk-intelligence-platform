"use client";

/**
 * TicketForm Component
 *
 * Form for submitting support tickets with validation.
 * Uses react-hook-form with zod for validation.
 *
 * Features:
 * - Subject, description, priority, category fields
 * - File attachment support (max 5 files, 10MB each)
 * - Form validation with helpful error messages
 * - Toast notifications on success/error
 */

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Paperclip, X, Loader2 } from "lucide-react";

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
import { helpApi, CreateTicketPayload } from "@/services/help.service";
import { api } from "@/lib/api";

// ============================================================================
// Types
// ============================================================================

type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

interface TicketFormData {
  subject: string;
  description: string;
  priority: TicketPriority;
  category?: string;
}

// ============================================================================
// Schema
// ============================================================================

const ticketSchema = z.object({
  subject: z
    .string()
    .min(5, "Subject must be at least 5 characters")
    .max(200, "Subject cannot exceed 200 characters"),
  description: z
    .string()
    .min(20, "Please provide more detail (at least 20 characters)")
    .max(5000, "Description cannot exceed 5000 characters"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  category: z.string().optional(),
}) satisfies z.ZodType<TicketFormData>;

// ============================================================================
// Constants
// ============================================================================

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
] as const;

const CATEGORY_OPTIONS = [
  { value: "GENERAL", label: "General" },
  { value: "BUG_REPORT", label: "Bug Report" },
  { value: "FEATURE_REQUEST", label: "Feature Request" },
  { value: "ACCOUNT_ISSUE", label: "Account Issue" },
  { value: "BILLING", label: "Billing" },
  { value: "OTHER", label: "Other" },
] as const;

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// ============================================================================
// Helpers
// ============================================================================

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

// ============================================================================
// Component
// ============================================================================

export function TicketForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<File[]>([]);

  const form = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      subject: "",
      description: "",
      priority: "MEDIUM",
      category: undefined,
    },
  });

  // Create ticket mutation
  const createTicketMutation = useMutation({
    mutationFn: async (data: CreateTicketPayload) => {
      return helpApi.createTicket(data);
    },
  });

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    const totalFiles = attachments.length + newFiles.length;

    if (totalFiles > MAX_FILES) {
      toast.error(`You can only attach up to ${MAX_FILES} files`);
      return;
    }

    // Validate file sizes
    const oversizedFiles = newFiles.filter((f) => f.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      toast.error(
        `Some files exceed the ${formatFileSize(MAX_FILE_SIZE)} limit`,
      );
      return;
    }

    setAttachments((prev) => [...prev, ...newFiles]);

    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Remove file from attachments
  const removeFile = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Upload files after ticket creation
  const uploadFiles = async (ticketId: string) => {
    const uploadPromises = attachments.map(async (file) => {
      const formData = new FormData();
      formData.append("file", file);

      return api.post(
        `/storage/upload?entityType=SUPPORT_TICKET&entityId=${ticketId}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
    });

    const results = await Promise.allSettled(uploadPromises);
    const failed = results.filter((r) => r.status === "rejected");

    if (failed.length > 0) {
      toast.warning(`${failed.length} file(s) failed to upload`);
    }
  };

  // Handle form submission
  const handleSubmit = async (data: TicketFormData) => {
    try {
      const ticket = await createTicketMutation.mutateAsync({
        subject: data.subject,
        description: data.description,
        priority: data.priority,
        category: data.category,
      });

      // Upload attachments if any
      if (attachments.length > 0) {
        await uploadFiles(ticket.id);
      }

      toast.success(
        `Ticket ${ticket.ticketNumber} submitted successfully! You'll receive a confirmation email.`,
      );
      router.push("/help/tickets");
    } catch (error) {
      console.error("Failed to submit ticket:", error);
      toast.error("Failed to submit ticket. Please try again.");
    }
  };

  const isSubmitting = createTicketMutation.isPending;

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {/* Subject */}
      <div className="space-y-2">
        <Label htmlFor="subject">
          Subject <span className="text-destructive">*</span>
        </Label>
        <Input
          id="subject"
          {...form.register("subject")}
          placeholder="Brief summary of your issue"
          disabled={isSubmitting}
        />
        {form.formState.errors.subject && (
          <p className="text-sm text-destructive">
            {form.formState.errors.subject.message}
          </p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">
          Description <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="description"
          {...form.register("description")}
          placeholder="Please describe your issue in detail..."
          rows={6}
          disabled={isSubmitting}
        />
        {form.formState.errors.description && (
          <p className="text-sm text-destructive">
            {form.formState.errors.description.message}
          </p>
        )}
      </div>

      {/* Priority and Category - Side by Side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Priority */}
        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Controller
            control={form.control}
            name="priority"
            render={({ field }) => (
              <Select
                value={field.value || undefined}
                onValueChange={field.onChange}
                disabled={isSubmitting}
              >
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {/* Category */}
        <div className="space-y-2">
          <Label htmlFor="category">Category (optional)</Label>
          <Controller
            control={form.control}
            name="category"
            render={({ field }) => (
              <Select
                value={field.value || undefined}
                onValueChange={field.onChange}
                disabled={isSubmitting}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      {/* Attachments */}
      <div className="space-y-2">
        <Label>Attachments (optional)</Label>

        {/* File Drop Zone */}
        <div
          className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.dataTransfer.files) {
              const event = {
                target: { files: e.dataTransfer.files },
              } as React.ChangeEvent<HTMLInputElement>;
              handleFileSelect(event);
            }
          }}
        >
          <Paperclip className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Drag files here or click to upload
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Max {MAX_FILES} files, {formatFileSize(MAX_FILE_SIZE)} each
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.txt"
          className="hidden"
          onChange={handleFileSelect}
          disabled={isSubmitting}
        />

        {/* Selected Files */}
        {attachments.length > 0 && (
          <div className="space-y-2 mt-3">
            {attachments.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Paperclip className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <span className="text-sm truncate">{file.name}</span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    ({formatFileSize(file.size)})
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => removeFile(index)}
                  disabled={isSubmitting}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="pt-4">
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Ticket"
          )}
        </Button>
      </div>
    </form>
  );
}
