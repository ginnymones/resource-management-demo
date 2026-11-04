import { notFound } from "next/navigation";
import { getWikiPages, getWikiPageBySlug } from "@/lib/wiki";
import { SlugPageClient } from "./slug-page-client";

type Props = {
  params: { slug: string };
};

export function generateStaticParams() {
  const pages = getWikiPages();
  return pages.map((page) => ({ slug: page.slug }));
}

export default function HelpSlugPage({ params }: Props) {
  const page = getWikiPageBySlug(params.slug);

  if (!page) {
    notFound();
  }

  const pages = getWikiPages();
  const isAdminPage = page.slug === "admin-guide";

  return (
    <SlugPageClient
      pages={pages}
      currentPage={page}
      isAdminPage={isAdminPage}
    />
  );
}
