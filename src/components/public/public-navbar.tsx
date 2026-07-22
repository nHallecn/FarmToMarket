"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Languages, Menu, X } from "lucide-react";
import { Brand } from "./brand";

const navigation = [
  { label: "How it works", href: "#how-it-works" },
  { label: "For farmers", href: "#pathways" },
  { label: "Marketplace", href: "#marketplace" },
  { label: "Our promise", href: "#trust" },
];

export function PublicNavbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="relative z-50 border-b border-[var(--line)] bg-[var(--cream)]">
      <nav
        aria-label="Primary navigation"
        className="mx-auto flex h-[76px] w-full max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12"
      >
        <Brand />

        <div className="hidden items-center gap-8 lg:flex">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-[var(--ink)] transition-colors hover:text-[var(--forest)]"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          <span
            aria-label="Language: English"
            className="inline-flex h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-[var(--muted)]"
          >
            <Languages aria-hidden="true" className="size-4" />
            EN
          </span>
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-full px-4 text-sm font-semibold text-[var(--forest)] transition-colors hover:bg-[var(--sage)]"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="group inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--forest)] px-5 text-sm font-semibold text-[var(--white)] shadow-lg transition-transform hover:-translate-y-0.5"
          >
            Get started
            <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <button
          type="button"
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((open) => !open)}
          className="grid size-11 place-items-center rounded-full border border-[var(--line)] text-[var(--forest)] sm:hidden"
        >
          {isOpen ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
        </button>
      </nav>

      {isOpen ? (
        <div className="absolute inset-x-0 top-full border-b border-[var(--line)] bg-[var(--cream)] px-5 pb-6 pt-3 shadow-2xl sm:hidden">
          <div className="flex flex-col">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="border-b border-[var(--line)] py-4 text-base font-semibold text-[var(--ink)]"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Link
              href="/login"
              onClick={() => setIsOpen(false)}
              className="inline-flex h-12 items-center justify-center rounded-full border border-[var(--forest)] text-sm font-semibold text-[var(--forest)]"
            >
              Log in
            </Link>
            <Link
              href="/register"
              onClick={() => setIsOpen(false)}
              className="inline-flex h-12 items-center justify-center rounded-full bg-[var(--forest)] text-sm font-semibold text-[var(--white)]"
            >
              Get started
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
