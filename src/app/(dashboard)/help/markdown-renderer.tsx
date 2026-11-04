"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

/**
 * Converts relative wiki links (e.g. ./01-overview.md) to /help/slug links.
 */
function transformHref(href: string | undefined): string {
  if (!href) return "#";

  // Handle relative .md links like ./01-overview.md or 01-overview.md
  if (href.match(/^\.?\/?(\d+-)?[\w-]+\.md$/)) {
    const filename = href.replace(/^\.\//, "");
    const slug = filename.replace(/\.md$/, "").replace(/^\d+-/, "");
    return `/help/${slug}`;
  }

  return href;
}

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:scroll-mt-20 prose-table:border-collapse prose-th:border prose-th:border-border prose-th:p-2 prose-th:bg-muted prose-td:border prose-td:border-border prose-td:p-2 prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-code:before:content-none prose-code:after:content-none prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-sm">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children, ...props }: ComponentPropsWithoutRef<"a">) => {
            const resolvedHref = transformHref(href);
            // Internal links use Next.js Link
            if (resolvedHref.startsWith("/")) {
              return (
                <Link href={resolvedHref} {...props}>
                  {children}
                </Link>
              );
            }
            // External links open in new tab
            return (
              <a href={resolvedHref} target="_blank" rel="noopener noreferrer" {...props}>
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
