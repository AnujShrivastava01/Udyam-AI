import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { LayoutShell } from "@/components/layout-shell";
import { SmoothScroll } from "@/components/smooth-scroll";
import { StoreHydration } from "@/components/store-hydration";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

// The variable used to be called --font-heading, which collided with the Tailwind theme token of
// the same name declared in globals.css. Both land on :root at equal specificity, so which one won
// depended on stylesheet order — and the theme token won, meaning Outfit was downloaded on every
// page and never drawn. Naming the font variable after the font removes the collision.
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "UdyamAI — what you can repay, not what you can borrow",
    template: "%s · UdyamAI",
  },
  description:
    "AI business advisory and financial structuring for rural micro-entrepreneurs. Joins NABARD gestation periods to NSFDC repayment terms to show whether a loan is survivable before the enterprise earns. Built for Smart India Hackathon 2026, SIH26091.",
  applicationName: "UdyamAI",
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
  // lang is corrected on the client once the locale is known (LayoutShell). It cannot be correct
  // here: the store is not read on the server, so the server does not know which language this
  // visitor last chose.
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <StoreHydration />
        <SmoothScroll>
          <LayoutShell>{children}</LayoutShell>
        </SmoothScroll>
      </body>
    </html>
  );
}
