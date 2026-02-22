import { z } from "zod";

export const cartItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(25)
});

export const quoteSchema = z.object({
  deliveryZoneId: z.string().uuid(),
  items: z.array(cartItemSchema).min(1)
});

export const checkoutSchema = quoteSchema.extend({
  customer: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(7)
  }),
  address: z.object({
    street: z.string().min(3),
    area: z.string().min(2),
    landmark: z.string().optional().default(""),
    notes: z.string().optional().default("")
  }),
  paymentProvider: z.enum(["paystack", "stripe", "paypal", "flutterwave"])
});

export const orderLookupSchema = z.object({
  orderCode: z.string().regex(/^AT-[A-Z0-9]{8}$/),
  emailOrPhone: z.string().min(5)
});

export const claimOrdersSchema = z.object({
  phoneHint: z.string().optional()
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type QuoteInput = z.infer<typeof quoteSchema>;
