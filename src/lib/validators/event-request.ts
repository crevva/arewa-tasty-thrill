import { z } from "zod";

export const eventRequestSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(7),
  email: z.string().email(),
  event_date: z.string().optional(),
  event_type: z.string().min(2),
  guests_estimate: z.coerce.number().int().positive().optional(),
  notes: z.string().max(2000).optional()
});
