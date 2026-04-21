import { getServerSession } from "next-auth";
import { type NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/server/auth-options";

// Temporary debug endpoint — remove after auth is confirmed working.
// Returns sanitized env state and session info (no secrets exposed).
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);

  return NextResponse.json({
    env: {
      NODE_ENV: process.env.NODE_ENV,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "NOT_SET",
      AUTH_SECRET: process.env.AUTH_SECRET ? "SET" : "MISSING",
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "SET" : "MISSING",
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? "SET" : "MISSING",
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? "SET" : "MISSING"
    },
    session: session
      ? {
          user: {
            email: session.user?.email ?? null,
            name: session.user?.name ?? null,
            id: (session.user as { id?: string })?.id ?? null
          },
          expires: session.expires
        }
      : null,
    providers: (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
      ? ["google"]
      : []
  });
}
