import { SQL, eq, inArray, or, and } from "drizzle-orm";
import { db } from "@/api/db";
import { facilities, districts } from "@/api/db/schema";
import { UserContext, hasAdminAccess } from "./get-user-facility";
import type { ScopeQueryParams } from "./scope-access-control";

// Re-export for convenience
export type { ScopeQueryParams };

/**
 * Build district scope filter
 * Filters facilities to those in the user's assigned district(s) or admin-specified district
 * 
 * @param userContext - The user's context including district assignment
 * @param queryParams - Query parameters including optional districtId
 * @returns SQL filter condition or null if no filter needed
 */
export function buildDistrictScopeFilter(
  userContext: UserContext,
  queryParams: ScopeQueryParams
): SQL | null {
  // If user has districtId (accountant), filter to their district(s)
  if (userContext.districtId) {
    return eq(facilities.districtId, userContext.districtId);
  }
  
  // If admin specifies districtId, use that
  if (queryParams.districtId && hasAdminAccess(userContext.role, userContext.permissions)) {
    return eq(facilities.districtId, queryParams.districtId);
  }
  
  return null; // No district filter (admin viewing all)
}

/**
 * Build provincial scope filter
 * Filters facilities to those in districts within the specified province
 * Includes both direct hospitals and child health centers
 * 
 * @param userContext - The user's context
 * @param queryParams - Query parameters including required provinceId
 * @returns SQL filter condition
 * @throws Error if provinceId is missing
 */
export async function buildProvincialScopeFilter(
  userContext: UserContext,
  queryParams: ScopeQueryParams
): Promise<SQL> {
  if (!queryParams.provinceId) {
    throw new Error("provinceId is required for provincial scope");
  }
  
  // Query districts table to get all districts in province
  const provinceDistricts = await db
    .select({ id: districts.id })
    .from(districts)
    .where(eq(districts.provinceId, queryParams.provinceId));
  
  const districtIds = provinceDistricts.map(d => d.id);
  
  if (districtIds.length === 0) {
    // No districts in this province - return a filter that matches nothing
    // Using a condition that will never be true
    return eq(facilities.id, -1);
  }
  
  // Build filter for facilities in those districts (direct hospitals)
  const directFacilitiesFilter = inArray(facilities.districtId, districtIds);
  
  // Build filter for child facilities of hospitals in province (indirect HCs)
  // First get all hospital IDs in the province
  const provinceHospitals = await db
    .select({ id: facilities.id })
    .from(facilities)
    .innerJoin(districts, eq(facilities.districtId, districts.id))
    .where(
      and(
        eq(districts.provinceId, queryParams.provinceId),
        eq(facilities.facilityType, 'hospital')
      )
    );
  
  const hospitalIds = provinceHospitals.map(h => h.id);
  
  // Combine filters using OR logic
  if (hospitalIds.length > 0) {
    const indirectFacilitiesFilter = inArray(facilities.parentFacilityId, hospitalIds);
    return or(directFacilitiesFilter, indirectFacilitiesFilter)!;
  }
  
  // No hospitals in province, only return direct facilities
  return directFacilitiesFilter;
}

/**
 * Build country scope filter
 * Returns simple active filter for all facilities with no geographic restrictions
 * 
 * @param userContext - The user's context
 * @param queryParams - Query parameters (not used for country scope)
 * @returns SQL filter condition for active facilities
 */
export function buildCountryScopeFilter(
  userContext: UserContext,
  queryParams: ScopeQueryParams
): SQL {
  // No geographic filter - include all active facilities
  // Assuming facilities have a status field, filter by ACTIVE status
  // If there's no status field, we can return null or a simple true condition
  return eq(facilities.status, 'ACTIVE');
}

/**
 * Main scope filter builder using strategy pattern
 * Delegates to scope-specific filter builders based on scope type
 * 
 * @param scope - The organizational scope ('district', 'provincial', or 'country')
 * @param userContext - The user's context including role and permissions
 * @param queryParams - Query parameters including scope-specific parameters
 * @returns SQL filter condition or null if no filter needed
 * @throws Error if scope type is unsupported or required parameters are missing
 */
export async function buildScopeFilter(
  scope: 'district' | 'provincial' | 'country',
  userContext: UserContext,
  queryParams: ScopeQueryParams
): Promise<SQL | null> {
  switch (scope) {
    case 'district':
      return buildDistrictScopeFilter(userContext, queryParams);
    
    case 'provincial':
      return await buildProvincialScopeFilter(userContext, queryParams);
    
    case 'country':
      return buildCountryScopeFilter(userContext, queryParams);
    
    default:
      throw new Error(`Unsupported scope: ${scope}`);
  }
}
