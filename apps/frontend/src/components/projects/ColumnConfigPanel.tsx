"use client";

/**
 * ColumnConfigPanel Component
 *
 * Type-specific configuration panel for project columns.
 * Each column type has different settings that can be configured.
 */

import React, { useState, useCallback, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Trash2,
  GripVertical,
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
} from "lucide-react";
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
import { cn } from "@/lib/utils";
import { useUpdateColumn } from "@/hooks/use-project-detail";
import type {
  ProjectColumn,
  ProjectColumnType,
  ColumnSettings,
} from "@/types/project";

interface ColumnConfigPanelProps {
  column: ProjectColumn;
  projectId: string;
  onClose: () => void;
  onRefresh: () => void;
}

/**
 * Color palette for status/dropdown/tag options.
 */
const COLOR_PALETTE = [
  "#00c875", // Green
  "#fdab3d", // Orange
  "#e2445c", // Red
  "#579bfc", // Blue
  "#a25ddc", // Purple
  "#ff642e", // Coral
  "#ffcb00", // Yellow
  "#9cd326", // Lime
  "#00d2d2", // Teal
  "#c4c4c4", // Gray
];

/**
 * Column type icons mapping.
 */
const TYPE_ICONS: Record<ProjectColumnType, React.ElementType> = {
  STATUS: CircleDot,
  PERSON: User,
  DATE: Calendar,
  TIMELINE: Clock,
  TEXT: Type,
  LONG_TEXT: AlignLeft,
  NUMBER: Hash,
  DROPDOWN: ChevronDown,
  CHECKBOX: CheckSquare,
  LINK: Link,
  TAGS: Tag,
  FILES: Paperclip,
  DEPENDENCY: GitBranch,
  CONNECTED_ENTITY: ExternalLink,
  PROGRESS: TrendingUp,
};

/**
 * ColumnConfigPanel - main configuration panel component.
 */
