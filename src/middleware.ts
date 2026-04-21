import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Auth guards are handled server-side in each page component.
// This middleware is intentionally a no-op to prevent redirect loops.
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: []
};
