"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Archive,
  Loader2,
  Type,
  Hash,
  Calendar,
  CalendarClock,
  ChevronDown,
  CheckSquare,
  ToggleLeft,
  LinkIcon,
  Mail,
  Phone,
  MoreHorizontal,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { customPropertiesApi } from "@/services/custom-properties";
import {
  type CustomProperty,
  type CustomPropertyEntityType,
  type PropertyDataType,
  type CreateCustomPropertyDto,
  type UpdateCustomPropertyDto,
  type SelectOption,
  ENTITY_TYPE_LABELS,
  DATA_TYPE_LABELS,
  DATA_TYPES,
  generatePropertyKey,
} from "@/types/custom-property";

/**
 * Icon components for data types.
 */
const DATA_TYPE_ICON_MAP: Record<PropertyDataType, React.ReactNode> = {
  TEXT: <Type className="h-4 w-4" />,
  NUMBER: <Hash className="h-4 w-4" />,
  DATE: <Calendar className="h-4 w-4" />,
  DATETIME: <CalendarClock className="h-4 w-4" />,
  SELECT: <ChevronDown className="h-4 w-4" />,
  MULTI_SELECT: <CheckSquare className="h-4 w-4" />,
  BOOLEAN: <ToggleLeft className="h-4 w-4" />,
  URL: <LinkIcon className="h-4 w-4" />,
  EMAIL: <Mail className="h-4 w-4" />,
  PHONE: <Phone className="h-4 w-4" />,
};

/**
 * Custom Properties Management Page
 *
 * HubSpot-style property management with:
 * - Entity type tabs (Cases, Investigations, People, RIUs)
 * - Property list grouped by groupName
 * - Create/Edit dialogs with type-dependent fields
 * - Archive (soft delete) confirmation
 */
function PropertiesPageContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // Get initial tab from URL query param
  const initialEntity =
    (searchParams?.get("entity") as CustomPropertyEntityType) || "CASE";
  const [activeTab, setActiveTab] =
    useState<CustomPropertyEntityType>(initialEntity);

  // Dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<CustomProperty | null>(
    null,
  );
  const [archiveProperty, setArchiveProperty] = useState<CustomProperty | null>(
    null,
  );

  // Fetch all properties (we filter client-side by entity type for tabs)
  const { data: properties, isLoading } = useQuery({
    queryKey: ["custom-properties", true],
    queryFn: () => customPropertiesApi.listAll(true),
  });

  // Filter properties by current tab
  const filteredProperties = (properties || []).filter(
    (p) => p.entityType === activeTab,
  );

  // Group properties by groupName
  const groupedProperties = filteredProperties.reduce(
    (acc, prop) => {
      const group = prop.groupName || "General";
      if (!acc[group]) acc[group] = [];
      acc[group].push(prop);
      return acc;
    },
    {} as Record<string, CustomProperty[]>,
  );

  // Sort groups alphabetically with "General" first
  const sortedGroups = Object.keys(groupedProperties).sort((a, b) => {
    if (a === "General") return -1;
    if (b === "General") return 1;
    return a.localeCompare(b);
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (dto: CreateCustomPropertyDto) =>
      customPropertiesApi.create(dto),
    onSuccess: () => {
      toast.success("Property created successfully");
      queryClient.invalidateQueries({ queryKey: ["custom-properties"] });
      setIsCreateOpen(false);
    },
    onError: () => {
      toast.error("Failed to create property");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateCustomPropertyDto }) =>
      customPropertiesApi.update(id, dto),
    onSuccess: () => {
      toast.success("Property updated successfully");
      queryClient.invalidateQueries({ queryKey: ["custom-properties"] });
      setEditingProperty(null);
    },
    onError: () => {
      toast.error("Failed to update property");
    },
  });

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: (id: string) => customPropertiesApi.remove(id),
    onSuccess: () => {
      toast.success("Property archived successfully");
      queryClient.invalidateQueries({ queryKey: ["custom-properties"] });
      setArchiveProperty(null);
    },
    onError: () => {
      toast.error("Failed to archive property");
    },
  });

  // Count properties per entity type for tab badges
  const getCountForEntity = (entityType: CustomPropertyEntityType) =>
    (properties || []).filter((p) => p.entityType === entityType && p.isActive)
      .length;

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
        <span className="text-foreground">Properties</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Custom Properties</h1>
          <p className="text-muted-foreground">
            Define custom fields for your data objects
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Property
        </Button>
      </div>

      {/* Entity Type Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as CustomPropertyEntityType)}
      >
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          {(
            [
              "CASE",
              "INVESTIGATION",
              "PERSON",
              "RIU",
            ] as CustomPropertyEntityType[]
          ).map((entityType) => (
            <TabsTrigger
              key={entityType}
              value={entityType}
              className="flex items-center gap-2"
            >
              {ENTITY_TYPE_LABELS[entityType]}
              {!isLoading && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {getCountForEntity(entityType)}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Tab Content */}
        {(
          [
            "CASE",
            "INVESTIGATION",
            "PERSON",
            "RIU",
          ] as CustomPropertyEntityType[]
        ).map((entityType) => (
          <TabsContent key={entityType} value={entityType} className="mt-6">
            {isLoading ? (
              <PropertiesTableSkeleton />
            ) : filteredProperties.length === 0 ? (
              <EmptyState
                entityType={entityType}
                onCreateClick={() => setIsCreateOpen(true)}
              />
            ) : (
              <div className="space-y-6">
                {sortedGroups.map((groupName) => (
                  <div key={groupName}>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">
                      {groupName}
                    </h3>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="w-[30%]">Name</TableHead>
                            <TableHead className="w-[20%]">Key</TableHead>
                            <TableHead className="w-[15%]">Type</TableHead>
                            <TableHead className="w-[10%] text-center">
                              Required
                            </TableHead>
                            <TableHead className="w-[10%] text-center">
                              Status
                            </TableHead>
                            <TableHead className="w-[15%] text-right">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {groupedProperties[groupName]
                            .sort((a, b) => a.displayOrder - b.displayOrder)
                            .map((property) => (
                              <TableRow
                                key={property.id}
                                className={
                                  !property.isActive ? "opacity-50" : ""
                                }
                              >
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">
                                      {DATA_TYPE_ICON_MAP[property.dataType]}
                                    </span>
                                    <div>
                                      <p className="font-medium">
                                        {property.name}
                                      </p>
                                      {property.description && (
                                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                          {property.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                    {property.key}
                                  </code>
                                </TableCell>
                                <TableCell>
                                  {DATA_TYPE_LABELS[property.dataType]}
                                </TableCell>
                                <TableCell className="text-center">
                                  {property.isRequired ? (
                                    <Badge
                                      variant="default"
                                      className="bg-amber-100 text-amber-800"
                                    >
                                      Required
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground">
                                      -
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  {property.isActive ? (
                                    <Badge
                                      variant="outline"
                                      className="bg-green-50 text-green-700 border-green-200"
                                    >
                                      Active
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="bg-gray-50 text-gray-500 border-gray-200"
                                    >
                                      Archived
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={() =>
                                          setEditingProperty(property)
                                        }
                                      >
                                        <Pencil className="h-4 w-4 mr-2" />
                                        Edit
                                      </DropdownMenuItem>
                                      {property.isActive && (
                                        <DropdownMenuItem
                                          onClick={() =>
                                            setArchiveProperty(property)
                                          }
                                          className="text-destructive"
                                        >
                                          <Archive className="h-4 w-4 mr-2" />
                                          Archive
                                        </DropdownMenuItem>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Create Property Dialog */}
      <PropertyFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        entityType={activeTab}
        onSubmit={(dto) =>
          createMutation.mutate(dto as CreateCustomPropertyDto)
        }
        isLoading={createMutation.isPending}
      />

      {/* Edit Property Dialog */}
      <PropertyFormDialog
        open={!!editingProperty}
        onOpenChange={(open) => !open && setEditingProperty(null)}
        property={editingProperty || undefined}
        entityType={activeTab}
        onSubmit={(dto) =>
          editingProperty &&
          updateMutation.mutate({
            id: editingProperty.id,
            dto: dto as UpdateCustomPropertyDto,
          })
        }
        isLoading={updateMutation.isPending}
      />

      {/* Archive Confirmation Dialog */}
      <AlertDialog
        open={!!archiveProperty}
        onOpenChange={(open) => !open && setArchiveProperty(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Property</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive &quot;{archiveProperty?.name}
              &quot;? The property will be hidden from forms but existing data
              will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                archiveProperty && archiveMutation.mutate(archiveProperty.id)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {archiveMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Archive className="h-4 w-4 mr-2" />
              )}
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/**
 * Empty state when no properties exist for an entity type.
 */
function EmptyState({
  entityType,
  onCreateClick,
}: {
  entityType: CustomPropertyEntityType;
  onCreateClick: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Type className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-2">No custom properties</h3>
      <p className="text-muted-foreground mb-6 max-w-sm">
        Create custom properties to capture additional information about your{" "}
        {ENTITY_TYPE_LABELS[entityType].toLowerCase()}.
      </p>
      <Button onClick={onCreateClick}>
        <Plus className="h-4 w-4 mr-2" />
        Create Property
      </Button>
    </div>
  );
}

/**
 * Property Create/Edit Form Dialog
 */
interface PropertyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property?: CustomProperty;
  entityType: CustomPropertyEntityType;
  onSubmit: (dto: CreateCustomPropertyDto | UpdateCustomPropertyDto) => void;
  isLoading: boolean;
}

function PropertyFormDialog({
  open,
  onOpenChange,
  property,
  entityType,
  onSubmit,
  isLoading,
}: PropertyFormDialogProps) {
  const isEditing = !!property;

  // Form state
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [dataType, setDataType] = useState<PropertyDataType>("TEXT");
  const [isRequired, setIsRequired] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [options, setOptions] = useState<SelectOption[]>([]);
  const [defaultValue, setDefaultValue] = useState<string>("");

  // Auto-generate key from name
  const [keyEdited, setKeyEdited] = useState(false);
  useEffect(() => {
    if (!keyEdited && name && !isEditing) {
      setKey(generatePropertyKey(name));
    }
  }, [name, keyEdited, isEditing]);

  // Reset form when dialog opens/closes or property changes
  useEffect(() => {
    if (open) {
      if (property) {
        setName(property.name);
        setKey(property.key);
        setDescription(property.description || "");
        setDataType(property.dataType);
        setIsRequired(property.isRequired);
        setGroupName(property.groupName || "");
        setOptions(property.options || []);
        setDefaultValue(
          property.defaultValue !== undefined
            ? String(property.defaultValue)
            : "",
        );
        setKeyEdited(true);
      } else {
        setName("");
        setKey("");
        setDescription("");
        setDataType("TEXT");
        setIsRequired(false);
        setGroupName("");
        setOptions([]);
        setDefaultValue("");
        setKeyEdited(false);
      }
    }
  }, [open, property]);

  // Add/remove options for SELECT/MULTI_SELECT
  const addOption = () => {
    setOptions([...options, { value: "", label: "" }]);
  };

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (
    index: number,
    field: "value" | "label",
    value: string,
  ) => {
    const updated = [...options];
    updated[index] = { ...updated[index], [field]: value };
    setOptions(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditing) {
      const dto: UpdateCustomPropertyDto = {
        name,
        description: description || undefined,
        isRequired,
        groupName: groupName || undefined,
        options:
          dataType === "SELECT" || dataType === "MULTI_SELECT"
            ? options.filter((o) => o.value && o.label)
            : undefined,
        defaultValue: defaultValue || undefined,
      };
      onSubmit(dto);
    } else {
      const dto: CreateCustomPropertyDto = {
        entityType,
        name,
        key,
        description: description || undefined,
        dataType,
        isRequired,
        groupName: groupName || undefined,
        options:
          dataType === "SELECT" || dataType === "MULTI_SELECT"
            ? options.filter((o) => o.value && o.label)
            : undefined,
        defaultValue: defaultValue || undefined,
      };
      onSubmit(dto);
    }
  };

  const showOptions = dataType === "SELECT" || dataType === "MULTI_SELECT";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Property" : "Create Property"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the property settings."
              : `Add a new custom property for ${ENTITY_TYPE_LABELS[entityType].toLowerCase()}.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Department Code"
              required
            />
          </div>

          {/* Key (only editable on create) */}
          <div className="space-y-2">
            <Label htmlFor="key">Key *</Label>
            <Input
              id="key"
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                setKeyEdited(true);
              }}
              placeholder="e.g., department_code"
              disabled={isEditing}
              required
            />
            <p className="text-xs text-muted-foreground">
              Unique identifier used in the API. Cannot be changed after
              creation.
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this property..."
              rows={2}
            />
          </div>

          {/* Data Type (only selectable on create) */}
          <div className="space-y-2">
            <Label htmlFor="dataType">Data Type *</Label>
            <Select
              value={dataType}
              onValueChange={(v) => setDataType(v as PropertyDataType)}
              disabled={isEditing}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select data type" />
              </SelectTrigger>
              <SelectContent>
                {DATA_TYPES.map((dt) => (
                  <SelectItem key={dt} value={dt}>
                    <div className="flex items-center gap-2">
                      {DATA_TYPE_ICON_MAP[dt]}
                      {DATA_TYPE_LABELS[dt]}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Options for SELECT/MULTI_SELECT */}
          {showOptions && (
            <div className="space-y-2">
              <Label>Options</Label>
              <div className="space-y-2">
                {options.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Value"
                      value={option.value}
                      onChange={(e) =>
                        updateOption(index, "value", e.target.value)
                      }
                      className="flex-1"
                    />
                    <Input
                      placeholder="Label"
                      value={option.label}
                      onChange={(e) =>
                        updateOption(index, "label", e.target.value)
                      }
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOption(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Option
                </Button>
              </div>
            </div>
          )}

          {/* Group Name */}
          <div className="space-y-2">
            <Label htmlFor="groupName">Group</Label>
            <Input
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g., Contact Info, Custom Fields"
            />
            <p className="text-xs text-muted-foreground">
              Properties with the same group name will be displayed together.
            </p>
          </div>

          {/* Default Value */}
          <div className="space-y-2">
            <Label htmlFor="defaultValue">Default Value</Label>
            {dataType === "BOOLEAN" ? (
              <Select value={defaultValue} onValueChange={setDefaultValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Select default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No default</SelectItem>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            ) : showOptions ? (
              <Select value={defaultValue} onValueChange={setDefaultValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Select default option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No default</SelectItem>
                  {options
                    .filter((o) => o.value)
                    .map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="defaultValue"
                value={defaultValue}
                onChange={(e) => setDefaultValue(e.target.value)}
                placeholder="Default value for new records"
                type={dataType === "NUMBER" ? "number" : "text"}
              />
            )}
          </div>

          {/* Required Toggle */}
          <div className="flex items-center justify-between py-2 border-t">
            <div>
              <p className="font-medium">Required Field</p>
              <p className="text-sm text-muted-foreground">
                Users must provide a value for this property
              </p>
            </div>
            <Switch checked={isRequired} onCheckedChange={setIsRequired} />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name || !key}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? "Save Changes" : "Create Property"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Loading skeleton for properties table.
 */
function PropertiesTableSkeleton() {
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[30%]">Name</TableHead>
            <TableHead className="w-[20%]">Key</TableHead>
            <TableHead className="w-[15%]">Type</TableHead>
            <TableHead className="w-[10%] text-center">Required</TableHead>
            <TableHead className="w-[10%] text-center">Status</TableHead>
            <TableHead className="w-[15%] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[1, 2, 3, 4, 5].map((i) => (
            <TableRow key={i}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <div>
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24 mt-1" />
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell className="text-center">
                <Skeleton className="h-5 w-16 mx-auto" />
              </TableCell>
              <TableCell className="text-center">
                <Skeleton className="h-5 w-14 mx-auto" />
              </TableCell>
              <TableCell className="text-right">
                <Skeleton className="h-8 w-8 ml-auto" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * Properties page with Suspense wrapper for searchParams.
 */
export default function PropertiesPage() {
  return (
    <Suspense fallback={<PropertiesPageSkeleton />}>
      <PropertiesPageContent />
    </Suspense>
  );
}

/**
 * Full page loading skeleton.
 */
function PropertiesPageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-5 w-32" />
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      <Skeleton className="h-10 w-[500px]" />
      <PropertiesTableSkeleton />
    </div>
  );
}
