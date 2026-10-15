/*
  Domain icon set: monoline on a 32-unit grid, 2-unit padding, round caps
  and joins, currentColor only. The <svg> wrapper (viewBox, stroke and
  size) lives in AnimalGlyph; these strings are the inner shapes only.
*/
export const DOMAIN_ICON_MARKUP = {
  philosophy:
    '<path d="M16 4.5C19 8 20.5 10.75 20.5 13.5a4.5 4.5 0 0 1-9 0c0-2.75 1.5-5.5 4.5-9z"/><path d="M16 11.75c.75 1 1 1.75 1 2.75a1 1 0 0 1-2 0c0-1 .25-1.75 1-2.75z" fill="currentColor"/><line x1="16" y1="18" x2="16" y2="20.5"/><path d="M5 18.5C9 20 12.5 20.5 16 20.5S23 20 27 18.5C25.5 23.75 21.25 27 16 27S6.5 23.75 5 18.5z"/>',
  history:
    '<path d="M6.5 5h19M6.5 27h19"/><path d="M10 5c0 6 5 8 5 11s-5 5-5 11M22 5c0 6-5 8-5 11s5 5 5 11"/><path d="M12 27c1.2-2.4 2.5-3.6 4-3.6s2.8 1.2 4 3.6"/>',
  psychology:
    '<path d="M10 27.5V21.5A9 9 0 1 1 24 14L26.5 16.5H24V21.5H20V27.5"/><path d="M11.5 9.5V11.5A3.5 3.5 0 0 0 18.5 11.5V9.5M15 8V18.5"/>',
  sociology:
    '<polygon points="10,6 13,11.25 7,11.25"/><circle cx="22.5" cy="9" r="2.5"/><path d="M11.71 9H20M16 9v11.5M8 21v-5h16v5"/><circle cx="8" cy="23.5" r="2.5"/><polygon points="16,20.5 19,25.75 13,25.75"/><circle cx="24" cy="23.5" r="2.5"/>',
  science:
    '<polygon points="8.06,13.74 22.59,4.85 25.41,10.15 9.94,17.26"/><path d="M19.17 6.95l2.6 4.86M9 15.5l-2.5 1.33"/><path d="M17 14l-5.5 13.5M17 14v13.5M17 14l5.5 13.5"/>',
  geopolitics:
    '<circle cx="16" cy="19" r="9"/><ellipse cx="16" cy="19" rx="3.75" ry="9"/><path d="M7 19h18"/><path d="M16 10V4h6.5l-1.75 2.25 1.75 2.25H16"/>',
  papers:
    '<path d="M10.5 8V5.5a1 1 0 0 1 1-1H24a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1h-2.5"/><rect x="7" y="8" width="14.5" height="20" rx="1"/><path d="M10.25 13.5h8M10.25 18h8M10.25 22.5h4.5"/>',
  archive:
    '<path d="M5 25.5h22"/><rect x="5.75" y="6.5" width="4.5" height="19" rx="1"/><polygon points="15.55,25.5 19.78,23.96 14.48,9.39 10.25,10.93"/><rect x="21.75" y="9.5" width="4.5" height="16" rx="1"/><path d="M5.75 10.5h4.5M21.75 13.5h4.5M11.62 14.69l4.23-1.54"/>',
  "civilizational-thought":
    '<path d="M4.5 28H27.5"/><path d="M8.5 28V20.5H23.5V28"/><path d="M10 20.5A15 15 0 0 1 14 8M18 8A15 15 0 0 1 22 20.5"/><rect x="12.5" y="5.5" width="7" height="2.5" rx="1.25"/><path d="M16 5.5V3"/><path d="M10.05 16H21.95M11.27 12H20.73"/><path d="M14 28V24.5A2 2 0 0 1 18 24.5V28"/>',
  aesthetics:
    '<path d="M16 6.5C19.4 9.8 19.6 17 16 21.5C12.4 17 12.6 9.8 16 6.5Z"/><path d="M16 21.5C10.8 21.2 7.3 17.3 7.5 11.5C10.2 12.2 12.3 13.6 13.5 15.3"/><path d="M16 21.5C21.2 21.2 24.7 17.3 24.5 11.5C21.8 12.2 19.7 13.6 18.5 15.3"/><path d="M13.5 21.05C9 23.2 5 21.5 3.5 18C5.8 17.4 7.7 17.6 9.3 18"/><path d="M18.5 21.05C23 23.2 27 21.5 28.5 18C26.2 17.4 24.3 17.6 22.7 18"/><path d="M10 25.5h12"/>',
  "sanskrit-studies":
    '<path d="M5 6h22M23 6v20M10.5 15.5H23"/><path d="M7 11C8 9.7 9.6 9 11 9C13 9 14.5 10.4 14.5 12.25C14.5 14.1 12.8 15.5 10.5 15.5C14.2 15.5 17 17.9 17 20.8C17 23.7 14.6 26 11.5 26C9.6 26 7.9 25.2 6.8 23.9"/>',
  "political-theory":
    '<circle cx="16" cy="6" r="1.5"/><path d="M16 7.5V27M11.5 27h9M7 10.5h18"/><path d="M3.5 20.5 7 10.5l3.5 10"/><path d="M3.5 20.5h7a3.5 3 0 0 1-7 0z"/><path d="M21.5 20.5 25 10.5l3.5 10"/><path d="M21.5 20.5h7a3.5 3 0 0 1-7 0z"/>',
  translations:
    '<path d="M3.75 15.5 8.75 4l5 11.5M5.27 12h6.96"/><path d="M16 17h12.1M25.9 17v11M19.02 22.23h6.88"/><path d="M17.1 19.75C17.65 19.04 18.53 18.65 19.3 18.65C20.4 18.65 21.23 19.42 21.23 20.44C21.23 21.46 20.29 22.23 19.02 22.23C21.06 22.23 22.6 23.55 22.6 25.14C22.6 26.74 21.28 28 19.58 28C18.53 28 17.6 27.56 16.99 26.85"/><path d="M17.25 6h4.5a3.5 3.5 0 0 1 3.5 3.5V13M23 10.75l2.25 2.25 2.25-2.25"/><path d="M14.25 26h-4.5a3.5 3.5 0 0 1-3.5-3.5V19M4 21.25l2.25-2.25 2.25 2.25"/>',
  multimedia:
    '<rect x="4.5" y="5" width="23" height="16" rx="2"/><path d="M14 9.25v7.5L20.5 13z"/><path d="M4.5 25.5H12M15 25.5h12.5"/><circle cx="13.5" cy="25.5" r="1.5"/>',
  community:
    '<path d="M13 4.5h6a2 2 0 0 1 2 2V9a2 2 0 0 1-2 2h-1.5L16 13l-1.5-2H13a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2z"/><circle cx="10" cy="16.75" r="2.75"/><path d="M5 27.5c0-3 2.2-5.5 5-5.5s5 2.5 5 5.5"/><circle cx="22" cy="16.75" r="2.75"/><path d="M17 27.5c0-3 2.2-5.5 5-5.5s5 2.5 5 5.5"/>',
  submit:
    '<path d="M16 4c2.25 3 5.5 6.25 5.5 10l-2 6h-7l-2-6c0-3.75 3.25-7 5.5-10z"/><path d="M16 4v7.75"/><circle cx="16" cy="13" r="1.25"/><path d="M5.5 21.5v4a2 2 0 0 0 2 2h17a2 2 0 0 0 2-2v-4"/>',
  compass:
    '<circle cx="16" cy="16" r="11"/><polygon points="16,8.5 18.5,16 16,23.5 13.5,16"/><path d="M13.5 16h5"/><path d="M5 16h2.5M24.5 16H27"/>',
} as const;

export type DomainIconKey = keyof typeof DOMAIN_ICON_MARKUP;
