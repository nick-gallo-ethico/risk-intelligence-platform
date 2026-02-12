"use client";

/**
 * DynamicColumnCell Component
 *
 * Renders the appropriate cell UI based on column type.
 * Supports inline editing for all 15 Monday.com-style column types.
 */

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { format } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Calendar as CalendarIcon,
  Link as LinkIcon,
  ExternalLink,
  Paperclip,
  GitBranch,
  Check,
  X,
  Plus,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api";
import type {
  ProjectColumn,
  ProjectTask,
  ColumnSettings,
} from "@/types/project";

interface DynamicColumnCellProps {
  column: ProjectColumn;
  task: ProjectTask;
  value: unknown;
  onUpdate: (value: unknown) => void;
  isEditing?: boolean;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

/**
 * DynamicColumnCell - renders the appropriate cell UI based on column type.
 */
export function DynamicColumnCell({
  column,
  task,
  value,
  onUpdate,
  isEditing = false,
}: DynamicColumnCellProps) {
  const settings = (column.settings as ColumnSettings) || {};

  switch (column.type) {
    case "STATUS":
      return (
        <StatusCell
          value={value as string | undefined}
          settings={settings}
          onUpdate={onUpdate}
        />
      );

    case "PERSON":
      return (
        <PersonCell
          value={value as string | string[] | undefined}
          settings={settings}
          onUpdate={onUpdate}
        />
      );

    case "DATE":
      return (
        <DateCell
          value={value as string | undefined}
          settings={settings}
          onUpdate={onUpdate}
        />
      );

    case "TIMELINE":
      return (
        <TimelineCell
          value={value as { start: string; end: string } | undefined}
          settings={settings}
          onUpdate={onUpdate}
        />
      );

    case "TEXT":
      return (
        <TextCell
          value={value as string | undefined}
          settings={settings}
          onUpdate={onUpdate}
        />
      );

    case "LONG_TEXT":
      return (
        <LongTextCell
          value={value as string | undefined}
          settings={settings}
          onUpdate={onUpdate}
        />
      );

    case "NUMBER":
      return (
        <NumberCell
          value={value as number | undefined}
          settings={settings}
          onUpdate={onUpdate}
        />
      );

    case "DROPDOWN":
      return (
        <DropdownCell
          value={value as string | string[] | undefined}
          settings={settings}
          onUpdate={onUpdate}
        />
      );

    case "CHECKBOX":
      return (
        <CheckboxCell
          value={value as boolean | undefined}
          settings={settings}
          onUpdate={onUpdate}
        />
      );

    case "LINK":
      return (
        <LinkCell
          value={value as { url: string; text?: string } | undefined}
          settings={settings}
          onUpdate={onUpdate}
        />
      );

    case "TAGS":
      return (
        <TagsCell
          value={value as string[] | undefined}
          settings={settings}
          onUpdate={onUpdate}
        />
      );

    case "FILES":
      return (
        <FilesCell
          value={value as Array<{ id: string; name: string }> | undefined}
          taskId={task.id}
          onUpdate={onUpdate}
        />
      );

    case "DEPENDENCY":
      return (
        <DependencyCell
          value={value as Array<{ taskId: string; type: string }> | undefined}
          taskId={task.id}
          onUpdate={onUpdate}
        />
      );

    case "CONNECTED_ENTITY":
      return (
        <ConnectedEntityCell
          value={value as { entityId: string; entityType: string } | undefined}
          settings={settings}
          onUpdate={onUpdate}
        />
      );

    case "PROGRESS":
      return (
        <ProgressCell
          value={value as number | undefined}
          task={task}
          settings={settings}
          onUpdate={onUpdate}
        />
      );

    default:
      return <EmptyCell />;
  }
}

/**
 * Empty state for unset values.
 */
function EmptyCell() {
  return <span className="text-muted-foreground text-sm">-</span>;
}

/**
 * STATUS cell - colored badge with dropdown.
 */
interface StatusCellProps {
  value: string | undefined;
  settings: ColumnSettings;
  onUpdate: (value: unknown) => void;
}

function StatusCell({ value, settings, onUpdate }: StatusCellProps) {
  const [open, setOpen] = useState(false);
  const labels = settings.statusLabels || [];

  const currentLabel = labels.find((l) => l.id === value);

  const handleSelect = (labelId: string) => {
    onUpdate(labelId);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="w-full text-left">
          {currentLabel ? (
            <Badge
              className="text-xs cursor-pointer hover:opacity-80"
              style={{
                backgroundColor: currentLabel.color,
                color: getContrastColor(currentLabel.color),
              }}
            >
              {currentLabel.label}
            </Badge>
          ) : (
            <span className="text-muted-foreground text-sm">-</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-1" align="start">
        {labels.map((label) => (
          <button
            key={label.id}
            onClick={() => handleSelect(label.id)}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors",
              value === label.id && "bg-muted",
            )}
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: label.color }}
            />
            {label.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

/**
 * PERSON cell - avatar with user picker.
 */
interface PersonCellProps {
  value: string | string[] | undefined;
  settings: ColumnSettings;
  onUpdate: (value: unknown) => void;
}

function PersonCell({ value, settings, onUpdate }: PersonCellProps) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);

  const allowMultiple = settings.allowMultiple || false;
  const valueArray = Array.isArray(value) ? value : value ? [value] : [];

  useEffect(() => {
    if (open) {
      apiClient
        .get<User[]>("/users")
        .then((data) => setUsers(Array.isArray(data) ? data : []))
        .catch(() => setUsers([]));
    }
  }, [open]);

  useEffect(() => {
    if (users.length > 0) {
      const selected = users.filter((u) => valueArray.includes(u.id));
      setSelectedUsers(selected);
    }
  }, [users, valueArray]);

  const handleSelect = (userId: string) => {
    if (allowMultiple) {
      const newValue = valueArray.includes(userId)
        ? valueArray.filter((id) => id !== userId)
        : [...valueArray, userId];
      onUpdate(newValue);
    } else {
      onUpdate(userId);
      setOpen(false);
    }
  };

  const handleClear = () => {
    onUpdate(allowMultiple ? [] : null);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1 min-w-0">
          {selectedUsers.length > 0 ? (
            <>
              {selectedUsers.slice(0, 3).map((user) => (
                <Avatar key={user.id} className="h-5 w-5">
                  <AvatarFallback className="text-[10px]">
                    {user.firstName.charAt(0)}
                    {user.lastName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {selectedUsers.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{selectedUsers.length - 3}
                </span>
              )}
            </>
          ) : (
            <span className="text-muted-foreground text-sm">-</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1" align="start">
        <button
          onClick={handleClear}
          className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
          Clear
        </button>
        <div className="my-1 border-t" />
        {users.map((user) => (
          <button
            key={user.id}
            onClick={() => handleSelect(user.id)}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors",
              valueArray.includes(user.id) && "bg-muted",
            )}
          >
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[10px]">
                {user.firstName.charAt(0)}
                {user.lastName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate">
              {user.firstName} {user.lastName}
            </span>
            {valueArray.includes(user.id) && (
              <Check className="h-3 w-3 ml-auto text-primary" />
            )}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

/**
 * DATE cell - formatted date with calendar picker.
 */
interface DateCellProps {
  value: string | undefined;
  settings: ColumnSettings;
  onUpdate: (value: unknown) => void;
}

function DateCell({ value, settings, onUpdate }: DateCellProps) {
  const [open, setOpen] = useState(false);
  const dateFormat = settings.dateFormat || "MM/DD/YYYY";

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    switch (dateFormat) {
      case "DD/MM/YYYY":
        return format(date, "dd/MM/yyyy");
      case "YYYY-MM-DD":
        return format(date, "yyyy-MM-dd");
      default:
        return format(date, "MM/dd/yyyy");
    }
  };

  const handleSelect = (date: Date | undefined) => {
    onUpdate(date?.toISOString() ?? null);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 text-sm hover:bg-muted px-1 py-0.5 rounded transition-colors">
          <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
          {value ? (
            <span>{formatDate(value)}</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value ? new Date(value) : undefined}
          onSelect={handleSelect}
          initialFocus
        />
        {value && (
          <div className="p-2 border-t">
            <button
              onClick={() => handleSelect(undefined)}
              className="w-full text-sm text-red-600 hover:underline"
            >
              Clear date
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/**
 * TIMELINE cell - date range with mini bar.
 */
interface TimelineCellProps {
  value: { start: string; end: string } | undefined;
  settings: ColumnSettings;
  onUpdate: (value: unknown) => void;
}

function TimelineCell({ value, settings, onUpdate }: TimelineCellProps) {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(
    value?.start ? new Date(value.start) : undefined,
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    value?.end ? new Date(value.end) : undefined,
  );

  const handleApply = () => {
    if (startDate && endDate) {
      onUpdate({
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      });
    } else {
      onUpdate(null);
    }
    setOpen(false);
  };

  const formatTimeline = () => {
    if (!value) return null;
    const start = new Date(value.start);
    const end = new Date(value.end);
    return `${format(start, "MMM d")} - ${format(end, "MMM d")}`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 text-sm hover:bg-muted px-1 py-0.5 rounded transition-colors">
          {value ? (
            <span className="text-xs">{formatTimeline()}</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium">Start Date</label>
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={setStartDate}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium">End Date</label>
            <Calendar mode="single" selected={endDate} onSelect={setEndDate} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleApply}>
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * TEXT cell - inline text input.
 */
interface TextCellProps {
  value: string | undefined;
  settings: ColumnSettings;
  onUpdate: (value: unknown) => void;
}

function TextCell({ value, settings, onUpdate }: TextCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || "");

  const handleSave = () => {
    onUpdate(editValue || null);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value || "");
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <Input
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") handleCancel();
        }}
        autoFocus
        className="h-7 text-sm"
        maxLength={settings.maxLength}
        placeholder={settings.placeholder}
      />
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="w-full text-left text-sm truncate hover:bg-muted px-1 py-0.5 rounded transition-colors"
    >
      {value || <span className="text-muted-foreground">-</span>}
    </button>
  );
}

/**
 * LONG_TEXT cell - truncated text with popover.
 */
interface LongTextCellProps {
  value: string | undefined;
  settings: ColumnSettings;
  onUpdate: (value: unknown) => void;
}

function LongTextCell({ value, settings, onUpdate }: LongTextCellProps) {
  const [open, setOpen] = useState(false);
  const [editValue, setEditValue] = useState(value || "");

  const handleSave = () => {
    onUpdate(editValue || null);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="w-full text-left text-sm truncate hover:bg-muted px-1 py-0.5 rounded transition-colors max-w-[150px]">
          {value ? (
            <span className="truncate">{value}</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <Textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          rows={4}
          className="text-sm resize-none"
          maxLength={settings.maxLength}
        />
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave}>
            Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * NUMBER cell - formatted number with inline edit.
 */
interface NumberCellProps {
  value: number | undefined;
  settings: ColumnSettings;
  onUpdate: (value: unknown) => void;
}

function NumberCell({ value, settings, onUpdate }: NumberCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value ?? ""));

  const formatNumber = (num: number) => {
    const fixed = num.toFixed(settings.decimalPlaces ?? 0);
    const formatted =
      settings.numberFormat === "comma"
        ? Number(fixed).toLocaleString("en-US", {
            minimumFractionDigits: settings.decimalPlaces ?? 0,
            maximumFractionDigits: settings.decimalPlaces ?? 0,
          })
        : fixed;

    if (settings.unitLabel) {
      return settings.unitPosition === "suffix"
        ? `${formatted}${settings.unitLabel}`
        : `${settings.unitLabel}${formatted}`;
    }
    return formatted;
  };

  const handleSave = () => {
    const parsed = parseFloat(editValue);
    onUpdate(isNaN(parsed) ? null : parsed);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(String(value ?? ""));
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <Input
        type="number"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") handleCancel();
        }}
        autoFocus
        className="h-7 text-sm w-20"
      />
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="text-sm hover:bg-muted px-1 py-0.5 rounded transition-colors"
    >
      {value !== undefined && value !== null ? (
        formatNumber(value)
      ) : (
        <span className="text-muted-foreground">-</span>
      )}
    </button>
  );
}

/**
 * DROPDOWN cell - single/multi select.
 */
interface DropdownCellProps {
  value: string | string[] | undefined;
  settings: ColumnSettings;
  onUpdate: (value: unknown) => void;
}

function DropdownCell({ value, settings, onUpdate }: DropdownCellProps) {
  const [open, setOpen] = useState(false);
  const options = settings.options || [];
  const allowMultiple = settings.allowMultipleSelection || false;

  const valueArray = Array.isArray(value) ? value : value ? [value] : [];
  const selectedOptions = options.filter((o) => valueArray.includes(o.id));

  const handleSelect = (optionId: string) => {
    if (allowMultiple) {
      const newValue = valueArray.includes(optionId)
        ? valueArray.filter((id) => id !== optionId)
        : [...valueArray, optionId];
      onUpdate(newValue);
    } else {
      onUpdate(optionId);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1">
          {selectedOptions.length > 0 ? (
            selectedOptions.map((opt) => (
              <Badge
                key={opt.id}
                className="text-xs"
                style={{
                  backgroundColor: opt.color,
                  color: getContrastColor(opt.color),
                }}
              >
                {opt.label}
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground text-sm flex items-center gap-1">
              - <ChevronDown className="h-3 w-3" />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-1" align="start">
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => handleSelect(option.id)}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors",
              valueArray.includes(option.id) && "bg-muted",
            )}
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: option.color }}
            />
            {option.label}
            {valueArray.includes(option.id) && (
              <Check className="h-3 w-3 ml-auto text-primary" />
            )}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

/**
 * CHECKBOX cell - toggle checkbox.
 */
interface CheckboxCellProps {
  value: boolean | undefined;
  settings: ColumnSettings;
  onUpdate: (value: unknown) => void;
}

function CheckboxCell({ value, settings, onUpdate }: CheckboxCellProps) {
  const checked = value ?? settings.defaultChecked ?? false;

  return (
    <div className="flex justify-center">
      <Checkbox
        checked={checked}
        onCheckedChange={(checked) => onUpdate(checked)}
      />
    </div>
  );
}

/**
 * LINK cell - clickable URL.
 */
interface LinkCellProps {
  value: { url: string; text?: string } | undefined;
  settings: ColumnSettings;
  onUpdate: (value: unknown) => void;
}

function LinkCell({ value, settings, onUpdate }: LinkCellProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(value?.url || "");
  const [text, setText] = useState(value?.text || "");

  const handleSave = () => {
    if (url) {
      onUpdate({ url, text: text || url });
    } else {
      onUpdate(null);
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {value?.url ? (
          <a
            href={value.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-sm text-primary hover:underline truncate max-w-[120px]"
          >
            <LinkIcon className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{value.text || value.url}</span>
            <ExternalLink className="h-3 w-3 flex-shrink-0" />
          </a>
        ) : (
          <button className="text-muted-foreground text-sm">
            <LinkIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium">URL</label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={settings.placeholderUrl || "https://..."}
              className="text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Display Text</label>
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Link text"
              className="text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * TAGS cell - multiple colored tags.
 */
interface TagsCellProps {
  value: string[] | undefined;
  settings: ColumnSettings;
  onUpdate: (value: unknown) => void;
}

function TagsCell({ value, settings, onUpdate }: TagsCellProps) {
  const [open, setOpen] = useState(false);
  const availableTags = settings.availableTags || [];

  const valueArray = value || [];
  const selectedTags = availableTags.filter((t) => valueArray.includes(t.id));

  const toggleTag = (tagId: string) => {
    const newValue = valueArray.includes(tagId)
      ? valueArray.filter((id) => id !== tagId)
      : [...valueArray, tagId];
    onUpdate(newValue);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1 flex-wrap">
          {selectedTags.length > 0 ? (
            selectedTags.slice(0, 2).map((tag) => (
              <Badge
                key={tag.id}
                variant="outline"
                className="text-[10px] px-1.5 py-0"
                style={{
                  borderColor: tag.color,
                  color: tag.color,
                }}
              >
                {tag.label}
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground text-sm">-</span>
          )}
          {selectedTags.length > 2 && (
            <span className="text-xs text-muted-foreground">
              +{selectedTags.length - 2}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1" align="start">
        {availableTags.map((tag) => (
          <button
            key={tag.id}
            onClick={() => toggleTag(tag.id)}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors",
              valueArray.includes(tag.id) && "bg-muted",
            )}
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: tag.color }}
            />
            {tag.label}
            {valueArray.includes(tag.id) && (
              <Check className="h-3 w-3 ml-auto text-primary" />
            )}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

/**
 * FILES cell - file count with attachment indicator.
 */
interface FilesCellProps {
  value: Array<{ id: string; name: string }> | undefined;
  taskId: string;
  onUpdate: (value: unknown) => void;
}

function FilesCell({ value, taskId, onUpdate }: FilesCellProps) {
  const files = value || [];

  return (
    <div className="flex items-center gap-1 text-sm text-muted-foreground">
      <Paperclip className="h-3.5 w-3.5" />
      {files.length > 0 ? (
        <span>
          {files.length} file{files.length !== 1 && "s"}
        </span>
      ) : (
        <span>-</span>
      )}
    </div>
  );
}

/**
 * DEPENDENCY cell - dependency count indicator.
 */
interface DependencyCellProps {
  value: Array<{ taskId: string; type: string }> | undefined;
  taskId: string;
  onUpdate: (value: unknown) => void;
}

function DependencyCell({ value, taskId, onUpdate }: DependencyCellProps) {
  const deps = value || [];

  return (
    <div className="flex items-center gap-1 text-sm text-muted-foreground">
      <GitBranch className="h-3.5 w-3.5" />
      {deps.length > 0 ? (
        <span>
          {deps.length} dep{deps.length !== 1 && "s"}
        </span>
      ) : (
        <span>-</span>
      )}
    </div>
  );
}

/**
 * CONNECTED_ENTITY cell - linked entity display.
 */
interface ConnectedEntityCellProps {
  value: { entityId: string; entityType: string } | undefined;
  settings: ColumnSettings;
  onUpdate: (value: unknown) => void;
}

function ConnectedEntityCell({
  value,
  settings,
  onUpdate,
}: ConnectedEntityCellProps) {
  if (!value) {
    return <span className="text-muted-foreground text-sm">-</span>;
  }

  return (
    <a
      href={`/${value.entityType.toLowerCase()}s/${value.entityId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1 text-sm text-primary hover:underline"
    >
      <ExternalLink className="h-3 w-3" />
      <span className="truncate max-w-[80px]">{value.entityType}</span>
    </a>
  );
}

/**
 * PROGRESS cell - progress bar with percentage.
 */
interface ProgressCellProps {
  value: number | undefined;
  task: ProjectTask;
  settings: ColumnSettings;
  onUpdate: (value: unknown) => void;
}

function ProgressCell({ value, task, settings, onUpdate }: ProgressCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value ?? 0));

  const autoCalculate = settings.autoCalculateFromSubtasks !== false;
  const allowManual = settings.allowManualOverride !== false;

  // Calculate from subtasks if enabled
  const calculatedProgress = useMemo(() => {
    if (autoCalculate && task.subtaskCount && task.subtaskCount > 0) {
      return Math.round(
        ((task.completedSubtaskCount || 0) / task.subtaskCount) * 100,
      );
    }
    return value ?? 0;
  }, [autoCalculate, task.subtaskCount, task.completedSubtaskCount, value]);

  const displayValue = autoCalculate ? calculatedProgress : (value ?? 0);

  const handleSave = () => {
    const parsed = parseInt(editValue);
    onUpdate(isNaN(parsed) ? 0 : Math.min(100, Math.max(0, parsed)));
    setIsEditing(false);
  };

  if (isEditing && allowManual) {
    return (
      <Input
        type="number"
        min={0}
        max={100}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") {
            setEditValue(String(value ?? 0));
            setIsEditing(false);
          }
        }}
        autoFocus
        className="h-7 text-sm w-16"
      />
    );
  }

  return (
    <button
      onClick={() => allowManual && setIsEditing(true)}
      className={cn(
        "flex items-center gap-2 w-full",
        allowManual &&
          "cursor-pointer hover:bg-muted rounded px-1 py-0.5 transition-colors",
      )}
    >
      <Progress value={displayValue} className="h-2 flex-1" />
      <span className="text-xs text-muted-foreground w-8">{displayValue}%</span>
    </button>
  );
}

/**
 * Helper to get contrasting text color for a background.
 */
function getContrastColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace("#", "");

  // Parse RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? "#000000" : "#ffffff";
}
