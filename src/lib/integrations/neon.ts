import { env } from "@/lib/env";

export function getNeonConnectionString() {
  return env.DATABASE_URL ?? env.NEON_DATABASE_URL ?? null;
}

export function getNeonDirectConnectionString() {
  return env.NEON_DATABASE_URL_UNPOOLED ?? null;
}
