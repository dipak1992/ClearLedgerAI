import { z } from "zod";

export const createWorkspaceSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(220).optional()
});
