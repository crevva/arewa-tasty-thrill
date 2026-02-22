import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2)
});

export const productSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().min(6),
  base_price: z.coerce.number().int().min(0),
  active: z.coerce.boolean(),
  in_stock: z.coerce.boolean(),
  category_id: z.string().uuid()
});

export const zoneSchema = z.object({
  country: z.string().min(2),
  state: z.string().min(2),
  city: z.string().min(2),
  zone: z.string().min(2),
  fee: z.coerce.number().int().min(0),
  eta_text: z.string().min(3),
  active: z.coerce.boolean()
});

export const cmsPageSchema = z.object({
  slug: z.string().min(2),
  title: z.string().min(2),
  seo_title: z.string().optional(),
  seo_description: z.string().optional(),
  markdown: z.string().min(3),
  published: z.coerce.boolean()
});

export const eventRequestUpdateSchema = z.object({
  status: z.string().min(2)
});
