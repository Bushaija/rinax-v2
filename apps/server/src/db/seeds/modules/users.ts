import type { Database } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";

/* eslint-disable no-console */
export default async function seed(db: Database) {
  console.log("Seeding admin user...");

  try {
    // First, find the facility ID for "ruhengeri referral" hospital in "musanze" district
    const facility = await db
      .select({ 
        id: schema.facilities.id,
        name: schema.facilities.name,
        districtName: schema.districts.name 
      })
      .from(schema.facilities)
      .innerJoin(schema.districts, eq(schema.facilities.districtId, schema.districts.id))
      .where(
        and(
          eq(schema.facilities.name, "ruhengeri referral"),
          eq(schema.districts.name, "musanze")
        )
      )
      .limit(1);

    if (!facility || facility.length === 0) {
      console.error("Facility 'ruhengeri referral' in 'musanze' district not found!");
      console.log("Available facilities in musanze district:");
      const musanzeFacilities = await db
        .select({ 
          id: schema.facilities.id,
          name: schema.facilities.name 
        })
        .from(schema.facilities)
        .innerJoin(schema.districts, eq(schema.facilities.districtId, schema.districts.id))
        .where(eq(schema.districts.name, "musanze"));
      
      console.log(musanzeFacilities.map(f => `- ${f.name} (ID: ${f.id})`).join('\n'));
      return;
    }

    const facilityId = facility[0].id;
    console.log(`Found facility: ${facility[0].name} in ${facility[0].districtName} district (ID: ${facilityId})`);

    // Check if admin user already exists
    const existingUser = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, "admin@gmail.com"))
      .limit(1);

    // Hash the password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash("kinyarwanda", saltRounds);

    const userRow = {
      name: "admin",
      email: "admin@gmail.com",
      emailVerified: true,
      role: "admin" as const,
      facilityId: facilityId,
      permissions: null,
      projectAccess: null,
      configAccess: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const seedMode = process.env.SEED_MODE as 'fresh' | 'update' | 'force' | undefined;

    if (existingUser.length > 0) {
      if (seedMode === 'force' || seedMode === 'update') {
        console.log(`${seedMode === 'force' ? 'Force' : 'Update'} mode: updating existing admin user`);
      } else {
        console.log("Admin user already exists, skipping (use SEED_MODE=force or update to override)");
        return;
      }
    }

    if (existingUser.length > 0 && seedMode === "update") {
      await db.update(schema.users).set({ ...userRow, updatedAt: new Date() }).where(eq(schema.users.email, "admin@gmail.com"));
      await db
        .insert(schema.account)
        .values({ accountId: "admin@gmail.com", providerId: "credential", userId: existingUser[0].id, password: hashedPassword, createdAt: new Date(), updatedAt: new Date() })
        .onConflictDoUpdate({ target: [schema.account.accountId, schema.account.providerId], set: { password: hashedPassword, updatedAt: new Date() } });
    } else {
      const [user] = await db
        .insert(schema.users)
        .values(userRow)
        .onConflictDoUpdate({ target: [schema.users.email], set: { ...userRow, updatedAt: new Date() } })
        .returning({ id: schema.users.id });

      await db
        .insert(schema.account)
        .values({ accountId: "admin@gmail.com", providerId: "credential", userId: user.id, password: hashedPassword, createdAt: new Date(), updatedAt: new Date() })
        .onConflictDoUpdate({ target: [schema.account.accountId, schema.account.providerId], set: { password: hashedPassword, updatedAt: new Date() } });
    }

    console.log("Admin user seeded successfully!");
    console.log("Login credentials:");
    console.log("  Email: admin@gmail.com");
    console.log("  Password: kinyarwanda");
    console.log("  Role: admin");
    console.log(`  Facility: ${facility[0].name} (${facility[0].districtName} district)`);

  } catch (error) {
    console.error("Error seeding admin user:", error);
    throw error;
  }
} 