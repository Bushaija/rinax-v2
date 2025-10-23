import type { Database } from "@/db";
import * as schema from "@/db/schema";
import { SeedManager } from "./utils/seed-manager";

const reportingPeriodsData = [
  // Past fiscal year - closed for data entry
  {
    year: 2025,
    periodType: 'ANNUAL',
    startDate: '2024-07-01',
    endDate: '2025-06-30',
    status: 'CLOSED'
  },
  // Current fiscal year - active for data entry
  {
    year: 2026,
    periodType: 'ANNUAL', 
    startDate: '2025-07-01',
    endDate: '2026-06-30',
    status: 'ACTIVE'
  },
  // Future fiscal year - inactive until ready
  {
    year: 2027,
    periodType: 'ANNUAL',
    startDate: '2026-07-01', 
    endDate: '2027-06-30',
    status: 'INACTIVE'
  },
];

export default async function seedReportingPeriods(db: Database) {
  try {
    console.log("  → Checking existing reporting periods...");
    
    // Check if reporting periods already exist
    const existingPeriods = await db.query.reportingPeriods.findMany();
    
    if (existingPeriods.length > 0) {
      console.log(`  → Found ${existingPeriods.length} existing reporting periods, skipping seed`);
      return;
    }

    console.log("  → Inserting reporting periods...");

    const rows = reportingPeriodsData.map(period => ({
      year: period.year,
      periodType: period.periodType,
      startDate: period.startDate,
      endDate: period.endDate,
      status: period.status
    }));

    const seedManager = new SeedManager(db);
    await seedManager.seedWithConflictResolution(schema.reportingPeriods, rows, {
      uniqueFields: ["year", "periodType"],
      onConflict: "update",
      updateFields: ["startDate", "endDate", "status"],
    });

    console.log(`  → Successfully seeded ${insertedPeriods.length} reporting periods`);
    
    // Log summary of what was created
    const insertedPeriods = await db.query.reportingPeriods.findMany();
    const summary = insertedPeriods.reduce((acc, period: any) => {
      const key = `${period.periodType}-${period.status}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log("  → Summary:", Object.entries(summary)
      .map(([key, count]) => `${count} ${key}`)
      .join(", ")
    );

  } catch (error) {
    console.error("  → Error seeding reporting periods:", error);
    throw error;
  }
} 