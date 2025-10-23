import type { Database } from "@/db";
import * as schema from "@/db/schema";
import { SeedManager, SeedResult, SeedingOptions } from "../utils/seed-manager";

export async function seedProvincesDistrictsEnhanced(
    db: Database,
    options: SeedingOptions = {},
): Promise<SeedResult> {
    const seedManager = new SeedManager(db);
    const data = (await import("../data/districts-provinces.json")).default as Array<{ province: string; district: string }>;

    const provinceNames = [...new Set(data.map((item) => item.province))];
    const provinceValues = provinceNames.map((name) => ({ name }));

    const provincesResult = await seedManager.seedWithConflictResolution(schema.provinces, provinceValues, {
        uniqueFields: ["name"],
        onConflict: options.updateExisting ? "update" : "skip",
        updateFields: options.updateExisting ? ["name"] : [],
    });

    const allProvinces = await db.query.provinces.findMany();
    const provinceMap = new Map(allProvinces.map((p) => [p.name, p.id]));

    const districtValues = data.map((item) => ({
        name: item.district,
        provinceId: provinceMap.get(item.province)!,
    }));

    const districtsResult = await seedManager.seedWithConflictResolution(schema.districts, districtValues, {
        uniqueFields: ["name", "provinceId"],
        onConflict: options.updateExisting ? "update" : "skip",
        updateFields: options.updateExisting ? ["name"] : [],
    });

    return {
        inserted: provincesResult.inserted + districtsResult.inserted,
        updated: provincesResult.updated + districtsResult.updated,
        skipped: provincesResult.skipped + districtsResult.skipped,
        errors: [...provincesResult.errors, ...districtsResult.errors],
    };
}

export default seedProvincesDistrictsEnhanced;