export function ColumnConfigPanel({
  column,
  projectId,
  onClose,
  onRefresh,
}: ColumnConfigPanelProps) {
  const [name, setName] = useState(column.name);
  const [description, setDescription] = useState(
    (column.settings as ColumnSettings)?.placeholder || "",
  );
  const [isRequired, setIsRequired] = useState(column.isRequired);
  const [settings, setSettings] = useState<ColumnSettings>(
    (column.settings as ColumnSettings) || {},
  );
  const [hasChanges, setHasChanges] = useState(false);

  const updateColumn = useUpdateColumn(projectId);

  const Icon = TYPE_ICONS[column.type];

  // Track changes
  useEffect(() => {
    const originalSettings = (column.settings as ColumnSettings) || {};
    const changed =
      name !== column.name ||
      isRequired !== column.isRequired ||
      JSON.stringify(settings) !== JSON.stringify(originalSettings);
    setHasChanges(changed);
  }, [name, isRequired, settings, column]);

  // Handle save
  const handleSave = useCallback(async () => {
    await updateColumn.mutateAsync({
      columnId: column.id,
      dto: {
        name,
        isRequired,
        settings,
      },
    });
    onRefresh();
    onClose();
  }, [column.id, name, isRequired, settings, updateColumn, onRefresh, onClose]);

  // Update settings helper
  const updateSettings = useCallback(
    <K extends keyof ColumnSettings>(key: K, value: ColumnSettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  return (
    <Sheet open={true} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px] p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <SheetTitle>Configure Column</SheetTitle>
              <SheetDescription className="text-xs">
                {column.type} Column
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Common settings for all column types */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="column-name">Column Name</Label>
                <Input
                  id="column-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter column name"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Required Field</Label>
                  <p className="text-xs text-muted-foreground">
                    Tasks must have a value for this column
                  </p>
                </div>
                <Switch checked={isRequired} onCheckedChange={setIsRequired} />
              </div>
            </div>

            <Separator />

            {/* Type-specific settings */}
            {renderTypeSettings(column.type, settings, updateSettings)}
          </div>
        </ScrollArea>

        <SheetFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateColumn.isPending}
          >
            {updateColumn.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Render type-specific settings based on column type.
 */
function renderTypeSettings(
  type: ProjectColumnType,
  settings: ColumnSettings,
  updateSettings: <K extends keyof ColumnSettings>(
    key: K,
    value: ColumnSettings[K],
  ) => void,
) {
  switch (type) {
    case "STATUS":
      return (
        <StatusSettings settings={settings} updateSettings={updateSettings} />
      );

    case "PERSON":
      return (
        <PersonSettings settings={settings} updateSettings={updateSettings} />
      );

    case "DATE":
      return (
        <DateSettings settings={settings} updateSettings={updateSettings} />
      );

    case "TIMELINE":
      return (
        <TimelineSettings settings={settings} updateSettings={updateSettings} />
      );

    case "TEXT":
      return (
        <TextSettings settings={settings} updateSettings={updateSettings} />
      );

    case "LONG_TEXT":
      return (
        <LongTextSettings settings={settings} updateSettings={updateSettings} />
      );

    case "NUMBER":
      return (
        <NumberSettings settings={settings} updateSettings={updateSettings} />
      );

    case "DROPDOWN":
      return (
        <DropdownSettings settings={settings} updateSettings={updateSettings} />
      );

    case "CHECKBOX":
      return (
        <CheckboxSettings settings={settings} updateSettings={updateSettings} />
      );

    case "LINK":
      return (
        <LinkSettings settings={settings} updateSettings={updateSettings} />
      );

    case "TAGS":
      return (
        <TagsSettings settings={settings} updateSettings={updateSettings} />
      );

    case "FILES":
      return (
        <FilesSettings settings={settings} updateSettings={updateSettings} />
      );

    case "DEPENDENCY":
      return (
        <DependencySettings
          settings={settings}
          updateSettings={updateSettings}
        />
      );

    case "CONNECTED_ENTITY":
      return (
        <ConnectedEntitySettings
          settings={settings}
          updateSettings={updateSettings}
        />
      );

    case "PROGRESS":
      return (
        <ProgressSettings settings={settings} updateSettings={updateSettings} />
      );

    default:
      return null;
  }
}

// Type settings props interface
interface TypeSettingsProps {
  settings: ColumnSettings;
  updateSettings: <K extends keyof ColumnSettings>(
    key: K,
    value: ColumnSettings[K],
  ) => void;
}

/**
 * STATUS column settings.
 */
function StatusSettings({ settings, updateSettings }: TypeSettingsProps) {
  const labels = settings.statusLabels || [];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = labels.findIndex((l) => l.id === active.id);
    const newIndex = labels.findIndex((l) => l.id === over.id);

    const reordered = [...labels];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    updateSettings("statusLabels", reordered);
  };

  const addLabel = () => {
    const newLabel = {
      id: crypto.randomUUID(),
      label: `Status ${labels.length + 1}`,
      color: COLOR_PALETTE[labels.length % COLOR_PALETTE.length],
    };
    updateSettings("statusLabels", [...labels, newLabel]);
  };

  const updateLabel = (id: string, field: "label" | "color", value: string) => {
    updateSettings(
      "statusLabels",
      labels.map((l) => (l.id === id ? { ...l, [field]: value } : l)),
    );
  };

  const removeLabel = (id: string) => {
    updateSettings(
      "statusLabels",
      labels.filter((l) => l.id !== id),
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Status Labels</Label>
        <p className="text-xs text-muted-foreground">
          Add status options with colors
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={labels.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {labels.map((label) => (
              <SortableLabelItem
                key={label.id}
                id={label.id}
                label={label.label}
                color={label.color}
                onLabelChange={(value) => updateLabel(label.id, "label", value)}
                onColorChange={(value) => updateLabel(label.id, "color", value)}
                onRemove={() => removeLabel(label.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Button variant="outline" size="sm" onClick={addLabel}>
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        Add Status
      </Button>

      <div className="space-y-2 pt-2">
        <Label>Default Value</Label>
        <Select
          value={settings.defaultStatusId || ""}
          onValueChange={(value) =>
            updateSettings("defaultStatusId", value || undefined)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="No default" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">No default</SelectItem>
            {labels.map((label) => (
              <SelectItem key={label.id} value={label.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: label.color }}
                  />
                  {label.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

/**
 * Sortable label item for status/dropdown/tags.
 */
interface SortableLabelItemProps {
  id: string;
  label: string;
  color: string;
  onLabelChange: (value: string) => void;
  onColorChange: (value: string) => void;
  onRemove: () => void;
}

function SortableLabelItem({
  id,
  label,
  color,
  onLabelChange,
  onColorChange,
  onRemove,
}: SortableLabelItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-2 rounded-md border bg-white",
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

      <div className="relative">
        <input
          type="color"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
        <div
          className="w-6 h-6 rounded-md border cursor-pointer"
          style={{ backgroundColor: color }}
        />
      </div>

      <Input
        value={label}
        onChange={(e) => onLabelChange(e.target.value)}
        className="flex-1 h-8"
        placeholder="Label"
      />

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-red-600"
        onClick={onRemove}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

/**
 * PERSON column settings.
 */
function PersonSettings({ settings, updateSettings }: TypeSettingsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Allow Multiple People</Label>
          <p className="text-xs text-muted-foreground">
            Enable selection of multiple assignees
          </p>
        </div>
        <Switch
          checked={settings.allowMultiple || false}
          onCheckedChange={(checked) =>
            updateSettings("allowMultiple", checked)
          }
        />
      </div>
    </div>
  );
}

/**
 * DATE column settings.
 */
function DateSettings({ settings, updateSettings }: TypeSettingsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Date Format</Label>
        <Select
          value={settings.dateFormat || "MM/DD/YYYY"}
          onValueChange={(value) =>
            updateSettings(
              "dateFormat",
              value as "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD",
            )
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
            <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
            <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Include Time</Label>
          <p className="text-xs text-muted-foreground">
            Show time alongside date
          </p>
        </div>
        <Switch
          checked={settings.includeTime || false}
          onCheckedChange={(checked) => updateSettings("includeTime", checked)}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Default to Today</Label>
          <p className="text-xs text-muted-foreground">
            Auto-fill with current date
          </p>
        </div>
        <Switch
          checked={settings.defaultToToday || false}
          onCheckedChange={(checked) =>
            updateSettings("defaultToToday", checked)
          }
        />
      </div>
    </div>
  );
}

/**
 * TIMELINE column settings.
 */
function TimelineSettings({ settings, updateSettings }: TypeSettingsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Default Duration (Days)</Label>
        <Input
          type="number"
          min={1}
          value={settings.defaultDurationDays || 7}
          onChange={(e) =>
            updateSettings("defaultDurationDays", parseInt(e.target.value) || 7)
          }
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Show on Gantt Chart</Label>
          <p className="text-xs text-muted-foreground">
            Display timeline in Gantt view
          </p>
        </div>
        <Switch
          checked={settings.showOnGantt !== false}
          onCheckedChange={(checked) => updateSettings("showOnGantt", checked)}
        />
      </div>
    </div>
  );
}

/**
 * TEXT column settings.
 */
function TextSettings({ settings, updateSettings }: TypeSettingsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Max Length</Label>
        <Input
          type="number"
          min={1}
          max={1000}
          value={settings.maxLength || 500}
          onChange={(e) =>
            updateSettings("maxLength", parseInt(e.target.value) || 500)
          }
        />
      </div>

      <div className="space-y-2">
        <Label>Placeholder Text</Label>
        <Input
          value={settings.placeholder || ""}
          onChange={(e) => updateSettings("placeholder", e.target.value)}
          placeholder="Enter placeholder..."
        />
      </div>
    </div>
  );
}

/**
 * LONG_TEXT column settings.
 */
function LongTextSettings({ settings, updateSettings }: TypeSettingsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Enable Rich Text</Label>
          <p className="text-xs text-muted-foreground">
            Allow formatting, links, and lists
          </p>
        </div>
        <Switch
          checked={settings.enableRichText !== false}
          onCheckedChange={(checked) =>
            updateSettings("enableRichText", checked)
          }
        />
      </div>

      <div className="space-y-2">
        <Label>Max Length</Label>
        <Input
          type="number"
          min={100}
          max={10000}
          value={settings.maxLength || 5000}
          onChange={(e) =>
            updateSettings("maxLength", parseInt(e.target.value) || 5000)
          }
        />
      </div>
    </div>
  );
}

/**
 * NUMBER column settings.
 */
function NumberSettings({ settings, updateSettings }: TypeSettingsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Unit Label</Label>
        <Input
          value={settings.unitLabel || ""}
          onChange={(e) => updateSettings("unitLabel", e.target.value)}
          placeholder="e.g., $, %, hrs"
        />
      </div>

      <div className="space-y-2">
        <Label>Unit Position</Label>
        <Select
          value={settings.unitPosition || "prefix"}
          onValueChange={(value) =>
            updateSettings("unitPosition", value as "prefix" | "suffix")
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="prefix">Prefix ($100)</SelectItem>
            <SelectItem value="suffix">Suffix (100%)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Decimal Places</Label>
        <Select
          value={String(settings.decimalPlaces ?? 0)}
          onValueChange={(value) =>
            updateSettings("decimalPlaces", parseInt(value) as 0 | 1 | 2)
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">0 (whole numbers)</SelectItem>
            <SelectItem value="1">1 (0.0)</SelectItem>
            <SelectItem value="2">2 (0.00)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Number Format</Label>
        <Select
          value={settings.numberFormat || "comma"}
          onValueChange={(value) =>
            updateSettings("numberFormat", value as "comma" | "none")
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="comma">Comma separated (1,000)</SelectItem>
            <SelectItem value="none">No formatting (1000)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

/**
 * DROPDOWN column settings.
 */
function DropdownSettings({ settings, updateSettings }: TypeSettingsProps) {
  const options = settings.options || [];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = options.findIndex((o) => o.id === active.id);
    const newIndex = options.findIndex((o) => o.id === over.id);

    const reordered = [...options];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    updateSettings("options", reordered);
  };

  const addOption = () => {
    const newOption = {
      id: crypto.randomUUID(),
      label: `Option ${options.length + 1}`,
      color: COLOR_PALETTE[options.length % COLOR_PALETTE.length],
    };
    updateSettings("options", [...options, newOption]);
  };

  const updateOption = (
    id: string,
    field: "label" | "color",
    value: string,
  ) => {
    updateSettings(
      "options",
      options.map((o) => (o.id === id ? { ...o, [field]: value } : o)),
    );
  };

  const removeOption = (id: string) => {
    updateSettings(
      "options",
      options.filter((o) => o.id !== id),
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Dropdown Options</Label>
        <p className="text-xs text-muted-foreground">
          Add options for the dropdown
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={options.map((o) => o.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {options.map((option) => (
              <SortableLabelItem
                key={option.id}
                id={option.id}
                label={option.label}
                color={option.color}
                onLabelChange={(value) =>
                  updateOption(option.id, "label", value)
                }
                onColorChange={(value) =>
                  updateOption(option.id, "color", value)
                }
                onRemove={() => removeOption(option.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Button variant="outline" size="sm" onClick={addOption}>
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        Add Option
      </Button>

      <div className="flex items-center justify-between pt-2">
        <div className="space-y-0.5">
          <Label>Allow Multiple Selection</Label>
          <p className="text-xs text-muted-foreground">
            Enable selecting more than one option
          </p>
        </div>
        <Switch
          checked={settings.allowMultipleSelection || false}
          onCheckedChange={(checked) =>
            updateSettings("allowMultipleSelection", checked)
          }
        />
      </div>

      <div className="space-y-2">
        <Label>Default Value</Label>
        <Select
          value={settings.defaultOptionId || ""}
          onValueChange={(value) =>
            updateSettings("defaultOptionId", value || undefined)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="No default" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">No default</SelectItem>
            {options.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: option.color }}
                  />
                  {option.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

/**
 * CHECKBOX column settings.
 */
function CheckboxSettings({ settings, updateSettings }: TypeSettingsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Default Checked</Label>
          <p className="text-xs text-muted-foreground">
            Start with checkbox checked
          </p>
        </div>
        <Switch
          checked={settings.defaultChecked || false}
          onCheckedChange={(checked) =>
            updateSettings("defaultChecked", checked)
          }
        />
      </div>
    </div>
  );
}

/**
 * LINK column settings.
 */
function LinkSettings({ settings, updateSettings }: TypeSettingsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Placeholder URL</Label>
        <Input
          value={settings.placeholderUrl || ""}
          onChange={(e) => updateSettings("placeholderUrl", e.target.value)}
          placeholder="https://..."
        />
      </div>
    </div>
  );
}

/**
 * TAGS column settings.
 */
function TagsSettings({ settings, updateSettings }: TypeSettingsProps) {
  const tags = settings.availableTags || [];

  const addTag = () => {
    const newTag = {
      id: crypto.randomUUID(),
      label: `Tag ${tags.length + 1}`,
      color: COLOR_PALETTE[tags.length % COLOR_PALETTE.length],
    };
    updateSettings("availableTags", [...tags, newTag]);
  };

  const updateTag = (id: string, field: "label" | "color", value: string) => {
    updateSettings(
      "availableTags",
      tags.map((t) => (t.id === id ? { ...t, [field]: value } : t)),
    );
  };

  const removeTag = (id: string) => {
    updateSettings(
      "availableTags",
      tags.filter((t) => t.id !== id),
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Available Tags</Label>
        <p className="text-xs text-muted-foreground">
          Define tags users can choose from (or type to create new)
        </p>
      </div>

      <div className="space-y-2">
        {tags.map((tag) => (
          <div
            key={tag.id}
            className="flex items-center gap-2 p-2 rounded-md border bg-white"
          >
            <div className="relative">
              <input
                type="color"
                value={tag.color}
                onChange={(e) => updateTag(tag.id, "color", e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div
                className="w-6 h-6 rounded-md border cursor-pointer"
                style={{ backgroundColor: tag.color }}
              />
            </div>
            <Input
              value={tag.label}
              onChange={(e) => updateTag(tag.id, "label", e.target.value)}
              className="flex-1 h-8"
              placeholder="Tag name"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-red-600"
              onClick={() => removeTag(tag.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={addTag}>
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        Add Tag
      </Button>
    </div>
  );
}

/**
 * FILES column settings.
 */
function FilesSettings({ settings, updateSettings }: TypeSettingsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Allowed File Types</Label>
        <Select
          value={
            Array.isArray(settings.allowedFileTypes)
              ? "custom"
              : settings.allowedFileTypes || "all"
          }
          onValueChange={(value) =>
            updateSettings(
              "allowedFileTypes",
              value as "all" | "images" | "documents",
            )
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All file types</SelectItem>
            <SelectItem value="images">Images only</SelectItem>
            <SelectItem value="documents">Documents only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Max File Size (MB)</Label>
        <Input
          type="number"
          min={1}
          max={100}
          value={(settings.maxFileSize || 10485760) / 1048576}
          onChange={(e) =>
            updateSettings(
              "maxFileSize",
              (parseInt(e.target.value) || 10) * 1048576,
            )
          }
        />
      </div>
    </div>
  );
}

/**
 * DEPENDENCY column settings.
 */
function DependencySettings({ settings, updateSettings }: TypeSettingsProps) {
  const dependencyTypes: Array<"FS" | "SS" | "FF" | "SF"> = [
    "FS",
    "SS",
    "FF",
    "SF",
  ];
  const typeLabels: Record<string, string> = {
    FS: "Finish to Start",
    SS: "Start to Start",
    FF: "Finish to Finish",
    SF: "Start to Finish",
  };

  const allowed = settings.allowedDependencyTypes || dependencyTypes;

  const toggleType = (type: "FS" | "SS" | "FF" | "SF") => {
    if (allowed.includes(type)) {
      updateSettings(
        "allowedDependencyTypes",
        allowed.filter((t) => t !== type),
      );
    } else {
      updateSettings("allowedDependencyTypes", [...allowed, type]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Allowed Dependency Types</Label>
        <p className="text-xs text-muted-foreground">
          Select which dependency relationships are available
        </p>
      </div>

      <div className="space-y-2">
        {dependencyTypes.map((type) => (
          <div key={type} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm">{type}</span>
              <span className="text-sm text-muted-foreground">
                {typeLabels[type]}
              </span>
            </div>
            <Switch
              checked={allowed.includes(type)}
              onCheckedChange={() => toggleType(type)}
            />
          </div>
        ))}
      </div>

      <div className="space-y-2 pt-2">
        <Label>Default Type</Label>
        <Select
          value={settings.defaultDependencyType || "FS"}
          onValueChange={(value) =>
            updateSettings(
              "defaultDependencyType",
              value as "FS" | "SS" | "FF" | "SF",
            )
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {allowed.map((type) => (
              <SelectItem key={type} value={type}>
                {type} - {typeLabels[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

/**
 * CONNECTED_ENTITY column settings.
 */
function ConnectedEntitySettings({
  settings,
  updateSettings,
}: TypeSettingsProps) {
  const entityTypes = ["CASE", "INVESTIGATION", "CAMPAIGN", "POLICY", "PERSON"];

  const displayFields: Record<string, string[]> = {
    CASE: ["caseNumber", "title", "status"],
    INVESTIGATION: ["investigationNumber", "title", "status"],
    CAMPAIGN: ["name", "status", "type"],
    POLICY: ["policyNumber", "title", "version"],
    PERSON: ["name", "email", "department"],
  };

  const currentEntityType = settings.entityType || "CASE";
  const availableFields = displayFields[currentEntityType] || [];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Entity Type</Label>
        <Select
          value={currentEntityType}
          onValueChange={(value) =>
            updateSettings(
              "entityType",
              value as
                | "CASE"
                | "INVESTIGATION"
                | "CAMPAIGN"
                | "POLICY"
                | "PERSON",
            )
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {entityTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type.charAt(0) + type.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Display Field</Label>
        <p className="text-xs text-muted-foreground">
          Which field to show from the connected entity
        </p>
        <Select
          value={settings.displayField || availableFields[0]}
          onValueChange={(value) => updateSettings("displayField", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableFields.map((field) => (
              <SelectItem key={field} value={field}>
                {field}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

/**
 * PROGRESS column settings.
 */
function ProgressSettings({ settings, updateSettings }: TypeSettingsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Auto-calculate from Subtasks</Label>
          <p className="text-xs text-muted-foreground">
            Derive progress from completed subtasks
          </p>
        </div>
        <Switch
          checked={settings.autoCalculateFromSubtasks !== false}
          onCheckedChange={(checked) =>
            updateSettings("autoCalculateFromSubtasks", checked)
          }
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Allow Manual Override</Label>
          <p className="text-xs text-muted-foreground">
            Allow users to set progress manually
          </p>
        </div>
        <Switch
          checked={settings.allowManualOverride !== false}
          onCheckedChange={(checked) =>
            updateSettings("allowManualOverride", checked)
          }
        />
      </div>
    </div>
  );
}
