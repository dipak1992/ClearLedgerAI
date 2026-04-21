import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().optional(),
  NEON_DATABASE_URL: z.string().optional(),
  NEON_DATABASE_URL_UNPOOLED: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  AUTH_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  EMAIL_SERVER: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  OPENAI_API_KEY: z.string().optional()
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  NEON_DATABASE_URL: process.env.NEON_DATABASE_URL,
  NEON_DATABASE_URL_UNPOOLED: process.env.NEON_DATABASE_URL_UNPOOLED,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  EMAIL_SERVER: process.env.EMAIL_SERVER,
  EMAIL_FROM: process.env.EMAIL_FROM,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY
});
