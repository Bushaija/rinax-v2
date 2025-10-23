import { Database } from "@/db";
import * as schema from "@/db/schema";
import { SeedManager } from "./utils/seed-manager";

interface ProjectData {
    name: string;
    code: string;
    description: string;
    projectType: "HIV" | "Malaria" | "TB";
    status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
}

/* eslint-disable no-console */
export default async function seed(db: Database) {
    console.log("Seeding projects...");

    const projectsData: ProjectData[] = [
        {
            name: 'HIV National Strategic Plan',
            code: 'HIV',
            description: 'HIV/AIDS prevention, treatment and care program',
            projectType: 'HIV',
            status: 'ACTIVE',
        },
        {
            name: 'Malaria Control Program',
            code: 'MAL',
            description: 'National malaria prevention and control initiatives',
            projectType: 'Malaria',
            status: 'ACTIVE',
        },
        {
            name: 'Tuberculosis Control Program',
            code: 'TB',
            description: 'National TB prevention, diagnosis and treatment program',
            projectType: 'TB',
            status: 'ACTIVE',
        },
    ];

    const seedManager = new SeedManager(db);
    await seedManager.seedWithConflictResolution(schema.projects, projectsData, {
        uniqueFields: ["code"],
        onConflict: "update",
        updateFields: ["name", "description", "projectType", "status"],
    });
    console.log(`Seeded ${projectsData.length} projects.`);
}
