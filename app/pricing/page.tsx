import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { PublicNav } from "@/components/PublicNav";
import { PAGE_COPY } from "./content";
import { PricingView } from "./PricingView";

export const metadata: Metadata = {
  title: PAGE_COPY.metaTitle,
  description: PAGE_COPY.subtitle,
};

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-brand-canvas font-body text-brand-ink">
      <PublicNav />
      <main className="flex-1">
        <PricingView />
      </main>
      <Footer />
    </div>
  );
}
