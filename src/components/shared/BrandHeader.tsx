"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { Emblem } from "@/components/brand/Emblem";
import { Wordmark } from "@/components/brand/Wordmark";
import { ThemeToggle } from "@/components/brand/ThemeToggle";

export function BrandHeader() {
  return (
    <header className="relative z-20">
      {/* Shared single header for both mobile and desktop */}
      <div className="container-anv">
        <div className="flex items-center justify-between py-3 md:py-4">
          {/* Left: Logo + Wordmark */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <Emblem size={48} />
            <Wordmark />
          </Link>

          {/* Right: Search + Theme toggle */}
          <div className="flex items-center gap-2">
            <Link
              href="/search"
              className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-[var(--surface-soft)]"
              aria-label="Search"
            >
              <Search size={18} style={{ color: "var(--muted)" }} />
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
