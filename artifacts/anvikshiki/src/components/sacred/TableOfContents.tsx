import React, { useEffect, useState, useCallback } from "react";
import { ChevronRight, List } from "lucide-react";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  contentRef: React.RefObject<HTMLElement | null>;
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({ contentRef }) => {
  const [headings, setHeadings] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!contentRef.current) return;
    
    const elements = Array.from(contentRef.current.querySelectorAll("h2, h3"));
    const items: TocItem[] = elements.map((el, index) => {
      if (!el.id) {
        el.id = `heading-${index}`;
      }
      return {
        id: el.id,
        text: el.textContent || "",
        level: el.tagName.toLowerCase() === "h2" ? 2 : 3,
      };
    });
    setHeadings(items);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: "0px 0px -80% 0px" }
    );

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [contentRef]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveId(id);
      setIsOpen(false);
    }
  };

  if (headings.length === 0) return null;

  return (
    <>
      <div className="table-of-contents hidden md:block">
        <h4 className="font-ui text-xs font-bold uppercase tracking-wider text-[var(--ink)] mb-4 flex items-center gap-2">
          <List size={14} /> Contents
        </h4>
        <nav className="flex flex-col gap-2">
          {headings.map((heading) => (
            <a
              key={heading.id}
              href={`#${heading.id}`}
              onClick={(e) => handleClick(e, heading.id)}
              className={`text-sm transition-colors duration-200 block ${
                heading.level === 3 ? "ml-4" : ""
              } ${
                activeId === heading.id
                  ? "text-[var(--gold-bright)] font-semibold"
                  : "text-[var(--ink-faint)] hover:text-[var(--ink)]"
              }`}
            >
              {heading.text}
            </a>
          ))}
        </nav>
      </div>

      {/* Mobile Drawer */}
      <div className="md:hidden fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="h-12 w-12 rounded-full bg-[var(--surface-elevated)] border border-[var(--border)] shadow-lg flex items-center justify-center text-[var(--ink)]"
        >
          <List size={20} />
        </button>

        {isOpen && (
          <div className="absolute bottom-16 right-0 w-64 bg-[var(--surface-elevated)] border border-[var(--border)] shadow-xl rounded-xl p-4">
            <h4 className="font-ui text-xs font-bold uppercase tracking-wider text-[var(--ink)] mb-3">
              Contents
            </h4>
            <nav className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
              {headings.map((heading) => (
                <a
                  key={heading.id}
                  href={`#${heading.id}`}
                  onClick={(e) => handleClick(e, heading.id)}
                  className={`text-sm py-1 ${
                    heading.level === 3 ? "ml-3" : ""
                  } ${
                    activeId === heading.id
                      ? "text-[var(--gold-bright)] font-semibold"
                      : "text-[var(--ink-faint)]"
                  }`}
                >
                  {heading.text}
                </a>
              ))}
            </nav>
          </div>
        )}
      </div>
    </>
  );
};
