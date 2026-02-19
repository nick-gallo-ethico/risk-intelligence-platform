"use client";

import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

const themes = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function ThemeToggleItems() {
  const { theme, setTheme } = useTheme();

  return (
    <>
      {themes.map(({ value, label, icon: Icon }) => (
        <DropdownMenuItem
          key={value}
          onClick={() => setTheme(value)}
          className="flex items-center gap-2"
        >
          <Icon className="h-4 w-4" />
          <span>{label}</span>
          {theme === value && (
            <span className="ml-auto text-xs text-muted-foreground">
              &#10003;
            </span>
          )}
        </DropdownMenuItem>
      ))}
    </>
  );
}
