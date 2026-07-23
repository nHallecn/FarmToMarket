"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  BarChart3,
  Bell,
  BookOpen,
  Boxes,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  FileClock,
  Handshake,
  LayoutDashboard,
  LifeBuoy,
  ListFilter,
  LogOut,
  Menu,
  MessageSquareWarning,
  PackageCheck,
  ReceiptText,
  Search,
  Settings,
  ShoppingBasket,
  Store,
  Truck,
  UserRound,
  Wheat,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AiCopilot } from "@/components/platform/ai-copilot";
import { Brand } from "@/components/public/brand";
import { useApp } from "@/components/providers/app-provider";
import type { UserRole } from "@/lib/domain";

type PlatformRole = Extract<UserRole, "farmer" | "buyer" | "operations">;

type NavigationItem = {
  label: string;
  href: string;
  section: string;
  icon: LucideIcon;
};

const NAVIGATION: Record<PlatformRole, NavigationItem[]> = {
  farmer: [
    { label: "Overview", href: "/farmer/dashboard", section: "dashboard", icon: LayoutDashboard },
    { label: "My supply", href: "/farmer/supply", section: "supply", icon: Wheat },
    { label: "Buyer requests", href: "/farmer/requests", section: "requests", icon: ListFilter },
    { label: "My quotes", href: "/farmer/quotes", section: "quotes", icon: ReceiptText },
    { label: "Orders", href: "/farmer/orders", section: "orders", icon: PackageCheck },
    { label: "Settlements", href: "/farmer/payments", section: "payments", icon: CircleDollarSign },
    { label: "Notifications", href: "/farmer/notifications", section: "notifications", icon: Bell },
    { label: "Profile & verification", href: "/farmer/profile", section: "profile", icon: UserRound },
  ],
  buyer: [
    { label: "Overview", href: "/buyer/dashboard", section: "dashboard", icon: LayoutDashboard },
    { label: "Browse supply", href: "/buyer/marketplace", section: "marketplace", icon: Store },
    { label: "My demands", href: "/buyer/demands", section: "demands", icon: ShoppingBasket },
    { label: "Orders", href: "/buyer/orders", section: "orders", icon: PackageCheck },
    { label: "Payments & receipts", href: "/buyer/payments", section: "payments", icon: ReceiptText },
    { label: "Notifications", href: "/buyer/notifications", section: "notifications", icon: Bell },
    { label: "Business profile", href: "/buyer/profile", section: "profile", icon: UserRound },
  ],
  operations: [
    { label: "Control centre", href: "/operations/dashboard", section: "dashboard", icon: BarChart3 },
    { label: "Verifications", href: "/operations/verifications", section: "verifications", icon: BadgeCheck },
    { label: "Fulfillment", href: "/operations/fulfillment", section: "fulfillment", icon: Boxes },
    { label: "Orders", href: "/operations/orders", section: "orders", icon: ClipboardCheck },
    { label: "Logistics", href: "/operations/logistics", section: "logistics", icon: Truck },
    { label: "Reconciliation", href: "/operations/payments", section: "payments", icon: CircleDollarSign },
    { label: "Disputes", href: "/operations/disputes", section: "disputes", icon: MessageSquareWarning },
    { label: "Catalogue", href: "/operations/catalogue", section: "catalogue", icon: BookOpen },
    { label: "Audit log", href: "/operations/audit", section: "audit", icon: FileClock },
  ],
};

const roleHome: Record<PlatformRole, string> = {
  farmer: "/farmer/dashboard",
  buyer: "/buyer/dashboard",
  operations: "/operations/dashboard",
};

const roleLabel: Record<PlatformRole, string> = {
  farmer: "Farmer workspace",
  buyer: "Buyer workspace",
  operations: "Operations console",
};

