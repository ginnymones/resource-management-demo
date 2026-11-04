import { getWikiPages, getWikiIndex } from "@/lib/wiki";
import { HelpPageClient } from "./help-page-client";

export default function HelpPage() {
  const pages = getWikiPages();
  const indexContent = getWikiIndex();

  return <HelpPageClient pages={pages} indexContent={indexContent} />;
}
