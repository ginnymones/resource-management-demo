import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

type Role = "Associate" | "SME" | "POC" | "Manager" | "Senior_Leader" | "Admin";

/**
 * Route permission mapping.
 * Routes are checked in order - more specific routes should come first.
 */
const ROUTE_PERMISSIONS: { path: string; roles: Role[] }[] = [
  { path: "/admin/efficiency", roles: ["Admin", "SME", "POC", "Manager", "Senior_Leader"] },
  { path: "/admin", roles: ["Admin", "SME", "Manager"] },
  { path: "/help", roles: ["SME", "POC", "Manager", "Senior_Leader", "Admin"] },
  { path: "/matchmaker", roles: ["SME", "POC", "Manager", "Senior_Leader", "Admin"] },
  { path: "/requests", roles: ["SME", "POC", "Manager", "Senior_Leader", "Admin"] },
  { path: "/climate", roles: ["SME", "POC", "Manager", "Senior_Leader", "Admin"] },
  { path: "/roster", roles: ["SME", "POC", "Manager", "Senior_Leader", "Admin"] },
  { path: "/dashboard", roles: ["Associate"] },
];

const PUBLIC_ROUTES = ["/auth", "/api/auth"];

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check if user is authenticated
  if (!req.auth) {
    const signInUrl = new URL("/auth", req.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  const userRole = req.auth.user?.role as Role | undefined;

  // Redirect root path based on role
  if (pathname === "/") {
    if (userRole === "Associate") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.redirect(new URL("/climate", req.url));
  }

  // Check route-level permissions
  const matchedRoute = ROUTE_PERMISSIONS.find((route) =>
    pathname.startsWith(route.path)
  );

  if (matchedRoute && userRole) {
    if (!matchedRoute.roles.includes(userRole)) {
      // If an Associate tries to access non-associate routes, redirect to dashboard
      if (userRole === "Associate") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      const accessDeniedUrl = new URL("/access-denied", req.url);
      return NextResponse.redirect(accessDeniedUrl);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
