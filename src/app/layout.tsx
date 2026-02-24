import "./globals.css";

import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ToastProvider } from "@/components/feedback/toast-provider";
import { CartProvider } from "@/components/store/cart-provider";
import { ThemeProvider } from "@/components/theme/theme-provider";
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

const themeScript = `
(() => {
  const storageKey = "theme";
  const root = document.documentElement;

  try {
    const stored = localStorage.getItem(storageKey);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolved = stored === "light" || stored === "dark" ? stored : prefersDark ? "dark" : "light";

    root.classList.toggle("dark", resolved === "dark");
    root.style.colorScheme = resolved;
  } catch {
    root.classList.remove("dark");
    root.style.colorScheme = "light";
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${manrope.variable} ${fraunces.variable} font-body antialiased`}>
        <ThemeProvider>
          <ToastProvider>
            <CartProvider>
              <div className="min-h-screen bg-background text-foreground">
                <SiteHeader />
                <main>{children}</main>
                <SiteFooter />
              </div>
            </CartProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
