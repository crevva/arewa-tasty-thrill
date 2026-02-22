import type { MetadataRoute } from "next";

const staticRoutes = [
  "",
  "/shop",
  "/cart",
  "/checkout",
  "/order-lookup",
  "/events-catering",
  "/gallery",
  "/about",
  "/contact",
  "/faq",
  "/legal"
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const now = new Date();

  return staticRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1 : 0.7
  }));
}
