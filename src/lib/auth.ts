import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/neon-http";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { sql } from "~/db";
import * as authSchema from "~/db/auth-schema";

const adminEmail = process.env.ADMIN_EMAIL;
if (!adminEmail) {
  throw new Error(
    "ADMIN_EMAIL is not set. Add the email address that should receive " +
      "the admin role to .env.local (dev) and the Vercel project's " +
      "environment variables (prod) before starting the app.",
  );
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(drizzle(sql()), {
    provider: "pg",
    schema: authSchema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "user",
        input: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (user.email.toLowerCase() === adminEmail.toLowerCase()) {
            return { data: { ...user, role: "admin" } };
          }
          return { data: user };
        },
      },
    },
  },
  plugins: [tanstackStartCookies()],
});