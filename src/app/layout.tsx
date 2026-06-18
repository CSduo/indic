import type { Metadata } from "next";
import { Cormorant_Garamond, Inter, Literata } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { BrandHeader } from "@/components/shared/BrandHeader";
import { MobileBottomNav } from "@/components/shared/MobileBottomNav";
import { Toaster } from "sonner";

const cormorant = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-ui",
  subsets: ["latin"],
  display: "swap",
});

const literata = Literata({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Anvikshiki - Journal & Research Platform",
    template: "%s | Anvikshiki",
  },
  description:
    "A premium intellectual journal and research platform for philosophy, history, psychology, sociology, science, geopolitics, and civilizational inquiry.",
  keywords: [
    "journal",
    "research",
    "philosophy",
    "history",
    "civilization",
    "inquiry",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="light"
      className={`${cormorant.variable} ${inter.variable} ${literata.variable}`}
    >
      <body>
        <ThemeProvider>
          <div className="min-h-[100dvh] pb-24 md:pb-0">
            <BrandHeader />
            <main>{children}</main>
            <MobileBottomNav />
          </div>
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "var(--surface)",
                color: "var(--ink)",
                border: "1px solid var(--border)",
                fontFamily: "var(--font-ui)",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
