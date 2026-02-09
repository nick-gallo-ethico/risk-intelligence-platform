"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Bell,
  Settings,
  User,
  LogOut,
  ChevronDown,
  HelpCircle,
  Sparkles,
  Loader2,
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
import { useAiPanel } from "@/contexts/ai-panel-context";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";

interface NotificationItem {
  id: string;
  type: string;
  category: string;
  title: string;
  message: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  isRead: boolean;
  entityType?: string;
  entityId?: string;
  url?: string;
  createdAt: string;
}

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

  // Fetch notifications from API
  const { data: notificationsData, isLoading: notificationsLoading } = useQuery({
    queryKey: ["notifications-preview"],
    queryFn: async () => {
      try {
        const response = await api.get("/notifications", {
          params: { limit: 5 },
        });
        if (response.data?.data && Array.isArray(response.data.data)) {
          return response.data.data as NotificationItem[];
        }
        if (Array.isArray(response.data)) {
          return response.data as NotificationItem[];
        }
        return [];
      } catch {
        return [];
      }
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refresh every minute
  });

  const notifications = notificationsData || [];
  const notificationCount = notifications.filter((n) => !n.isRead).length;

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
        {/* Search - left aligned, wider like HubSpot */}
        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-80 justify-start text-white/70 hover:text-white hidden md:flex border-white/20 bg-white/5 hover:bg-white/10"
            >
              <Search className="mr-2 h-4 w-4" />
              <span>Search...</span>
              <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border border-white/20 bg-white/10 px-1.5 font-mono text-[10px] font-medium text-white/60">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96 p-0" align="start">
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

        {/* Spacer - pushes remaining items to the right */}
        <div className="flex-1" />

        {/* AI Assistant Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => togglePanel()}
          className="relative text-blue-400 hover:text-blue-300 hover:bg-white/10"
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
            {notificationsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                No notifications
              </div>
            ) : (
              notifications.slice(0, 5).map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={cn(
                    "flex flex-col items-start gap-1 cursor-pointer",
                    !notification.isRead && "bg-primary/5"
                  )}
                  onClick={() => {
                    if (notification.url) {
                      router.push(notification.url);
                    } else if (notification.entityType && notification.entityId) {
                      router.push(`/${notification.entityType.toLowerCase()}s/${notification.entityId}`);
                    }
                  }}
                >
                  <p className={cn("text-sm", !notification.isRead && "font-medium")}>
                    {notification.title}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </p>
                </DropdownMenuItem>
              ))
            )}
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
