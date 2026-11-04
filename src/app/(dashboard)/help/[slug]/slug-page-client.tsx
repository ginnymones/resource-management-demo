"use client";

import { HelpLayout, HelpPageContent } from "../help-layout";
import type { WikiPage } from "@/lib/wiki";

type Props = {
  pages: WikiPage[];
  currentPage: WikiPage;
  isAdminPage: boolean;
};

export function SlugPageClient({ pages, currentPage, isAdminPage }: Props) {
  return (
    <HelpLayout pages={pages} currentSlug={currentPage.slug}>
      <HelpPageContent page={currentPage} isAdminPage={isAdminPage} />
    </HelpLayout>
  );
}
