import { db } from "@/db";
import { districts, provinces } from "@/db/schema";
import { eq, inArray, sql } from "drizzle-orm";
import type { ScopeQueryParams, ScopeDetails } from "./scope-access-control";

/**
 * Build scope metadata for API response
 * Extracts geographic entity information based on the scope type
 * 
 * @param scope - The organizational scope ('district', 'provincial', or 'country')
 * @param queryParams - Query parameters including optional districtId and provinceId
 * @param results - Query results containing facility data
 * @returns Structured ScopeDetails object with relevant metadata
 */
export async function buildScopeMetadata(
  scope: 'district' | 'provincial' | 'country',
  queryParams: ScopeQueryParams,
  results: any[]
): Promise<ScopeDetails> {
  // Extract unique district IDs from query results
  const uniqueDistrictIds = [...new Set(
    results
      .map(r => r.facility?.districtId)
      .filter((id): id is number => id !== null && id !== undefined)
  )];
  
  switch (scope) {
    case 'district': {
      // Query database for district names
      if (uniqueDistrictIds.length === 0) {
        return {
          districtIds: [],
          districtNames: [],
        };
      }
      
      const districtRecords = await db
        .select({ 
          id: districts.id, 
          name: districts.name 
        })
        .from(districts)
        .where(inArray(districts.id, uniqueDistrictIds));
      
      return {
        districtIds: districtRecords.map(d => d.id),
        districtNames: districtRecords.map(d => d.name),
      };
    }
    
    case 'provincial': {
      // Query database for province name
      if (!queryParams.provinceId) {
        throw new Error("provinceId is required for provincial scope metadata");
      }
      
      const provinceRecords = await db
        .select({ 
          id: provinces.id, 
          name: provinces.name 
        })
        .from(provinces)
        .where(eq(provinces.id, queryParams.provinceId))
        .limit(1);
      
      const province = provinceRecords[0];
      
      return {
        provinceId: province?.id,
        provinceName: province?.name,
        districtCount: uniqueDistrictIds.length,
      };
    }
    
    case 'country': {
      // Query database for total province count
      const provinceCountResult = await db
        .select({ 
          count: sql<number>`count(*)::int` 
        })
        .from(provinces);
      
      return {
        provinceCount: provinceCountResult[0]?.count || 0,
        districtCount: uniqueDistrictIds.length,
      };
    }
    
    default: {
      // TypeScript exhaustiveness check
      const _exhaustive: never = scope;
      throw new Error(`Unsupported scope: ${_exhaustive}`);
    }
  }
}
