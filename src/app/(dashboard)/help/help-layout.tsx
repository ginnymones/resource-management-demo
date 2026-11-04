"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { BookOpen, ChevronDown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "./markdown-renderer";
import type { WikiPage } from "@/lib/wiki";

type HelpLayoutProps = {
  pages: WikiPage[];
  currentSlug: string | null;
  children: React.ReactNode;
};

export function HelpLayout({ pages, currentSlug, children }: HelpLayoutProps) {
  const { data: session } = useSession();
  const userRole = session?.user?.role ?? "SME";
  const isAdmin = userRole === "Admin";
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Filter out admin guide for non-admin users
  const visiblePages = pages.filter((page) => {
    if (page.slug === "admin-guide" && !isAdmin) return false;
    return true;
  });

  const currentPage = pages.find((p) => p.slug === currentSlug);
  const pageTitle = currentPage?.title ?? "Help & Documentation";

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-0">
      {/* Mobile dropdown nav */}
      <div className="lg:hidden">
        <Button
          variant="outline"
          className="w-full justify-between cursor-pointer"
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          aria-expanded={mobileNavOpen}
          aria-controls="help-mobile-nav"
        >
          <span className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            {pageTitle}
          </span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${mobileNavOpen ? "rotate-180" : ""}`}
          />
        </Button>
        {mobileNavOpen && (
          <nav
            id="help-mobile-nav"
            className="mt-2 rounded-md border border-border bg-card p-2 space-y-1"
            aria-label="Help pages navigation"
          >
            <Link
              href="/help"
              onClick={() => setMobileNavOpen(false)}
              className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                currentSlug === null
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-accent"
              }`}
            >
              📖 Table of Contents
            </Link>
            {visiblePages.map((page) => (
              <Link
                key={page.slug}
                href={`/help/${page.slug}`}
                onClick={() => setMobileNavOpen(false)}
                className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  currentSlug === page.slug
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-accent"
                }`}
              >
                {page.title}
                {page.slug === "admin-guide" && (
                  <Lock className="inline ml-2 h-3 w-3 text-muted-foreground" />
                )}
              </Link>
            ))}
          </nav>
        )}
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 shrink-0">
        <nav
          className="sticky top-0 rounded-lg border border-border bg-card p-4 space-y-1"
          aria-label="Help pages navigation"
        >
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Documentation
          </h3>
          <Link
            href="/help"
            className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              currentSlug === null
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-accent"
            }`}
          >
            📖 Table of Contents
          </Link>
          <div className="my-2 border-t border-border" />
          {visiblePages.map((page) => (
            <Link
              key={page.slug}
              href={`/help/${page.slug}`}
              className={`flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                currentSlug === page.slug
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-accent"
              }`}
            >
              <span>{page.title}</span>
              {page.slug === "admin-guide" && (
                <Lock className="h-3 w-3 text-muted-foreground" />
              )}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        <div className="rounded-lg border border-border bg-card p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

/**
 * Renders help page content, handling admin-only restriction.
 */
export function HelpPageContent({
  page,
  isAdminPage,
}: {
  page: WikiPage;
  isAdminPage: boolean;
}) {
  const { data: session } = useSession();
  const userRole = session?.user?.role ?? "SME";
  const isAdmin = userRole === "Admin";

  if (isAdminPage && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Lock className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
        <p className="text-muted-foreground max-w-md">
          This section requires Admin access. If you believe you should have access to
          this page, please contact your system administrator.
        </p>
        <Link href="/help">
          <Button variant="outline" className="mt-6 cursor-pointer">
            ← Back to Help
          </Button>
        </Link>
      </div>
    );
  }

  return <MarkdownRenderer content={page.content} />;
}
