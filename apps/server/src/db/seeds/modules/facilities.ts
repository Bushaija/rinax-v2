// src/db/seeds/facilities.ts
import type { Database } from "@/db";
import * as schema from "@/db/schema";
import { SeedManager } from "../utils/seed-manager";
import facilityData from "../data/facilities.json";
import hospitalDistrictMap from "../data/hospital-district-mapping.json";

export default async function seed(db: Database) {
    console.log("Seeding facilities...");

    const districts = await db.query.districts.findMany();
    const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
    const districtMap = new Map(districts.map(d => [normalize(d.name), d.id]));

    const facilities = facilityData.flatMap(group => {
        const hospitalKey = group.hospitals[0] ? normalize(group.hospitals[0]) : "";
        const districtName = (hospitalDistrictMap as any)[hospitalKey] as string | undefined;
        if (!districtName) {
            console.warn(`No district mapping for hospital key: "${hospitalKey}"`);
            return [];
        }
        const districtId = districtMap.get(normalize(districtName));

        if (!districtId) {
            console.warn(`Skipping group "${hospitalKey}" - district not found for mapping value "${districtName}"`);
            return [];
        }

        return [
            ...group.hospitals.map(name => ({ 
                name: name.trim(), 
                facilityType: "hospital" as const, 
                districtId 
            })),
            ...group["health-centers"].map(name => ({ 
                name: name.trim(), 
                facilityType: "health_center" as const, 
                districtId 
            }))
        ];
    });

    console.log(`Prepared ${facilities.length} facilities from ${facilityData.length} groups`);
    if (facilities.length > 0) {
        const seedManager = new SeedManager(db);
        await seedManager.seedWithConflictResolution(schema.facilities, facilities, {
            uniqueFields: ["name", "districtId"],
            onConflict: "skip",
            updateFields: ["facilityType"],
        });
        console.log(`Seeded ${facilities.length} facilities.`);
    } else {
        throw new Error("No facilities prepared. Check hospital-district mappings and source data.");
    }
}