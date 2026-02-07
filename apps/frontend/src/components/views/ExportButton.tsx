/**
 * ExportButton Component
 *
 * Dropdown button for exporting data in different formats.
 * Supports Excel (.xlsx) and CSV (.csv) export.
 */
"use client";

import React, { useState } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSavedViewContext } from "@/hooks/views/useSavedViewContext";
import { api } from "@/lib/api";
import { toast } from "sonner";

export function ExportButton() {
  const { config, filters, sortBy, sortOrder, visibleColumns } =
    useSavedViewContext();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: "xlsx" | "csv") => {
    setIsExporting(true);
    try {
      const response = await api.post(
        config.endpoints.export,
        {
          format,
          filters,
          sortBy,
          sortOrder,
          columns: visibleColumns,
        },
        { responseType: "blob" },
      );

      // Create download link
      const blob = new Blob([response.data], {
        type:
          format === "xlsx"
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : "text/csv",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${config.entityName.plural.toLowerCase()}-export.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Export downloaded");
    } catch (error) {
      toast.error("Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting}>
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? "Exporting..." : "Export"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("xlsx")}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export to Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("csv")}>
          <FileText className="h-4 w-4 mr-2" />
          Export to CSV (.csv)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
