import type { Metadata, Viewport } from "next";
import { Caveat, Fraunces } from "next/font/google";
import { BRAND } from "@/lib/brand";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" });
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap" });

export const metadata: Metadata = {
  title: { default: BRAND.name, template: `%s · ${BRAND.name}` },
  description: BRAND.tagline,
  applicationName: BRAND.name,
  appleWebApp: {
    capable: true,
    title: BRAND.name,
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5efe3" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1a17" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`h-full antialiased ${fraunces.variable} ${caveat.variable}`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
