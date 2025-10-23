import type { Database } from "@/db";
import { and, eq, sql } from "drizzle-orm";

export interface SeedingOptions {
    skipExisting?: boolean;
    updateExisting?: boolean;
    deleteAndRecreate?: boolean;
    dryRun?: boolean;
    force?: boolean;
}

export interface SeedResult {
    inserted: number;
    updated: number;
    skipped: number;
    errors: string[];
}

export class SeedManager {
    constructor(private db: Database) {}

    async seedWithConflictResolution<T extends Record<string, any>>(
        table: any,
        data: T[],
        options: {
            uniqueFields: (keyof T)[];
            updateFields?: (keyof T)[];
            skipFields?: (keyof T)[];
            onConflict?: "skip" | "update" | "error" | "replace";
            batchSize?: number;
        }
    ): Promise<SeedResult> {
        const result: SeedResult = { inserted: 0, updated: 0, skipped: 0, errors: [] };
        const { uniqueFields, updateFields, onConflict = "skip", batchSize = 100 } = options;

        if (data.length === 0) return result;

        for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);

            try {
                if (onConflict === "skip") {
                    await this.db.insert(table).values(batch).onConflictDoNothing();
                    result.inserted += batch.length;
                } else if (onConflict === "update" && updateFields && updateFields.length > 0) {
                    const updateSet = updateFields.reduce((acc, field) => {
                        acc[field as string] = sql`EXCLUDED.${sql.identifier(field as string)}`;
                        return acc;
                    }, {} as Record<string, unknown>);

                    await this.db
                        .insert(table)
                        .values(batch)
                        .onConflictDoUpdate({
                            target: uniqueFields as any,
                            set: updateSet,
                        });
                    result.updated += batch.length;
                } else if (onConflict === "replace") {
                    for (const item of batch) {
                        const whereConditions = uniqueFields.map((field) => eq(table[field as string], item[field as string]));
                        await this.db.delete(table).where(and(...whereConditions));
                    }
                    await this.db.insert(table).values(batch);
                    result.inserted += batch.length;
                } else if (onConflict === "error") {
                    await this.db.insert(table).values(batch);
                    result.inserted += batch.length;
                } else {
                    // default safe path
                    await this.db.insert(table).values(batch).onConflictDoNothing();
                    result.inserted += batch.length;
                }
            } catch (error: any) {
                result.errors.push(`Batch ${i}: ${error?.message ?? String(error)}`);
            }
        }

        return result;
    }

    async checkExisting<T extends Record<string, any>>(
        table: any,
        data: T[],
        uniqueFields: (keyof T)[]
    ): Promise<{ existing: T[]; fresh: T[] }> {
        const existing: T[] = [];
        const fresh: T[] = [];

        for (const item of data) {
            const whereConditions = uniqueFields.map((field) => eq(table[field as string], item[field as string]));
            const found = await this.db.select().from(table).where(and(...whereConditions)).limit(1);
            if (found.length > 0) existing.push(item);
            else fresh.push(item);
        }

        return { existing, fresh };
    }
}


