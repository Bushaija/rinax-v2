import type { Database } from "@/db";
import { SeedManager, SeedResult, SeedingOptions } from "../utils/seed-manager";
import { seedProvincesDistrictsEnhanced } from "./provinces-districts-enhanced";
import { seedUsersEnhanced } from "./users-enhanced";

export interface GlobalSeedingOptions extends SeedingOptions {
    seedOrder?: string[];
    stopOnError?: boolean;
    parallel?: boolean;
}

export class ComprehensiveSeedManager {
    private seeders = new Map<string, (db: Database, options?: SeedingOptions) => Promise<SeedResult>>();
    private seedManager: SeedManager;

    constructor(private db: Database) {
        this.seedManager = new SeedManager(db);
        this.registerSeeder("provinces-districts", seedProvincesDistrictsEnhanced);
        this.registerSeeder("users", seedUsersEnhanced);
    }

    registerSeeder(
        name: string,
        seeder: (db: Database, options?: SeedingOptions) => Promise<SeedResult>,
    ) {
        this.seeders.set(name, seeder);
    }

    async seedAll(options: GlobalSeedingOptions = {}): Promise<Record<string, SeedResult>> {
        const { seedOrder = Array.from(this.seeders.keys()), stopOnError = true, parallel = false } = options;
        const results: Record<string, SeedResult> = {};

        if (parallel) {
            await Promise.all(
                seedOrder.map(async (name) => {
                    const seeder = this.seeders.get(name);
                    if (seeder) results[name] = await seeder(this.db, options);
                }),
            );
            return results;
        }

        for (const name of seedOrder) {
            const seeder = this.seeders.get(name);
            if (!seeder) {
                results[name] = { inserted: 0, updated: 0, skipped: 0, errors: [
                    `Seeder ${name} not registered`,
                ] };
                if (stopOnError) break;
                continue;
            }
            try {
                results[name] = await seeder(this.db, options);
                if (results[name].errors.length > 0 && stopOnError) break;
            } catch (error: any) {
                results[name] = { inserted: 0, updated: 0, skipped: 0, errors: [error?.message ?? String(error)] };
                if (stopOnError) break;
            }
        }

        return results;
    }

    async seedSpecific(names: string[], options: SeedingOptions = {}): Promise<Record<string, SeedResult>> {
        return this.seedAll({ ...options, seedOrder: names });
    }
}

export default ComprehensiveSeedManager;


