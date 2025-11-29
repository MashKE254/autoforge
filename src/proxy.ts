import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login", // Redirect to our custom login page
  },
});

export const config = {
  // Protect these routes
  matcher: [
    "/dashboard/:path*",
    "/generate/:path*",
    "/account/:path*",
    "/projects/:path*",
    // Add any other private paths here
  ],
};