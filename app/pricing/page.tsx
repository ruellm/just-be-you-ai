import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { PublicNav } from "@/components/PublicNav";
import { PAGE_COPY, parseAudience } from "./content";
import { PricingView } from "./PricingView";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const audience = parseAudience((await searchParams).audience);
  return {
    title: PAGE_COPY[audience].metaTitle,
    description: PAGE_COPY[audience].subtitle,
  };
}

export default async function PricingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const audience = parseAudience((await searchParams).audience);
  return (
    <div className="flex min-h-screen flex-col bg-brand-canvas font-body text-brand-ink">
      <PublicNav />
      <main className="flex-1">
        <PricingView key={audience} initialAudience={audience} />
      </main>
      <Footer />
    </div>
  );
}
