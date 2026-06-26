"use client";

import { Link } from "wouter";

// Custom colored SVG icons for each domain
function PhilosophyIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
      <ellipse cx="18" cy="20" rx="8" ry="5" stroke="#a87c2b" strokeWidth="1.8" />
      <path d="M18 8 C14 12 10 14 10 20" stroke="#a87c2b" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M18 8 C22 12 26 14 26 20" stroke="#a87c2b" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M13 16 C14 12 18 10 22 12" stroke="#a87c2b" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <circle cx="18" cy="8" r="2.5" fill="#a87c2b" opacity="0.7" />
      <line x1="12" y1="28" x2="24" y2="28" stroke="#a87c2b" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
      <path d="M12 28 L12 18 Q12 10 18 10 Q24 10 24 18 L24 28" stroke="#b85c3a" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M9 28 L27 28" stroke="#b85c3a" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 20 L12 20" stroke="#b85c3a" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M24 20 L28 20" stroke="#b85c3a" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M14 18 L22 18" stroke="#b85c3a" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M15 22 L21 22" stroke="#b85c3a" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="18" cy="10" r="2" fill="#b85c3a" />
    </svg>
  );
}

function PsychologyIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
      <path d="M14 28 Q10 22 12 16 Q14 8 20 8 Q27 8 27 16 Q27 22 22 26 L22 28" stroke="#7c5c9e" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <line x1="14" y1="28" x2="22" y2="28" stroke="#7c5c9e" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M20 14 Q22 17 20 20 Q18 17 20 14Z" stroke="#7c5c9e" strokeWidth="1.2" fill="#7c5c9e" opacity="0.4" />
      <path d="M20 20 Q22 22 21 24" stroke="#7c5c9e" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <circle cx="20" cy="14" r="1.5" fill="#7c5c9e" opacity="0.8" />
    </svg>
  );
}

function SociologyIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
      <circle cx="18" cy="18" r="10" stroke="#4a8a5c" strokeWidth="1.8" fill="none" />
      <circle cx="18" cy="12" r="2.2" fill="#4a8a5c" />
      <circle cx="24" cy="20" r="2.2" fill="#4a8a5c" />
      <circle cx="12" cy="20" r="2.2" fill="#4a8a5c" />
      <circle cx="18" cy="25" r="2.2" fill="#4a8a5c" />
      <line x1="18" y1="14" x2="23" y2="18" stroke="#4a8a5c" strokeWidth="1.2" />
      <line x1="18" y1="14" x2="13" y2="18" stroke="#4a8a5c" strokeWidth="1.2" />
      <line x1="23" y1="22" x2="18" y2="23" stroke="#4a8a5c" strokeWidth="1.2" />
      <line x1="13" y1="22" x2="18" y2="23" stroke="#4a8a5c" strokeWidth="1.2" />
    </svg>
  );
}

function ScienceIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
      <circle cx="18" cy="18" r="3.5" fill="#5c8a6e" />
      <ellipse cx="18" cy="18" rx="12" ry="5" stroke="#5c8a6e" strokeWidth="1.6" fill="none" />
      <ellipse cx="18" cy="18" rx="12" ry="5" stroke="#5c8a6e" strokeWidth="1.6" fill="none" transform="rotate(60 18 18)" />
      <ellipse cx="18" cy="18" rx="12" ry="5" stroke="#5c8a6e" strokeWidth="1.6" fill="none" transform="rotate(120 18 18)" />
    </svg>
  );
}

function GeopoliticsIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
      <circle cx="18" cy="18" r="11" stroke="#3a72a8" strokeWidth="1.8" fill="none" />
      <ellipse cx="18" cy="18" rx="6" ry="11" stroke="#3a72a8" strokeWidth="1.4" fill="none" />
      <line x1="7" y1="18" x2="29" y2="18" stroke="#3a72a8" strokeWidth="1.4" />
      <line x1="9" y1="12" x2="27" y2="12" stroke="#3a72a8" strokeWidth="1" opacity="0.6" />
      <line x1="9" y1="24" x2="27" y2="24" stroke="#3a72a8" strokeWidth="1" opacity="0.6" />
    </svg>
  );
}

function PapersIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
      <path d="M22 8 L28 14 L28 30 L8 30 L8 8 Z" stroke="#a87c2b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M22 8 L22 14 L28 14" stroke="#a87c2b" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <line x1="13" y1="19" x2="23" y2="19" stroke="#a87c2b" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="13" y1="23" x2="23" y2="23" stroke="#a87c2b" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="13" y1="15" x2="19" y2="15" stroke="#a87c2b" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
      <rect x="8" y="8" width="20" height="6" rx="2" stroke="#5c8a6e" strokeWidth="1.8" fill="none" />
      <rect x="8" y="17" width="20" height="11" rx="2" stroke="#5c8a6e" strokeWidth="1.8" fill="none" />
      <line x1="14" y1="23" x2="22" y2="23" stroke="#5c8a6e" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="14" y1="11" x2="22" y2="11" stroke="#5c8a6e" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

const DOMAIN_DATA = [
  { slug: "philosophy", name: "Philosophy", Icon: PhilosophyIcon, accent: "#a87c2b", href: "/categories/philosophy" },
  { slug: "history",    name: "History",    Icon: HistoryIcon,    accent: "#b85c3a", href: "/categories/history" },
  { slug: "psychology", name: "Psychology", Icon: PsychologyIcon, accent: "#7c5c9e", href: "/categories/psychology" },
  { slug: "sociology",  name: "Sociology",  Icon: SociologyIcon,  accent: "#4a8a5c", href: "/categories/sociology" },
  { slug: "science",    name: "Science",    Icon: ScienceIcon,    accent: "#5c8a6e", href: "/categories/science" },
  { slug: "geopolitics",name: "Geopolitics",Icon: GeopoliticsIcon,accent: "#3a72a8", href: "/categories/geopolitics" },
  { slug: "papers",     name: "Papers",     Icon: PapersIcon,     accent: "#a87c2b", href: "/papers" },
  { slug: "archive",    name: "Archive",    Icon: ArchiveIcon,    accent: "#5c8a6e", href: "/archive" },
];

interface DomainGridProps {
  categories?: any[];
}

export function DomainGrid({ categories = [] }: DomainGridProps) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {DOMAIN_DATA.map((domain) => (
        <a
          key={domain.slug}
          href={domain.href}
          className="flex flex-col items-center justify-center gap-2.5 py-5 px-2 rounded-2xl transition-all duration-200 hover:translate-y-[-2px] hover:shadow-md"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          <domain.Icon />
          <span className="font-ui text-[11px] font-medium text-center" style={{ color: "var(--ink)" }}>
            {domain.name}
          </span>
          <span
            className="block w-6 rounded-full"
            style={{ height: "2px", background: domain.accent }}
          />
        </a>
      ))}
    </div>
  );
}
