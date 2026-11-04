import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";
import { authConfig } from "./auth.config";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: Role;
      teamId: string | null;
    };
  }

  interface User {
    id: string;
    name: string;
    email: string;
    role: Role;
    teamId: string | null;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    teamId: string | null;
  }
}

const MAX_FAILED_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "PIN or Passphrase", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        // Validate input format: PIN (6-8 digits) or passphrase (12-128 chars)
        const isPIN = /^\d{6,8}$/.test(password);
        const isPassphrase = password.length >= 12 && password.length <= 128;

        if (!isPIN && !isPassphrase) {
          throw new Error("Invalid credential format. Use a PIN (6-8 digits) or passphrase (12-128 characters).");
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          return null;
        }

        // Check if account is locked
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          const remainingMs = user.lockedUntil.getTime() - Date.now();
          const remainingMinutes = Math.ceil(remainingMs / 60000);
          throw new Error(
            `Account locked. Try again in ${remainingMinutes} minute${remainingMinutes !== 1 ? "s" : ""}.`
          );
        }

        // If lockout has expired, reset the counter
        if (user.lockedUntil && user.lockedUntil <= new Date()) {
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: 0, lockedUntil: null },
          });
        }

        // Compare password
        const isValid = await bcrypt.compare(password, user.passwordHash);

        if (!isValid) {
          const newFailedAttempts = user.failedLoginAttempts + 1;

          if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                failedLoginAttempts: newFailedAttempts,
                lockedUntil: new Date(Date.now() + LOCKOUT_DURATION_MS),
              },
            });
            throw new Error("Account locked due to too many failed attempts. Try again in 15 minutes.");
          } else {
            await prisma.user.update({
              where: { id: user.id },
              data: { failedLoginAttempts: newFailedAttempts },
            });
          }

          return null;
        }

        // Successful login - reset failed attempt counter
        if (user.failedLoginAttempts > 0 || user.lockedUntil) {
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: 0, lockedUntil: null },
          });
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          teamId: user.teamId,
        };
      },
    }),
  ],
});