export function PlatformShell({
  role,
  section,
  children,
}: {
  role: PlatformRole;
  section: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { state, currentUser, currentOrganisation, metrics, hydrated, actions } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const nav = NAVIGATION[role];

  useEffect(() => {
    if (hydrated && state.activeRole !== role) actions.switchRole(role);
  }, [actions, hydrated, role, state.activeRole]);

  const activeItem = nav.find((item) => item.section === section) ?? nav[0];
  const subtitle = useMemo(() => {
    if (role === "farmer") return "Your supply, quotes, pickups, and earnings";
    if (role === "buyer") return "Procurement without the coordination burden";
    return "One view of every transaction moving through the pilot";
  }, [role]);

  const changeRole = (nextRole: PlatformRole) => {
    actions.switchRole(nextRole);
    setProfileOpen(false);
    router.push(roleHome[nextRole]);
  };

  if (!hydrated) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--cream)]" aria-live="polite">
        <div className="flex flex-col items-center gap-4 text-[var(--forest)]">
          <span className="size-10 animate-spin rounded-full border-4 border-[var(--sage)] border-t-[var(--forest)]" />
          <p className="text-sm font-semibold">Preparing your workspace…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col border-r border-white/10 bg-[var(--forest)] text-white lg:flex">
        <div className="px-6 pb-7 pt-6">
          <Brand inverse />
          <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-[var(--lime)] font-black text-[var(--forest)]">
                {currentOrganisation?.shortName?.slice(0, 2).toUpperCase() ?? "FT"}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">
                  {currentOrganisation?.shortName ?? "FarmToMarket"}
                </p>
                <p className="mt-0.5 truncate text-xs text-white/60">{roleLabel[role]}</p>
              </div>
            </div>
            {currentOrganisation?.verificationStatus === "verified" ? (
              <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-[var(--lime)]">
                <BadgeCheck aria-hidden="true" size={14} /> Verified organisation
              </p>
            ) : null}
          </div>
        </div>

        <nav aria-label={`${roleLabel[role]} navigation`} className="hide-scrollbar flex-1 overflow-y-auto px-3 pb-4">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = item.section === activeItem.section;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`mb-1 flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-[var(--lime)] text-[var(--forest)]"
                    : "text-white/72 hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                <Icon aria-hidden="true" size={18} />
                <span>{item.label}</span>
                {item.section === "notifications" && metrics.unreadNotifications > 0 ? (
                  <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-black ${active ? "bg-[var(--forest)] text-white" : "bg-[var(--orange)] text-white"}`}>
                    {metrics.unreadNotifications}
                  </span>
                ) : null}
                {item.section === "disputes" && metrics.openDisputes > 0 ? (
                  <span className="ml-auto rounded-full bg-[var(--orange)] px-2 py-0.5 text-[11px] font-black text-white">
                    {metrics.openDisputes}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <Link href="/support" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/70 hover:bg-white/[0.08] hover:text-white">
            <LifeBuoy aria-hidden="true" size={18} /> Help & support
          </Link>
          <div className="mt-3 flex items-center gap-3 px-3">
            <span className="grid size-9 place-items-center rounded-full bg-white/12 text-sm font-bold">
              {currentUser?.firstName?.[0] ?? "U"}{currentUser?.lastName?.[0] ?? ""}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{currentUser?.displayName ?? "Demo user"}</p>
              <p className="truncate text-xs text-white/50">Pilot workspace</p>
            </div>
            <Link aria-label="Sign out" href="/login" className="text-white/55 hover:text-white">
              <LogOut aria-hidden="true" size={17} />
            </Link>
          </div>
        </div>
      </aside>

      <div className="min-w-0 lg:col-start-2">
        <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-white/92 backdrop-blur-xl">
          <div className="flex h-[72px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
              className="grid size-11 place-items-center rounded-xl border border-[var(--line)] text-[var(--forest)] lg:hidden"
            >
              <Menu aria-hidden="true" size={20} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold text-[var(--ink)] sm:text-lg">{activeItem.label}</p>
              <p className="hidden truncate text-xs text-[var(--muted)] sm:block">{subtitle}</p>
            </div>
            <button aria-label="Search workspace" className="hidden size-10 place-items-center rounded-xl text-[var(--muted)] hover:bg-[var(--cream)] sm:grid">
              <Search aria-hidden="true" size={19} />
            </button>
            <Link
              href={`/${role}/notifications`}
              aria-label={`${metrics.unreadNotifications} unread notifications`}
              className="relative grid size-10 place-items-center rounded-xl text-[var(--muted)] hover:bg-[var(--cream)]"
            >
              <Bell aria-hidden="true" size={19} />
              {metrics.unreadNotifications > 0 ? (
                <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-[var(--orange)] ring-2 ring-white" />
              ) : null}
            </Link>
            <button
              type="button"
              aria-expanded={profileOpen}
              onClick={() => setProfileOpen((open) => !open)}
              className="flex h-11 items-center gap-2 rounded-full border border-[var(--line)] bg-white pl-1.5 pr-3"
            >
              <span className="grid size-8 place-items-center rounded-full bg-[var(--forest)] text-xs font-black text-white">
                {currentUser?.firstName?.[0] ?? "U"}{currentUser?.lastName?.[0] ?? ""}
              </span>
              <ChevronDown aria-hidden="true" size={15} className="text-[var(--muted)]" />
            </button>
            {profileOpen ? (
              <div className="absolute right-4 top-[64px] w-64 rounded-2xl border border-[var(--line)] bg-white p-2 shadow-[var(--shadow-lg)]">
                <div className="border-b border-[var(--line)] px-3 py-3">
                  <p className="font-bold">{currentUser?.displayName}</p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">Switch demo workspace</p>
                </div>
                {(["buyer", "farmer", "operations"] as PlatformRole[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => changeRole(item)}
                    className={`mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold ${item === role ? "bg-[var(--sage)] text-[var(--forest)]" : "hover:bg-[var(--cream)]"}`}
                  >
                    <Handshake aria-hidden="true" size={16} /> {roleLabel[item]}
                  </button>
                ))}
                <button type="button" onClick={() => actions.setLocale(state.locale === "en" ? "fr" : "en")} className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold hover:bg-[var(--cream)]">
                  <Settings aria-hidden="true" size={16} /> {state.locale === "en" ? "Passer au français" : "Switch to English"}
                </button>
                <Link href="/login" className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50">
                  <LogOut aria-hidden="true" size={16} /> Sign out
                </Link>
              </div>
            ) : null}
          </div>
        </header>

        <main id="main-content" className="mx-auto w-full max-w-[1600px] px-4 pb-28 pt-5 sm:px-6 sm:pt-7 lg:px-8 lg:pb-10">
          {children}
        </main>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="absolute inset-0 bg-[var(--forest-strong)]/55 backdrop-blur-sm" />
          <aside className="absolute inset-y-0 left-0 flex w-[min(88vw,340px)] flex-col bg-[var(--forest)] p-4 text-white shadow-2xl">
            <div className="flex items-center justify-between px-2 py-2">
              <Brand inverse />
              <button aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="grid size-10 place-items-center rounded-full bg-white/10">
                <X aria-hidden="true" size={20} />
              </button>
            </div>
            <nav className="mt-7 flex-1 overflow-y-auto" aria-label="Mobile navigation">
              {nav.map((item) => {
                const Icon = item.icon;
                const active = item.section === activeItem.section;
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={`mb-1 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold ${active ? "bg-[var(--lime)] text-[var(--forest)]" : "text-white/75"}`}>
                    <Icon aria-hidden="true" size={18} /> {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      ) : null}

      <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-[var(--line)] bg-white px-2 pb-[max(.55rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_35px_rgba(14,45,36,.08)] lg:hidden">
        {nav.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const active = item.section === activeItem.section;
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold ${active ? "bg-[var(--sage)] text-[var(--forest)]" : "text-[var(--muted)]"}`}>
              <Icon aria-hidden="true" size={19} />
              <span className="max-w-full truncate px-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <AiCopilot role={role} section={section} />
    </div>
  );
}
