import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../trpc";
import { db } from "@/lib/db";
import { users, sessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";

// Hash SSN for storage (one-way hash, cannot be decrypted)
function hashSSN(ssn: string): string {
  return createHash("sha256").update(ssn + (process.env.SSN_SALT || "default-salt")).digest("hex");
}

export const authRouter = router({
  signup: publicProcedure
    .input(
      z.object({
        email: z
          .string()
          .email("Invalid email format")
          .toLowerCase()
          .refine(
            (value) => {
              // Better email validation - check for common typos
              const invalidTlds = [".con", ".c0m", ".comm", ".netl", ".orgn"];
              const lowerValue = value.toLowerCase();
              return !invalidTlds.some((tld) => lowerValue.endsWith(tld));
            },
            { message: "Email contains invalid domain extension" }
          )
          .refine(
            (value) => {
              // Check for valid TLD
              const validTlds = [".com", ".org", ".net", ".edu", ".gov", ".io", ".co", ".us"];
              return validTlds.some((tld) => value.toLowerCase().endsWith(tld)) || /\.([a-z]{2,})$/.test(value);
            },
            { message: "Email must have a valid domain extension" }
          ),
        password: z
          .string()
          .min(8)
          .regex(/[A-Z]/, "Password must contain an uppercase letter")
          .regex(/[a-z]/, "Password must contain a lowercase letter")
          .regex(/\d/, "Password must contain a number")
          .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain a special character"),
        firstName: z
          .string()
          .min(1)
          .max(100)
          .refine(
            (value) => {
              // Sanitize: prevent script injection but allow apostrophes for names like O'Connor
              return !/[<>]/.test(value);
            },
            { message: "First name contains invalid characters" }
          ),
        lastName: z
          .string()
          .min(1)
          .max(100)
          .refine(
            (value) => {
              // Sanitize: prevent script injection but allow apostrophes for names like O'Connor
              return !/[<>]/.test(value);
            },
            { message: "Last name contains invalid characters" }
          ),
        phoneNumber: z
          .string()
          .refine(
            (value) => {
              // US phone number: (xxx) xxx-xxxx, xxx-xxx-xxxx, xxx.xxx.xxxx, xxxxxxxxxx, or +1xxxxxxxxxx
              const usFormat = /^(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/;
              // International: + followed by 1-15 digits
              const intlFormat = /^\+\d{1,15}$/;
              return usFormat.test(value.replace(/\s/g, "")) || intlFormat.test(value);
            },
            { message: "Invalid phone number format. Use US format (xxx) xxx-xxxx or international +xxxxxxxxxxxxx" }
          )
          .transform((value) => {
            // Normalize to digits only for storage (remove formatting)
            return value.replace(/\D/g, "");
          }),
        dateOfBirth: z.string().refine(
          (value) => {
            const birthDate = new Date(value);
            const today = new Date();
            if (birthDate > today) return false;
            const age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            const dayDiff = today.getDate() - birthDate.getDate();
            const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
            return actualAge >= 18;
          },
          { message: "You must be at least 18 years old and date cannot be in the future" }
        ),
        ssn: z.string().regex(/^\d{9}$/),
        address: z
          .string()
          .min(1)
          .max(200)
          .refine(
            (value) => {
              // Sanitize: prevent script injection
              return !/[<>]/.test(value);
            },
            { message: "Address contains invalid characters" }
          ),
        city: z
          .string()
          .min(1)
          .max(100)
          .refine(
            (value) => {
              // Sanitize: prevent script injection
              return !/[<>]/.test(value);
            },
            { message: "City contains invalid characters" }
          ),
        state: z
          .string()
          .length(2)
          .toUpperCase()
          .refine(
            (value) => {
              const validStates = [
                "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
                "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
                "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
                "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
                "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
                "DC", // District of Columbia
              ];
              return validStates.includes(value);
            },
            { message: "Invalid state code. Please use a valid 2-letter US state code." }
          ),
        zipCode: z.string().regex(/^\d{5}$/),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const existingUser = await db.select().from(users).where(eq(users.email, input.email)).get();

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User already exists",
        });
      }

      const hashedPassword = await bcrypt.hash(input.password, 10);
      const hashedSSN = hashSSN(input.ssn);

      await db.insert(users).values({
        ...input,
        password: hashedPassword,
        ssn: hashedSSN, // Store hashed SSN instead of plaintext
      });

      // Fetch the created user
      const user = await db.select().from(users).where(eq(users.email, input.email)).get();

      if (!user) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create user",
        });
      }

      // Create session
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || "temporary-secret-for-interview", {
        expiresIn: "7d",
      });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await db.insert(sessions).values({
        userId: user.id,
        token,
        expiresAt: expiresAt.toISOString(),
      });

      // Set cookie
      if ("setHeader" in ctx.res) {
        ctx.res.setHeader("Set-Cookie", `session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`);
      } else {
        (ctx.res as Headers).set("Set-Cookie", `session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`);
      }

      return { user: { ...user, password: undefined }, token };
    }),

  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = await db.select().from(users).where(eq(users.email, input.email)).get();

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid credentials",
        });
      }

      const validPassword = await bcrypt.compare(input.password, user.password);

      if (!validPassword) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid credentials",
        });
      }

      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || "temporary-secret-for-interview", {
        expiresIn: "7d",
      });

      // Invalidate old sessions for this user (limit to 5 active sessions)
      const existingSessions = await db.select().from(sessions).where(eq(sessions.userId, user.id));
      
      // Keep only the 4 most recent sessions (we'll add one more, making 5 total)
      if (existingSessions.length >= 5) {
        const sessionsToDelete = existingSessions
          .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
          .slice(4);
        
        for (const session of sessionsToDelete) {
          await db.delete(sessions).where(eq(sessions.token, session.token));
        }
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await db.insert(sessions).values({
        userId: user.id,
        token,
        expiresAt: expiresAt.toISOString(),
      });

      if ("setHeader" in ctx.res) {
        ctx.res.setHeader("Set-Cookie", `session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`);
      } else {
        (ctx.res as Headers).set("Set-Cookie", `session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`);
      }

      return { user: { ...user, password: undefined }, token };
    }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    let deleted = false;
    if (ctx.user) {
      // Delete session from database
      let token: string | undefined;
      if ("cookies" in ctx.req) {
        token = (ctx.req as any).cookies.session;
      } else {
        const cookieHeader = ctx.req.headers.get?.("cookie") || (ctx.req.headers as any).cookie;
        token = cookieHeader
          ?.split("; ")
          .find((c: string) => c.startsWith("session="))
          ?.split("=")[1];
      }
      if (token) {
        const result = await db.delete(sessions).where(eq(sessions.token, token));
        // Verify deletion was successful
        const remainingSession = await db.select().from(sessions).where(eq(sessions.token, token)).get();
        deleted = !remainingSession;
      }
    }

    if ("setHeader" in ctx.res) {
      ctx.res.setHeader("Set-Cookie", `session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
    } else {
      (ctx.res as Headers).set("Set-Cookie", `session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
    }

    if (ctx.user && !deleted) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to delete session",
      });
    }

    return { success: deleted || !ctx.user, message: ctx.user && deleted ? "Logged out successfully" : "No active session" };
  }),
});
