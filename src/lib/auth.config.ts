import type { NextAuthConfig } from "next-auth";

/**
 * Auth config that is safe for the Edge runtime (middleware).
 * Does NOT include the credentials provider or any Node.js-only imports.
 */
export const authConfig = {
  pages: {
    signIn: "/auth",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.role = (user as any).role;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.teamId = (user as any).teamId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        session.user.role = token.role as any;
        session.user.teamId = token.teamId as string | null;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isPublicRoute = nextUrl.pathname.startsWith("/auth") || nextUrl.pathname.startsWith("/api/auth");

      if (isPublicRoute) return true;
      if (!isLoggedIn) return false;
      return true;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [], // Providers are added in the full auth.ts
} satisfies NextAuthConfig;
