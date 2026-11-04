"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Search,
  Thermometer,
  FileText,
  Settings,
  Sun,
  Moon,
  Menu,
  LogOut,
  User,
  Users,
  X,
  HelpCircle,
} from "lucide-react";
import {
  NotificationPanel,
  type NotificationItem,
} from "@/components/notifications/notification-panel";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Providers } from "./providers";
import {
  getUnreadCountAction,
  getNotificationsAction,
  markAsReadAction,
  markAllAsReadAction,
} from "@/app/actions/notifications";
import { isClimateEnabled } from "@/app/actions/settings";

type NavItem = { href: string; label: string; icon: typeof Search };

function getNavItems(role: string, climateVisible: boolean): NavItem[] {
  // Associates use a separate layout — they should not see dashboard nav
  if (role === "Associate") {
    return [];
  }

  const items: NavItem[] = [];

  if (climateVisible) {
    items.push({ href: "/climate", label: "Resource Climate", icon: Thermometer });
  }
  items.push({ href: "/roster", label: "Roster", icon: Users });

  if (["SME", "POC", "Manager", "Senior_Leader", "Admin"].includes(role)) {
    items.push({ href: "/matchmaker", label: "Matchmaker", icon: Search });
    items.push({ href: "/requests", label: "My Requests", icon: FileText });
  }

  if (role === "Admin") {
    items.push({ href: "/admin", label: "Admin", icon: Settings });
  } else if (role === "SME" || role === "Manager") {
    items.push({ href: "/admin", label: "Manage", icon: Settings });
  }

  return items;
}

function getBottomNavItems(): NavItem[] {
  return [{ href: "/help", label: "Help", icon: HelpCircle }];
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isDark, setIsDark] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [climateVisible, setClimateVisible] = useState(true);

  const userRole = session?.user?.role ?? "SME";
  const userName = session?.user?.name ?? "User";
  const userId = session?.user?.id;

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      const [count, notifData] = await Promise.all([
        getUnreadCountAction(userId),
        getNotificationsAction(userId, 1),
      ]);
      setNotificationCount(count);
      setNotifications(
        notifData.data.map((n) => ({
          id: n.id,
          title: n.title,
          body: n.body,
          referenceNumber: n.request?.referenceNumber ?? undefined,
          requestId: n.request?.id ?? undefined,
          isRead: n.isRead,
          createdAt: n.createdAt.toISOString ? n.createdAt.toISOString() : String(n.createdAt),
        }))
      );
    } catch {
      // Silently fail - notifications are non-critical
    }
  }, [userId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Fetch climate page visibility setting
  useEffect(() => {
    async function checkClimateSetting() {
      try {
        const enabled = await isClimateEnabled();
        setClimateVisible(enabled);
      } catch {
        setClimateVisible(true);
      }
    }
    checkClimateSetting();
  }, []);

  async function handleMarkAllRead() {
    if (!userId) return;
    await markAllAsReadAction(userId);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setNotificationCount(0);
  }

  async function handleMarkRead(id: string) {
    await markAsReadAction(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setNotificationCount((prev) => Math.max(0, prev - 1));
  }

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark") {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDark(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem("theme", next ? "dark" : "light");
    if (next) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  const allNavItems = getNavItems(userRole, climateVisible);
  const bottomNavItems = getBottomNavItems();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex md:w-64 md:flex-col border-r border-border bg-sidebar">
          <nav
            aria-label="Main navigation"
            className="flex flex-col h-full"
          >
            <div className="p-4">
              <h2 className="text-lg font-semibold text-sidebar-foreground truncate">
                Resource Platform
              </h2>
            </div>
            <Separator />
            <ul className="flex-1 space-y-1 p-3" role="list">
              {allNavItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                        active
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      }`}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <Separator />
            <ul className="space-y-1 p-3" role="list">
              {bottomNavItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                        active
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      }`}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {/* Main content area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top bar */}
          <header className="flex h-14 items-center gap-4 border-b border-border bg-card px-4 md:px-6">
            {/* Mobile menu trigger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden cursor-pointer"
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <nav aria-label="Mobile navigation" className="flex flex-col h-full">
                  <div className="flex items-center justify-between p-4">
                    <h2 className="text-lg font-semibold">Resource Platform</h2>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setMobileOpen(false)}
                      aria-label="Close navigation menu"
                      className="cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Separator />
                  <ul className="flex-1 space-y-1 p-3" role="list">
                    {allNavItems.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                              active
                                ? "bg-primary text-primary-foreground"
                                : "text-foreground hover:bg-accent hover:text-accent-foreground"
                            }`}
                            aria-current={active ? "page" : undefined}
                          >
                            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                  <Separator />
                  <ul className="space-y-1 p-3" role="list">
                    {bottomNavItems.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                              active
                                ? "bg-primary text-primary-foreground"
                                : "text-foreground hover:bg-accent hover:text-accent-foreground"
                            }`}
                            aria-current={active ? "page" : undefined}
                          >
                            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </nav>
              </SheetContent>
            </Sheet>

            {/* App title */}
            <h1 className="text-sm font-semibold md:text-base truncate">
              Resource Management Platform
            </h1>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Right side actions */}
            <div className="flex items-center gap-2">
              {/* Notification panel */}
              <NotificationPanel
                notifications={notifications}
                unreadCount={notificationCount}
                onMarkAllRead={handleMarkAllRead}
                onMarkRead={handleMarkRead}
              />

              {/* Theme toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleTheme}
                    aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                    className="cursor-pointer"
                  >
                    {isDark ? (
                      <Sun className="h-5 w-5" />
                    ) : (
                      <Moon className="h-5 w-5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isDark ? "Light mode" : "Dark mode"}
                </TooltipContent>
              </Tooltip>

              {/* User dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 cursor-pointer"
                    aria-label="User menu"
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-xs">
                        {userName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline text-sm font-medium">
                      {userName}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-destructive"
                    onClick={() => signOut({ callbackUrl: "/auth" })}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <DashboardShell>{children}</DashboardShell>
    </Providers>
  );
}
