import type { Metadata } from "next";
import Script from "next/script";
import { Inter, Noto_Sans_Devanagari, Outfit } from "next/font/google";
import "./globals.css";
import { LayoutShell } from "@/components/layout-shell";
import { SmoothScroll } from "@/components/smooth-scroll";
import { StoreHydration } from "@/components/store-hydration";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

/**
 * Inter carries no Devanagari glyphs.
 *
 * The app defaults to Hinglish and offers Hindi, so a large share of what it renders was falling
 * through to whatever the browser happened to pick — typically a system face with different
 * metrics, which is why Hindi headings sat at a visibly different weight and height from their
 * English equivalents. This is listed second in the stack, so Latin text still uses Inter and only
 * Devanagari codepoints reach here.
 */
const devanagari = Noto_Sans_Devanagari({
  variable: "--font-devanagari",
  subsets: ["devanagari", "latin"],
  weight: ["400", "500", "600", "700"],
});

// The variable used to be called --font-heading, which collided with the Tailwind theme token of
// the same name declared in globals.css. Both land on :root at equal specificity, so which one won
// depended on stylesheet order — and the theme token won, meaning Outfit was downloaded on every
// page and never drawn. Naming the font variable after the font removes the collision.
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const viewport = {
  themeColor: "#0d9488",
};

export const metadata: Metadata = {
  title: {
    default: "UdyamAI — what you can repay, not what you can borrow",
    template: "%s · UdyamAI",
  },
  description:
    "AI business advisory and financial structuring for rural micro-entrepreneurs. Joins NABARD gestation periods to NSFDC repayment terms to show whether a loan is survivable before the enterprise earns. Built for Smart India Hackathon 2026, SIH26091.",
  applicationName: "UdyamAI",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "UdyamAI — what you can repay, not what you can borrow",
    description:
      "The Solvency Clock: how many rupees fall due before the first rupee of income arrives.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // lang is corrected on the client once the locale is known, and LayoutShell also toggles the
  // dark class here from the OS preference — both are attributes the server cannot know, which is
  // exactly what suppressHydrationWarning is for.
  return (
    <html
      lang="en"
      className={`${inter.variable} ${devanagari.variable} ${outfit.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        {/*
          Paint the theme before React runs.

          The store rehydrates in an effect after mount, so a user whose saved theme is dark would
          otherwise get a full cream page first and a flash to dark a frame later — on the one
          setting whose entire purpose is not being blinded. This reads the same persisted key and
          sets the class synchronously, before first paint. It is wrapped in try/catch because
          localStorage throws outright in some privacy modes, and a theme preference is never worth
          a blank page.
        */}
        <Script id="theme-boot" strategy="beforeInteractive">
          {`try{var s=JSON.parse(localStorage.getItem('siddhi.session')||'{}');var t=(s.state&&s.state.theme)||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}`}
        </Script>
        <StoreHydration />
        <SmoothScroll>
          <LayoutShell>{children}</LayoutShell>
        </SmoothScroll>
      </body>
    </html>
  );
}
