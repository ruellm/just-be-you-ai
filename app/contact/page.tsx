import type { Metadata } from "next";
import Image from "next/image";
import { Clock, Mail, MapPin } from "lucide-react";
import { Footer } from "@/components/Footer";
import { PublicNav } from "@/components/PublicNav";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact — Just Be You",
  description:
    "Have questions or need support? Our team is always here to help you.",
};

const CONNECT_ROWS = [
  {
    icon: Mail,
    label: "Email Us",
    value: "hello@justbeyou.ai",
    href: "mailto:hello@justbeyou.ai",
  },
  {
    // "EST" is verbatim from the design — flagged as a likely copy error
    // for a Manila-based company.
    icon: Clock,
    label: "Support Hours",
    value: "Mon-Fri, 9am - 6pm EST",
  },
  {
    icon: MapPin,
    label: "Headquarters",
    value:
      "4/F PhilCox Building, 172 Salcedo Street, Legazpi Village, Makati City, 1229 Metro Manila, Philippines",
  },
] as const;

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col bg-brand-canvas font-body text-brand-ink">
      <PublicNav />

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          {/* Header */}
          <div className="space-y-4 text-center">
            <h1 className="font-display text-4xl font-bold text-brand-primary sm:text-5xl">
              Get In Touch
            </h1>
            <p className="mx-auto max-w-3xl text-xl text-brand-ink-secondary">
              Have questions or need support? Our team is always here to help
              you.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-4xl items-stretch gap-8 lg:grid-cols-[3fr_2fr]">
            {/* Form card */}
            <div className="rounded-[12px] border border-brand-border bg-brand-surface p-7 sm:p-9">
              <ContactForm />
            </div>

            {/* Other ways to connect */}
            <div className="flex flex-col gap-6 rounded-[12px] bg-brand-card p-7">
              <h2 className="text-2xl font-semibold text-white">
                Other Ways to Connect
              </h2>
              <ul className="space-y-5">
                {CONNECT_ROWS.map((row) => (
                  <li key={row.label} className="flex items-start gap-4">
                    <span className="flex size-[50px] shrink-0 items-center justify-center rounded-full bg-brand-tertiary">
                      <row.icon className="size-6 text-brand-card" />
                    </span>
                    <span className="space-y-0.5">
                      <span className="block font-medium text-white">
                        {row.label}
                      </span>
                      {"href" in row ? (
                        <a
                          href={row.href}
                          className="text-sm text-white hover:underline"
                        >
                          {row.value}
                        </a>
                      ) : (
                        <span className="block text-sm text-white">
                          {row.value}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              <Image
                src="/hq-map.png"
                alt="Map showing the Just Be You headquarters in Makati City"
                width={346}
                height={175}
                className="mt-auto h-[175px] w-full rounded-[8px] object-cover"
              />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
