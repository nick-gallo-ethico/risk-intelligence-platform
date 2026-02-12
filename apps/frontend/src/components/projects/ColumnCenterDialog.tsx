"use client";

/**
 * ColumnCenterDialog Component
 *
 * Monday.com-style "Column Center" for managing project columns.
 * Allows users to add, remove, reorder, and configure custom columns.
 * Supports 15 column types organized into 3 categories.
 */

import React, { useState, useMemo, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  CircleDot,
  User,
  Calendar,
  Clock,
  Type,
  AlignLeft,
  Hash,
  ChevronDown,
  CheckSquare,
  Link,
  Tag,
  Paperclip,
  GitBranch,
  ExternalLink,
  TrendingUp,
  GripVertical,
  Settings,
  Trash2,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useCreateColumn,
  useDeleteColumn,
  useReorderColumns,
} from "@/hooks/use-project-detail";
import { ColumnConfigPanel } from "./ColumnConfigPanel";
import type {
  ProjectColumn,
  ProjectColumnType,
  ColumnSettings,
} from "@/types/project";

interface ColumnCenterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  columns: ProjectColumn[];
  onRefresh: () => void;
}

/**
 * Column type definition with metadata.
 */
interface ColumnTypeInfo {
  type: ProjectColumnType;
  name: string;
  description: string;
  icon: React.ElementType;
  category: "essentials" | "more" | "connections";
  defaultSettings?: ColumnSettings;
}

/**
 * All 15 supported column types.
 */
const COLUMN_TYPES: ColumnTypeInfo[] = [
  // Essentials
  {
    type: "STATUS",
    name: "Status",
    description: "Track task progress with colored labels",
    icon: CircleDot,
    category: "essentials",
    defaultSettings: {
      statusLabels: [
        { id: "1", label: "Working on it", color: "#fdab3d" },
        { id: "2", label: "Done", color: "#00c875" },
        { id: "3", label: "Stuck", color: "#e2445c" },
        { id: "4", label: "Not Started", color: "#c4c4c4" },
      ],
    },
  },
  {
    type: "PERSON",
    name: "Person",
    description: "Assign team members to tasks",
    icon: User,
    category: "essentials",
    defaultSettings: { allowMultiple: false },
  },
  {
    type: "DATE",
    name: "Date",
    description: "Set deadlines and milestones",
    icon: Calendar,
    category: "essentials",
    defaultSettings: { dateFormat: "MM/DD/YYYY", includeTime: false },
  },
  {
    type: "TIMELINE",
    name: "Timeline",
    description: "Define date ranges for scheduling",
    icon: Clock,
    category: "essentials",
    defaultSettings: { defaultDurationDays: 7, showOnGantt: true },
  },
  {
    type: "TEXT",
    name: "Text",
    description: "Add short text notes",
    icon: Type,
    category: "essentials",
    defaultSettings: { maxLength: 500, placeholder: "Enter text..." },
  },
  {
    type: "NUMBER",
    name: "Number",
    description: "Enter numeric values with formatting",
    icon: Hash,
    category: "essentials",
    defaultSettings: { decimalPlaces: 0, numberFormat: "comma" },
  },
  // More Columns
  {
    type: "LONG_TEXT",
    name: "Long Text",
    description: "Rich text for detailed descriptions",
    icon: AlignLeft,
    category: "more",
    defaultSettings: { enableRichText: true, maxLength: 5000 },
  },
  {
    type: "DROPDOWN",
    name: "Dropdown",
    description: "Select from predefined options",
    icon: ChevronDown,
    category: "more",
    defaultSettings: {
      options: [
        { id: "1", label: "Option 1", color: "#579bfc" },
        { id: "2", label: "Option 2", color: "#a25ddc" },
        { id: "3", label: "Option 3", color: "#fdab3d" },
      ],
      allowMultipleSelection: false,
    },
  },
  {
    type: "CHECKBOX",
    name: "Checkbox",
    description: "Simple yes/no toggle",
    icon: CheckSquare,
    category: "more",
    defaultSettings: { defaultChecked: false },
  },
  {
    type: "LINK",
    name: "Link",
    description: "Add clickable URLs",
    icon: Link,
    category: "more",
    defaultSettings: { placeholderUrl: "https://" },
  },
  {
    type: "TAGS",
    name: "Tags",
    description: "Add multiple labels to categorize",
    icon: Tag,
    category: "more",
    defaultSettings: {
      availableTags: [
        { id: "1", label: "Important", color: "#e2445c" },
        { id: "2", label: "Urgent", color: "#fdab3d" },
        { id: "3", label: "Review", color: "#579bfc" },
      ],
    },
  },
  {
    type: "FILES",
    name: "Files",
    description: "Attach documents and images",
    icon: Paperclip,
    category: "more",
    defaultSettings: { allowedFileTypes: "all", maxFileSize: 10485760 },
  },
  // Connections
  {
    type: "DEPENDENCY",
    name: "Dependency",
    description: "Link tasks that depend on each other",
    icon: GitBranch,
    category: "connections",
    defaultSettings: {
      allowedDependencyTypes: ["FS", "SS", "FF", "SF"],
      defaultDependencyType: "FS",
    },
  },
  {
    type: "CONNECTED_ENTITY",
    name: "Connected Item",
    description: "Link to cases, investigations, or policies",
    icon: ExternalLink,
    category: "connections",
    defaultSettings: { entityType: "CASE", displayField: "caseNumber" },
  },
  {
    type: "PROGRESS",
    name: "Progress",
    description: "Track completion percentage",
    icon: TrendingUp,
    category: "connections",
    defaultSettings: {
      autoCalculateFromSubtasks: true,
      allowManualOverride: true,
    },
  },
];

