import { withAuth } from "next-auth/middleware";

export default withAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/sign-in"
  }
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/workspaces/:path*",
    "/transactions/:path*",
    "/debts/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/api/workspaces/:path*",
    "/api/transactions/:path*",
    "/api/debts/:path*"
  ]
};
