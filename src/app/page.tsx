export const dynamic = "force-dynamic";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { prisma } from "@/lib/db";
import { Emblem } from "@/components/brand/Emblem";
import { NewsletterBlock } from "@/components/shared/NewsletterBlock";
import { DomainGrid } from "@/components/shared/DomainGrid";
import Image from "next/image";

async function getHomeData() {
  try {
    const [featuredArticle, latestPapers, categories] = await Promise.all([
      prisma.article.findFirst({
        where: { status: "PUBLISHED" },
        orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
        include: { category: true },
      }),
      prisma.paper.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { publishedAt: "desc" },
        take: 3,
        include: { category: true },
      }),
      prisma.category.findMany({
        where: { visible: true },
        orderBy: { sortOrder: "asc" },
      }),
    ]);
    return { featuredArticle, latestPapers, categories };
  } catch (error) {
    console.error("Failed to fetch homepage data:", error);
    return { featuredArticle: null, latestPapers: [], categories: [] };
  }
}

export default async function HomePage() {
  const { featuredArticle, latestPapers, categories } = await getHomeData();

  return (
    <div className="min-h-[100dvh] pb-24 md:pb-0" style={{ background: "var(--bg)" }}>
      {/* Hero Section */}
      <section className="container-anv pt-3 pb-5">
        {featuredArticle ? (
          <FeaturedHero article={featuredArticle} />
        ) : (
          <EmptyHero />
        )}
      </section>

      {/* Browse by Domain */}
      <section className="container-anv py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-ui text-[11px] font-semibold tracking-[0.18em] uppercase" style={{ color: "var(--gold)" }}>
            Browse by Domain
          </h2>
          <Link href="/search" className="font-ui text-[11px] font-medium flex items-center gap-1 transition-colors hover:opacity-70" style={{ color: "var(--gold)" }}>
            View all <ArrowRight size={12} />
          </Link>
        </div>
        <DomainGrid categories={categories} />
      </section>

      {/* Papers Archive Preview */}
      <section className="container-anv py-4">
        <div
          className="rounded-[20px] overflow-hidden flex"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", minHeight: "140px" }}
        >
          {/* Left image */}
          <div
            className="hidden md:block w-40 shrink-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/admin_sidebar_bg.jpg')" }}
          />
          {/* Content */}
          <div className="flex flex-1 items-center justify-between gap-4 p-5 md:p-6">
            <div>
              <span className="font-ui text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: "var(--gold)" }}>
                Papers Archive
              </span>
              <h3 className="font-display text-xl md:text-2xl mt-1" style={{ color: "var(--ink)" }}>
                Explore peer-reviewed research
              </h3>
              <p className="font-body text-sm mt-1" style={{ color: "var(--muted)" }}>
                {latestPapers.length > 0
                  ? "Curated papers across disciplines and time."
                  : "New research will be added to the archive soon."}
              </p>
              <Link href="/papers" className="inline-flex items-center gap-1.5 font-ui text-sm font-medium mt-3 transition-colors hover:opacity-70" style={{ color: "var(--gold)" }}>
                Explore Archive <ArrowRight size={14} />
              </Link>
            </div>
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "var(--surface-soft)", border: "1px solid var(--border)" }}
            >
              <BookOpen size={22} style={{ color: "var(--gold)" }} />
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="container-anv py-4 pb-8">
        <NewsletterBlock />
      </section>
    </div>
  );
}

function FeaturedHero({ article }: { article: any }) {
  return (
    <div className="card-anv overflow-hidden">
      <div className="relative min-h-[340px] md:min-h-[460px] flex flex-col justify-end p-6 md:p-10">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: article.heroImageUrl
              ? `url(${article.heroImageUrl})`
              : "url('/homepage_hero.jpg')",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to right, rgba(7,17,21,0.88) 0%, rgba(7,17,21,0.3) 60%, transparent 100%)",
          }}
        />
        <div className="relative z-10 max-w-xl">
          <span className="font-ui text-[10px] font-semibold tracking-[0.22em] uppercase mb-2 block" style={{ color: "var(--gold)" }}>
            Featured Essay
          </span>
          <h1 className="font-display text-3xl md:text-4xl lg:text-5xl leading-[1.0]" style={{ color: "#f8ead2" }}>
            {article.title}
          </h1>
          {article.subtitle && (
            <p className="font-body mt-2 text-sm md:text-base" style={{ color: "rgba(248,234,210,0.75)" }}>
              {article.subtitle}
            </p>
          )}
          <div className="flex items-center gap-3 mt-5">
            <Link href={`/articles/${article.slug}`} className="btn-primary text-sm py-2.5 px-5">
              Read Essay <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyHero() {
  return (
    <div className="card-anv overflow-hidden">
      <div
        className="relative min-h-[340px] md:min-h-[420px] flex flex-col justify-center bg-cover bg-center"
        style={{ backgroundImage: "url('/homepage_hero.jpg')" }}
      >
        {/* Gradient overlay — heavier on the left so text is legible */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to right, color-mix(in srgb, var(--bg) 82%, transparent) 0%, color-mix(in srgb, var(--bg) 40%, transparent) 55%, transparent 100%)",
          }}
        />

        <div className="relative z-10 p-6 md:p-10 max-w-sm">
          <span className="font-ui text-[10px] font-semibold tracking-[0.22em] uppercase mb-2 block" style={{ color: "var(--gold)" }}>
            Featured Essay
          </span>
          {/* Thin gold decorative line */}
          <div className="flex items-center gap-2 mb-3">
            <div className="h-[1px] w-10" style={{ background: "var(--gold)" }} />
            <Emblem size={20} className="opacity-60" />
            <div className="h-[1px] w-10" style={{ background: "var(--gold)" }} />
          </div>
          <h1 className="font-display text-3xl md:text-4xl leading-[1.05]" style={{ color: "var(--ink)" }}>
            Your latest essay<br />appears here
          </h1>
          <p className="font-body text-sm italic mt-2" style={{ color: "var(--muted)" }}>
            Awaiting publication
          </p>
          <Link href="/submit" className="btn-primary mt-5 inline-flex text-sm py-2.5 px-5">
            Continue Draft <ArrowRight size={14} />
          </Link>
        </div>

        {/* Carousel dots */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-10">
          <span className="w-2 h-2 rounded-full" style={{ background: "var(--gold)" }} />
          <span className="w-2 h-2 rounded-full" style={{ background: "var(--border)" }} />
          <span className="w-2 h-2 rounded-full" style={{ background: "var(--border)" }} />
        </div>
      </div>
    </div>
  );
}
