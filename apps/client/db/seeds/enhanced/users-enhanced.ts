import type { Database } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { SeedResult, SeedingOptions } from "../utils/seed-manager";

export async function seedUsersEnhanced(db: Database, options: SeedingOptions = {}): Promise<SeedResult> {
    const existing = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, "admin@gmail.com"));

    if (existing.length > 0 && !options.force) {
        return { inserted: 0, updated: 0, skipped: 1, errors: [] };
    }

    const facility = await db
        .select({ id: schema.facilities.id })
        .from(schema.facilities)
        .innerJoin(schema.districts, eq(schema.facilities.districtId, schema.districts.id))
        .where(and(eq(schema.facilities.name, "ruhengeri referral"), eq(schema.districts.name, "musanze")))
        .limit(1);

    if (!facility?.[0]?.id) {
        return { inserted: 0, updated: 0, skipped: 0, errors: ["Facility not found"] };
    }

    const bcrypt = await import("bcryptjs");
    const hashedPassword = await bcrypt.hash("kinyarwanda", 12);

    const userData = {
        name: "admin",
        email: "admin@gmail.com",
        emailVerified: true,
        role: "admin" as const,
        facilityId: facility[0].id,
        permissions: null,
        projectAccess: null,
        configAccess: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    try {
        if (existing.length > 0 && options.updateExisting) {
            await db.update(schema.users).set({ ...userData, updatedAt: new Date() }).where(eq(schema.users.email, "admin@gmail.com"));
            await db
                .insert(schema.account)
                .values({ accountId: "admin@gmail.com", providerId: "credential", userId: existing[0].id, password: hashedPassword, createdAt: new Date(), updatedAt: new Date() })
                .onConflictDoUpdate({ target: [schema.account.accountId, schema.account.providerId], set: { password: hashedPassword, updatedAt: new Date() } });
            return { inserted: 0, updated: 1, skipped: 0, errors: [] };
        }

        const [user] = await db.insert(schema.users).values(userData).returning({ id: schema.users.id });
        await db
            .insert(schema.account)
            .values({ accountId: "admin@gmail.com", providerId: "credential", userId: user.id, password: hashedPassword, createdAt: new Date(), updatedAt: new Date() })
            .onConflictDoUpdate({ target: [schema.account.accountId, schema.account.providerId], set: { password: hashedPassword, updatedAt: new Date() } });

        return { inserted: 1, updated: 0, skipped: 0, errors: [] };
    } catch (error: any) {
        return { inserted: 0, updated: 0, skipped: 0, errors: [error?.message ?? String(error)] };
    }
}

export default seedUsersEnhanced;


