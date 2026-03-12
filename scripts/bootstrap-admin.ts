/**
 * Bootstrap script: Creates the first admin user in both Supabase Auth and the PMS database.
 *
 * Usage:
 *   npx tsx scripts/bootstrap-admin.ts <email> <password> <firstName> <lastName>
 *
 * Example:
 *   npx tsx scripts/bootstrap-admin.ts cdowling@bndsrx.com "TempPass123!" Caleb Dowling
 *
 * This only needs to run once. After the first admin exists, they can invite
 * all other users through the PMS UI.
 */

import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [email, password, firstName, lastName] = process.argv.slice(2);

  if (!email || !password || !firstName || !lastName) {
    console.error(
      "Usage: npx tsx scripts/bootstrap-admin.ts <email> <password> <firstName> <lastName>"
    );
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment"
    );
    process.exit(1);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`\nBootstrapping admin user: ${email}\n`);

  // 1. Ensure roles exist
  console.log("1. Checking roles...");
  const existingRoles = await prisma.role.findMany();
  if (existingRoles.length === 0) {
    console.log("   No roles found — running seed first.");
    console.log("   Run: npx prisma db seed");
    process.exit(1);
  }

  const adminRole = existingRoles.find((r) => r.name === "admin");
  const pharmacistRole = existingRoles.find((r) => r.name === "pharmacist");

  if (!adminRole) {
    console.error("   ERROR: 'admin' role not found. Run prisma db seed first.");
    process.exit(1);
  }

  // 2. Check if user already exists
  console.log("2. Checking for existing user...");
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existingUser) {
    console.log(`   User ${email} already exists in database (id: ${existingUser.id})`);
    console.log("   Skipping creation. If you need to reset, delete the user first.");
    process.exit(0);
  }

  // 3. Create Supabase auth user
  console.log("3. Creating Supabase auth user...");
  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName },
    });

  if (authError) {
    // If user exists in Supabase but not in our DB, get their ID
    if (authError.message.includes("already been registered")) {
      console.log("   User exists in Supabase, fetching ID...");
      const { data: users } = await admin.auth.admin.listUsers();
      const existing = users?.users.find(
        (u) => u.email === email.toLowerCase()
      );
      if (existing) {
        await createDbUser(existing.id, email, firstName, lastName, adminRole.id, pharmacistRole?.id);
        return;
      }
    }
    console.error(`   ERROR: ${authError.message}`);
    process.exit(1);
  }

  if (!authData.user) {
    console.error("   ERROR: No user returned from Supabase");
    process.exit(1);
  }

  console.log(`   Supabase user created: ${authData.user.id}`);

  // 4. Create database user
  await createDbUser(authData.user.id, email, firstName, lastName, adminRole.id, pharmacistRole?.id);
}

async function createDbUser(
  supabaseId: string,
  email: string,
  firstName: string,
  lastName: string,
  adminRoleId: string,
  pharmacistRoleId?: string
) {
  console.log("4. Creating database user...");

  const roleIds = [adminRoleId];
  if (pharmacistRoleId) roleIds.push(pharmacistRoleId);

  const user = await prisma.user.create({
    data: {
      supabaseId,
      email: email.toLowerCase(),
      firstName,
      lastName,
      isPharmacist: true,
      department: "Administration",
      roles: {
        create: roleIds.map((roleId) => ({ roleId })),
      },
    },
    include: { roles: { include: { role: true } } },
  });

  console.log(`   Database user created: ${user.id}`);
  console.log(`   Roles: ${user.roles.map((r) => r.role.name).join(", ")}`);
  console.log(`\n   Admin bootstrap complete!`);
  console.log(`   Login at your PMS URL with:`);
  console.log(`     Email: ${email}`);
  console.log(`     Password: (the one you provided)\n`);
  console.log(`   You can now invite other staff through Settings > Users.\n`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
