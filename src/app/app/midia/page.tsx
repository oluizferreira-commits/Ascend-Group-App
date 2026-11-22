import type { Metadata } from "next";
import { requirePage } from "@/server/auth/session";
import { FORMATS, TEMPLATES, mediaSources } from "@/server/media/data";
import { PageHeader } from "@/components/ui/basics";
import { MediaStudio } from "@/components/media/studio";

export const metadata: Metadata = { title: "Central de mídia" };

export default async function MediaPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requirePage("media.manage");
  const sp = await searchParams;
  const sources = await mediaSources(ctx.club.id);
  return (
    <>
      <PageHeader eyebrow="Central de mídia" title="Artes oficiais" description="Gere artes com a identidade do Ascend FC para Instagram, grupos e computador." />
      <MediaStudio templates={TEMPLATES} formats={FORMATS} sources={sources} initial={sp} />
    </>
  );
}