/**
 * Category labels for display.
 */
const CATEGORY_LABELS: Record<ColumnTypeInfo["category"], string> = {
  essentials: "Essentials",
  more: "More Columns",
  connections: "Connections",
};

/**
 * ColumnCenterDialog - main dialog component.
 */
export function ColumnCenterDialog({
  open,
  onOpenChange,
  projectId,
  columns,
  onRefresh,
}: ColumnCenterDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    ColumnTypeInfo["category"] | "all"
  >("all");
  const [configColumn, setConfigColumn] = useState<ProjectColumn | null>(null);
  const [deleteColumnId, setDeleteColumnId] = useState<string | null>(null);

  const createColumn = useCreateColumn(projectId);
  const deleteColumn = useDeleteColumn(projectId);
  const reorderColumns = useReorderColumns(projectId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Filter column types by search and category
  const filteredTypes = useMemo(() => {
    let types = COLUMN_TYPES;

    if (selectedCategory !== "all") {
      types = types.filter((t) => t.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      types = types.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query),
      );
    }

    return types;
  }, [selectedCategory, searchQuery]);

  // Group types by category
  const groupedTypes = useMemo(() => {
    const groups: Record<ColumnTypeInfo["category"], ColumnTypeInfo[]> = {
      essentials: [],
      more: [],
      connections: [],
    };
    filteredTypes.forEach((t) => groups[t.category].push(t));
    return groups;
  }, [filteredTypes]);

  // Handle adding a new column
  const handleAddColumn = useCallback(
    async (typeInfo: ColumnTypeInfo) => {
      // Generate default name with counter
      const existingOfType = columns.filter((c) => c.type === typeInfo.type);
      const name =
        existingOfType.length > 0
          ? `${typeInfo.name} ${existingOfType.length + 1}`
          : typeInfo.name;

      const newColumn = await createColumn.mutateAsync({
        name,
        type: typeInfo.type,
        settings: typeInfo.defaultSettings,
      });
      onRefresh();

      // Open config panel for the new column
      if (newColumn) {
        setConfigColumn(newColumn);
      }
    },
    [columns, createColumn, onRefresh],
  );

  // Handle column reorder
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) return;

      const oldIndex = columns.findIndex((c) => c.id === active.id);
      const newIndex = columns.findIndex((c) => c.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = [...columns];
        const [moved] = reordered.splice(oldIndex, 1);
        reordered.splice(newIndex, 0, moved);

        await reorderColumns.mutateAsync({
          orderedIds: reordered.map((c) => c.id),
        });
        onRefresh();
      }
    },
    [columns, reorderColumns, onRefresh],
  );

  // Handle delete confirmation
  const handleConfirmDelete = useCallback(async () => {
    if (deleteColumnId) {
      await deleteColumn.mutateAsync(deleteColumnId);
      onRefresh();
      setDeleteColumnId(null);
    }
  }, [deleteColumnId, deleteColumn, onRefresh]);

  // Get icon for column type
  const getColumnIcon = useCallback((type: ProjectColumnType) => {
    const typeInfo = COLUMN_TYPES.find((t) => t.type === type);
    return typeInfo?.icon ?? CircleDot;
  }, []);

  const sortedColumns = useMemo(
    () => [...columns].sort((a, b) => a.sortOrder - b.sortOrder),
    [columns],
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl h-[80vh] p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle>Column Center</DialogTitle>
          </DialogHeader>

          <div className="flex-1 flex overflow-hidden">
            {/* Left sidebar - Categories */}
            <div className="w-48 border-r bg-gray-50 p-4 space-y-1">
              <button
                onClick={() => setSelectedCategory("all")}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  selectedCategory === "all"
                    ? "bg-white shadow-sm text-foreground"
                    : "text-muted-foreground hover:bg-white/50",
                )}
              >
                All Columns
              </button>
              {(
                Object.keys(CATEGORY_LABELS) as ColumnTypeInfo["category"][]
              ).map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    selectedCategory === category
                      ? "bg-white shadow-sm text-foreground"
                      : "text-muted-foreground hover:bg-white/50",
                  )}
                >
                  {CATEGORY_LABELS[category]}
                </button>
              ))}
            </div>

            {/* Main area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Search bar */}
              <div className="px-6 py-4 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search column types..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-6 space-y-6">
                  {/* Existing columns section */}
                  {columns.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        Current Columns ({columns.length})
                      </h3>
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={sortedColumns.map((c) => c.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-2">
                            {sortedColumns.map((column) => (
                              <SortableColumnItem
                                key={column.id}
                                column={column}
                                icon={getColumnIcon(column.type)}
                                onEdit={() => setConfigColumn(column)}
                                onDelete={() => setDeleteColumnId(column.id)}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    </div>
                  )}

                  {/* Add new column section */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      Add New Column
                    </h3>

                    {/* Grouped column types */}
                    {(
                      Object.keys(groupedTypes) as ColumnTypeInfo["category"][]
                    ).map(
                      (category) =>
                        groupedTypes[category].length > 0 && (
                          <div key={category} className="space-y-3">
                            {selectedCategory === "all" && (
                              <h4 className="text-xs font-medium text-muted-foreground">
                                {CATEGORY_LABELS[category]}
                              </h4>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                              {groupedTypes[category].map((typeInfo) => (
                                <ColumnTypeCard
                                  key={typeInfo.type}
                                  typeInfo={typeInfo}
                                  onClick={() => handleAddColumn(typeInfo)}
                                  isLoading={createColumn.isPending}
                                />
                              ))}
                            </div>
                          </div>
                        ),
                    )}

                    {filteredTypes.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No column types match your search.
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Column config panel */}
      {configColumn && (
        <ColumnConfigPanel
          column={configColumn}
          projectId={projectId}
          onClose={() => setConfigColumn(null)}
          onRefresh={onRefresh}
        />
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deleteColumnId}
        onOpenChange={(open) => !open && setDeleteColumnId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Column?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the column and all its values from every task.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * ColumnTypeCard - card for selecting a column type to add.
 */
interface ColumnTypeCardProps {
  typeInfo: ColumnTypeInfo;
  onClick: () => void;
  isLoading: boolean;
}

function ColumnTypeCard({ typeInfo, onClick, isLoading }: ColumnTypeCardProps) {
  const Icon = typeInfo.icon;

  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg border bg-white text-left",
        "hover:border-primary hover:shadow-sm transition-all",
        "disabled:opacity-50 disabled:cursor-not-allowed",
      )}
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-medium text-sm">{typeInfo.name}</div>
        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
          {typeInfo.description}
        </div>
      </div>
      <Plus className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    </button>
  );
}

/**
 * SortableColumnItem - existing column item with drag handle.
 */
interface SortableColumnItemProps {
  column: ProjectColumn;
  icon: React.ElementType;
  onEdit: () => void;
  onDelete: () => void;
}

function SortableColumnItem({
  column,
  icon: Icon,
  onEdit,
  onDelete,
}: SortableColumnItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border bg-white group",
        isDragging && "shadow-lg opacity-80",
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab hover:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
        <Icon className="h-4 w-4 text-gray-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{column.name}</div>
        <div className="text-xs text-muted-foreground">{column.type}</div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onEdit}
        >
          <Settings className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
