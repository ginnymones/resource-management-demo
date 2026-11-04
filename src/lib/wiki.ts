import fs from "fs";
import path from "path";

export type WikiPage = {
  slug: string;
  title: string;
  filename: string;
  content: string;
  order: number;
};

const WIKI_DIR = path.join(process.cwd(), "docs", "wiki");

/**
 * Derive a URL slug from a wiki filename.
 * e.g. "01-overview.md" → "overview"
 *      "09-admin-guide.md" → "admin-guide"
 */
function filenameToSlug(filename: string): string {
  return filename
    .replace(/\.md$/, "")
    .replace(/^\d+-/, "");
}

/**
 * Extract the first # heading from markdown content as the page title.
 */
function extractTitle(content: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "Untitled";
}

/**
 * Extract the numeric prefix for ordering.
 * e.g. "01-overview.md" → 1, "10-faq.md" → 10
 */
function extractOrder(filename: string): number {
  const match = filename.match(/^(\d+)-/);
  return match ? parseInt(match[1], 10) : 999;
}

/**
 * Get all wiki pages, sorted by their numeric prefix.
 * Excludes README.md (that's the index page).
 */
export function getWikiPages(): WikiPage[] {
  if (!fs.existsSync(WIKI_DIR)) {
    return [];
  }

  const files = fs.readdirSync(WIKI_DIR).filter(
    (f) => f.endsWith(".md") && f !== "README.md"
  );

  return files
    .map((filename) => {
      const content = fs.readFileSync(path.join(WIKI_DIR, filename), "utf-8");
      return {
        slug: filenameToSlug(filename),
        title: extractTitle(content),
        filename,
        content,
        order: extractOrder(filename),
      };
    })
    .sort((a, b) => a.order - b.order);
}

/**
 * Get a single wiki page by slug.
 */
export function getWikiPageBySlug(slug: string): WikiPage | null {
  const pages = getWikiPages();
  return pages.find((p) => p.slug === slug) ?? null;
}

/**
 * Get the README (index/table of contents) page content.
 */
export function getWikiIndex(): string {
  const readmePath = path.join(WIKI_DIR, "README.md");
  if (!fs.existsSync(readmePath)) {
    return "# Help\n\nNo documentation available.";
  }
  return fs.readFileSync(readmePath, "utf-8");
}
