import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { AnimalGlyph } from "@/components/glyphs/AnimalGlyph";
import { Button } from "@/components/ui/Button";

export function NotFoundPage() {
  return (
    <AppShell>
      <div className="container py-24 flex flex-col items-center text-center gap-6 max-w-lg mx-auto">
        <div className="w-20 h-20 flex items-center justify-center rounded-full bg-[var(--color-parchment-dark)] text-[var(--color-muted)]">
          <AnimalGlyph glyph="tortoise" size={40} />
        </div>

        <div>
          <p className="eyebrow mb-2">404 — Lost in the archive</p>
          <h1 className="font-[var(--font-display)] text-3xl font-bold text-[var(--color-ink)] mb-3">
            This page hasn't been written yet.
          </h1>
          <p className="text-[var(--color-muted)] leading-relaxed">
            The page you're looking for may have moved, been renamed, or never existed.
            Let's find your way back to the inquiry.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
          <Button as="a" href="/" variant="primary" size="lg">
            Return home
          </Button>
          <Button as="a" href="/search" variant="ghost" size="lg">
            Search the archive
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
