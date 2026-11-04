"use client";

import { HelpLayout } from "./help-layout";
import { MarkdownRenderer } from "./markdown-renderer";
import type { WikiPage } from "@/lib/wiki";

type Props = {
  pages: WikiPage[];
  indexContent: string;
};

export function HelpPageClient({ pages, indexContent }: Props) {
  return (
    <HelpLayout pages={pages} currentSlug={null}>
      <MarkdownRenderer content={indexContent} />
    </HelpLayout>
  );
}
