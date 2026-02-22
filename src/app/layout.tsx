import "./globals.css";

import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { CartProvider } from "@/components/store/cart-provider";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants/branding";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap"
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-clash-display",
  weight: ["600", "700"],
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_BASE_URL ?? "http://localhost:3000"),
  title: {
    default: `${APP_NAME} | ${APP_TAGLINE}`,
    template: `%s | ${APP_NAME}`
  },
  description:
    "Premium food and drinks in Lagos. Order shawarma, smoothies, juices, and combos with fast local delivery.",
  openGraph: {
    title: `${APP_NAME} | ${APP_TAGLINE}`,
    description:
      "Premium food and drinks in Lagos. Order shawarma, smoothies, juices, and combos with fast local delivery.",
    url: "/",
    siteName: APP_NAME,
    images: [
      {
        url: "/brand/logo.jpg",
        width: 150,
        height: 150,
        alt: APP_NAME
      }
    ],
    locale: "en_NG",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} | ${APP_TAGLINE}`,
    description:
      "Premium food and drinks in Lagos. Order shawarma, smoothies, juices, and combos with fast local delivery.",
    images: ["/brand/logo.jpg"]
  }
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${manrope.variable} ${fraunces.variable} font-body antialiased`}>
        <CartProvider>
          <div className="min-h-screen bg-background text-foreground">
            <SiteHeader />
            <main>{children}</main>
            <SiteFooter />
          </div>
        </CartProvider>
      </body>
    </html>
  );
}
