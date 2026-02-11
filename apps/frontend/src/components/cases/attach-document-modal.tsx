"use client";

import { useState, useEffect, useRef, ChangeEvent } from "react";
import { Loader2, Upload, FileText, Paperclip } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { apiClient } from "@/lib/api";

interface AttachDocumentModalProps {
  caseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDocumentAttached: () => void;
}

type DocumentType = "EVIDENCE" | "REPORT" | "CORRESPONDENCE" | "OTHER";

interface AttachDocumentFormData {
  title: string;
  description?: string;
  documentType: DocumentType;
  fileName: string;
  fileSize?: number;
}

/**
 * AttachDocumentModal - Modal for attaching/logging documents to a case
 *
 * For MVP, this logs document metadata as an activity entry. Full file upload
 * integration with Azure Blob is deferred to a future phase.
 *
 * The document attachment will appear in the case's activity timeline.
 */
export function AttachDocumentModal({
  caseId,
  open,
  onOpenChange,
  onDocumentAttached,
}: AttachDocumentModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [documentType, setDocumentType] = useState<DocumentType>("EVIDENCE");
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState<number | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      setDocumentType("EVIDENCE");
      setFileName("");
      setFileSize(undefined);
      setError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [open]);

  const isValid = title.trim().length >= 2 && fileName.trim().length > 0;

  const getDocumentTypeLabel = (type: DocumentType): string => {
    switch (type) {
      case "EVIDENCE":
        return "Evidence";
      case "REPORT":
        return "Report";
      case "CORRESPONDENCE":
        return "Correspondence";
      case "OTHER":
        return "Other";
      default:
        return type;
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setFileSize(file.size);
      // Auto-fill title from filename (without extension) if empty
      if (!title) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
        setTitle(nameWithoutExt);
      }
    }
  };

  const handleSubmit = async () => {
    if (!isValid) return;

    setIsSubmitting(true);
    setError(null);

    const typeLabel = getDocumentTypeLabel(documentType);
    const sizeLabel = formatFileSize(fileSize);
    const actionDescription = `Attached document: ${title.trim()} (${typeLabel})${sizeLabel ? ` - ${sizeLabel}` : ""}`;

    try {
      // Log the document attachment as an activity entry
      await apiClient.post(`/cases/${caseId}/activity`, {
        action: "document_attached",
        description: `Attached: ${title.trim()}`,
        actionDescription: actionDescription,
        metadata: {
          title: title.trim(),
          description: description.trim() || undefined,
          documentType,
          fileName: fileName.trim(),
          fileSize,
        },
      });

      onDocumentAttached();
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to attach document:", err);
      // Fallback: try via documents endpoint if it exists
      try {
        await apiClient.post(`/cases/${caseId}/documents`, {
          title: title.trim(),
          description: description.trim() || undefined,
          documentType,
          fileName: fileName.trim(),
          fileSize,
        });
        onDocumentAttached();
        onOpenChange(false);
      } catch (fallbackErr) {
        console.error("Fallback also failed:", fallbackErr);
        setError("Failed to attach document. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Paperclip className="h-5 w-5" />
            Attach Document
          </DialogTitle>
          <DialogDescription>
            Attach a document to this case. For MVP, this logs document metadata
            to the activity timeline. Full upload integration coming soon.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* File Selection */}
          <div className="grid gap-2">
            <Label htmlFor="file">
              Select File <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                ref={fileInputRef}
                id="file"
                type="file"
                onChange={handleFileChange}
                className="flex-1"
              />
            </div>
            {fileName && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>{fileName}</span>
                {fileSize && (
                  <span className="text-xs">({formatFileSize(fileSize)})</span>
                )}
              </div>
            )}
          </div>

          {/* Document Title */}
          <div className="grid gap-2">
            <Label htmlFor="title">
              Document Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Enter document title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            {title.length > 0 && title.trim().length < 2 && (
              <p className="text-xs text-gray-500">
                Title must be at least 2 characters
              </p>
            )}
          </div>

          {/* Document Type */}
          <div className="grid gap-2">
            <Label htmlFor="documentType">Document Type</Label>
            <Select
              value={documentType}
              onValueChange={(value) => setDocumentType(value as DocumentType)}
            >
              <SelectTrigger id="documentType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EVIDENCE">Evidence</SelectItem>
                <SelectItem value="REPORT">Report</SelectItem>
                <SelectItem value="CORRESPONDENCE">Correspondence</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the document content..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Upload className="mr-2 h-4 w-4" />
            Attach Document
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
