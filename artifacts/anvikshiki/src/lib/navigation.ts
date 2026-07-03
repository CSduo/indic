import type { DomainKey } from "./domainMeta";

export interface NavLink {
  label: string;
  href: string;
  icon?: string;        // lucide icon name hint
  glyph?: DomainKey;    // domain for abstract mark
  section?: "main" | "account" | "admin";
}

export const PUBLIC_NAV_LINKS: NavLink[] = [
  { label: "Home",      href: "/",          section: "main" },
  { label: "Explore",   href: "/browse",    section: "main" },
  { label: "Domains",   href: "/domains",   section: "main" },
  { label: "Papers",    href: "/papers",    section: "main" },
  { label: "Archive",   href: "/archive",   section: "main" },
  { label: "Search",    href: "/search",    section: "main" },
  { label: "Submit",    href: "/submit",    section: "main" },
  { label: "Community", href: "/community", section: "main" },
  { label: "About",     href: "/about",     section: "main" },
  { label: "Contact",   href: "/contact",   section: "main" },
];

export const ACCOUNT_NAV_LINKS: NavLink[] = [
  { label: "Account",    href: "/account",  section: "account" },
  { label: "Saved Items", href: "/saved",   section: "account" },
];

export const ADMIN_NAV_LINK: NavLink = {
  label: "Admin Panel",
  href: "/admin",
  section: "admin",
};
