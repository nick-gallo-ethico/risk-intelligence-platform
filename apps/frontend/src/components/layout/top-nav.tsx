"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Search,
  Bell,
  Settings,
  User,
  LogOut,
  ChevronDown,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAiPanel } from "@/contexts/ai-panel-context";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

/**
 * HubSpot-style top navigation bar.
 *
 * Features:
 * - Global search (Cmd+K / Ctrl+K shortcut)
 * - Notifications bell with badge count
 * - AI Assistant quick access
 * - User profile dropdown
 *
 * This sits alongside the sidebar to provide quick access
 * to cross-cutting features like search and notifications.
 */
export function TopNav() {
  const router = useRouter();
  const { togglePanel } = useAiPanel();
  const { user: authUser, logout } = useAuth();
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Mock notification count - in real app, this would come from API
  const notificationCount = 5;

  // User display values from auth context
  const displayName = authUser
    ? `${authUser.firstName} ${authUser.lastName}`
    : "User";
  const displayEmail = authUser?.email ?? "";
  const displayRole = authUser?.role
    ? authUser.role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "";
  const displayInitials = authUser
    ? `${authUser.firstName?.[0] ?? ""}${authUser.lastName?.[0] ?? ""}`
    : "U";

  // Keyboard shortcut for search (Cmd+K / Ctrl+K)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[hsl(227,36%,13%)] text-white">
      <div className="flex h-14 items-center gap-4 px-4">
        {/* Sidebar trigger (hamburger menu) */}
        <SidebarTrigger className="shrink-0 text-white/80 hover:text-white hover:bg-white/10" />

        {/* Logo / Brand - visible on desktop */}
        <Link
          href="/dashboard"
          className="hidden md:flex items-center gap-2"
        >
          <Image
            src="/ethico-logo-light.svg"
            alt="Ethico"
            width={100}
            height={28}
            priority
          />
        </Link>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search */}
        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-64 justify-start text-white/70 hover:text-white hidden md:flex border-white/20 bg-white/5 hover:bg-white/10"
            >
              <Search className="mr-2 h-4 w-4" />
              <span>Search...</span>
              <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border border-white/20 bg-white/10 px-1.5 font-mono text-[10px] font-medium text-white/60">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96 p-0" align="end">
            <form onSubmit={handleSearch}>
              <div className="flex items-center border-b px-3">
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <Input
                  ref={searchInputRef}
                  placeholder="Search cases, investigations, policies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex h-11 w-full rounded-none border-0 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-0"
                />
              </div>
              <div className="p-2">
                <p className="text-xs text-muted-foreground px-2 py-1">
                  Press Enter to search or use filters:
                </p>
                <div className="flex flex-wrap gap-1 px-2 py-1">
                  <Badge
                    variant="secondary"
                    className="text-xs cursor-pointer hover:bg-secondary/80"
                  >
                    type:case
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="text-xs cursor-pointer hover:bg-secondary/80"
                  >
                    type:investigation
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="text-xs cursor-pointer hover:bg-secondary/80"
                  >
                    type:policy
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="text-xs cursor-pointer hover:bg-secondary/80"
                  >
                    status:open
                  </Badge>
                </div>
              </div>
            </form>
          </PopoverContent>
        </Popover>

        {/* Mobile search button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-white/80 hover:text-white hover:bg-white/10"
          onClick={() => setSearchOpen(true)}
        >
          <Search className="h-5 w-5" />
        </Button>

        {/* AI Assistant Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => togglePanel()}
          className="relative text-white/80 hover:text-white hover:bg-white/10"
          title="AI Assistant"
        >
          <Sparkles className="h-5 w-5" />
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative text-white/80 hover:text-white hover:bg-white/10">
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {notificationCount > 9 ? "9+" : notificationCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              <Link
                href="/notifications"
                className="text-xs text-primary hover:underline"
              >
                View all
              </Link>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {/* Sample notifications - in real app these come from API */}
            <DropdownMenuItem className="flex flex-col items-start gap-1 cursor-pointer">
              <p className="text-sm font-medium">New case assigned</p>
              <p className="text-xs text-muted-foreground">
                Case #CASE-2024-0234 has been assigned to you
              </p>
              <p className="text-xs text-muted-foreground">2 minutes ago</p>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start gap-1 cursor-pointer">
              <p className="text-sm font-medium">Investigation due soon</p>
              <p className="text-xs text-muted-foreground">
                Investigation #INV-001 is due in 2 days
              </p>
              <p className="text-xs text-muted-foreground">1 hour ago</p>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start gap-1 cursor-pointer">
              <p className="text-sm font-medium">Policy approval needed</p>
              <p className="text-xs text-muted-foreground">
                &ldquo;Code of Conduct v2.1&rdquo; awaits your approval
              </p>
              <p className="text-xs text-muted-foreground">3 hours ago</p>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/my-work" className="w-full cursor-pointer">
                <span className="text-primary">Go to My Tasks</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Help */}
        <Button variant="ghost" size="icon" title="Help & Support" className="text-white/80 hover:text-white hover:bg-white/10">
          <HelpCircle className="h-5 w-5" />
        </Button>

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2 hover:bg-white/10">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-white/20 text-white text-xs">
                  {displayInitials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-medium text-white">{displayName}</span>
                <span className="text-xs text-white/70">
                  {displayRole}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 text-white/70 hidden md:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {displayName}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {displayEmail}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>My Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/my-work" className="cursor-pointer">
                <Bell className="mr-2 h-4 w-4" />
                <span>My Tasks</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:text-destructive"
              onClick={async () => {
                await logout();
                router.push("/login");
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
