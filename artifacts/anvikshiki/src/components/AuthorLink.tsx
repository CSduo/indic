import type { ReactNode } from "react";
import { Link } from "wouter";

/** A link to an author page, or plain text when there is no single author page. */
export function AuthorLink({ href, className, children }: { href: string | null; className?: string; children: ReactNode }) {
  return href
    ? <Link href={href} className={className}>{children}</Link>
    : <span className={className}>{children}</span>;
}
