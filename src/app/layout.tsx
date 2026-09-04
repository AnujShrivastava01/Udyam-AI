import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { LayoutShell } from "@/components/layout-shell";
import { SmoothScroll } from "@/components/smooth-scroll";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-heading",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UdyamAI | Smart India Hackathon #26091",
  description: "AI-Driven Hyper-Local Business Advisory and Financial Structuring Assistant for Rural Micro-Entrepreneurs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <SmoothScroll>
          <LayoutShell>
            {children}
          </LayoutShell>
        </SmoothScroll>
      </body>
    </html>
  );
}

