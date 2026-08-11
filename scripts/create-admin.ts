import { auth } from "~/lib/auth";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
if (!ADMIN_EMAIL) {
  throw new Error(
    "ADMIN_EMAIL is not set. Add the email address for the admin account " +
      "to your environment before running this script.",
  );
}

const password = process.argv[2];
if (!password) {
  throw new Error('Usage: npx tsx scripts/create-admin.ts "<password>"');
}

async function main() {
  try {
    await auth.api.signUpEmail({
      body: {
        email: ADMIN_EMAIL as string,
        password,
        name: "Admin",
      },
    });
    console.log(
      `Admin account created for ${ADMIN_EMAIL}. The databaseHooks role ` +
        `hook should have assigned role: "admin".`,
    );
  } catch (error) {
    console.error(
      "Failed to create admin account (it may already exist):",
      error,
    );
  }
}

main();
