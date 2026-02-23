import { z } from "zod";

export const inviteTokenSchema = z.object({
  token: z.string().min(16)
});

export const acceptInviteSchema = z.object({
  token: z.string().min(16),
  name: z.string().min(2),
  password: z.string().min(8)
});
