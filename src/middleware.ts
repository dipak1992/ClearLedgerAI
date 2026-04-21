import { withAuth } from "next-auth/middleware";

export default withAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/sign-in"
  }
});

export const config = {
  matcher: []
};
