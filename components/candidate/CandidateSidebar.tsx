"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/actions/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Design SVGs (public/icons/*, exported from Figma). Their fill is baked in
// as #565E74 = brand-ink-sidebar, which matches the label colour in both the
// active and inactive states, so they're rendered as plain images.
const NAV = [
  { label: "Dashboard", href: "/candidate/dashboard", icon: "/icons/nav-dashboard.svg", w: 18, h: 18 },
  { label: "Browse Jobs", href: "/candidate/jobs", icon: "/icons/nav-jobs.svg", w: 20, h: 19 },
  { label: "Applications", href: "/candidate/applications", icon: "/icons/nav-applications.svg", w: 18, h: 18 },
  { label: "Profile", href: "/candidate/profile", icon: "/icons/nav-profile.svg", w: 16, h: 16 },
];

export const SIDEBAR_WIDTH_PX = 255;

// Candidate-only left sidebar (the business/admin sections keep AppNav).
// Desktop (lg+): fixed, full-height, always visible. Below lg: a compact top
// bar with a hamburger toggles the same sidebar in as an overlay drawer
// (local state + CSS transform — `sheet` isn't installed and isn't needed).
export function CandidateSidebar({
  name,
  initials,
  jobTitle,
  seatsUsed,
  seatsTotal,
}: {
  name: string;
  initials: string;
  jobTitle: string | null;
  seatsUsed: number;
  seatsTotal: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const signOutFormRef = useRef<HTMLFormElement>(null);

  const nav = (
    <>
      <div className="px-6 pt-6 pb-4">
        <p className="text-xl font-semibold text-brand-primary">Just Be You.</p>
        <p className="mt-0.5 text-[10px] font-medium tracking-[1px] text-brand-ink-secondary uppercase">
          Candidate Portal
        </p>
      </div>

      <nav aria-label="Candidate" className="flex flex-1 flex-col gap-1 px-4">
        {NAV.map(({ label, href, icon, w, h }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              onClick={() => setOpen(false)}
              className={cn(
                "flex h-12 items-center gap-3 rounded-[8px] px-4 text-base text-brand-ink-sidebar transition-colors",
                active
                  ? "bg-brand-tertiary font-semibold"
                  : "font-medium hover:bg-brand-container"
              )}
            >
              <span className="flex w-5 shrink-0 items-center justify-center">
                <Image src={icon} alt="" width={w} height={h} unoptimized />
              </span>
              {label}
            </Link>
          );
        })}

        <div className="mt-auto mb-4 flex h-10 items-center gap-2 rounded-[12px] border border-brand-border bg-brand-surface px-3 text-sm text-brand-ink">
          <Image
            src="/icons/seat-chair.svg"
            alt=""
            width={18}
            height={21}
            unoptimized
            className="shrink-0"
          />
          <span className="font-semibold">Seat Credits:</span>
          <span className="font-medium">
            {seatsUsed}/{seatsTotal}
          </span>
        </div>
      </nav>

      <div className="flex items-center gap-3 border-t border-brand-border p-4">
        {/* Same sign-out path as AppNav: a form posting to the signOut server
            action (cookies clear server-side, then redirect). The menu item
            just submits it — the form lives outside the dropdown so it isn't
            unmounted when the menu closes. */}
        <form ref={signOutFormRef} action={signOut} className="hidden" />
        <Avatar className="size-10 rounded-[12px] after:rounded-[12px] after:border-brand-border">
          <AvatarFallback className="rounded-[12px] bg-brand-container text-sm font-semibold text-brand-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-brand-ink">{name}</p>
          {jobTitle ? (
            <p className="truncate text-xs text-brand-ink-secondary">{jobTitle}</p>
          ) : null}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Account menu"
              className="text-brand-ink-sidebar hover:bg-brand-container"
            >
              <Image
                src="/icons/more-vertical.svg"
                alt=""
                width={4}
                height={16}
                unoptimized
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="font-body">
            <DropdownMenuItem
              onSelect={() => signOutFormRef.current?.requestSubmit()}
            >
              <LogOut /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-brand-border bg-brand-surface px-4 font-body lg:hidden">
        <Link href="/candidate/dashboard" className="text-lg font-semibold text-brand-primary">
          Just Be You.
        </Link>
        <Button
          variant="ghost"
          size="icon"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="text-brand-ink"
        >
          {open ? <X /> : <Menu />}
        </Button>
      </header>

      {/* Backdrop (mobile drawer only) */}
      {open ? (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-brand-ink/40 lg:hidden"
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[255px] flex-col border-r border-brand-border bg-brand-surface font-body transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0"
        )}
      >
        {nav}
      </aside>
    </>
  );
}
