/**
 * Access Control Service for Dashboard
 * 
 * Provides helper functions for filtering dashboard data based on user permissions
 * and facility access control rules.
 */

import { db } from '@/db';
import { facilities } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { UserContext } from '@/lib/utils/get-user-facility';

/**
 * Get facilities accessible to the user within a specific province
 * 
 * @param userContext - User context with access control information
 * @param provinceId - Province ID to filter facilities
 * @returns Array of accessible facility IDs within the province
 */
export async function getAccessibleFacilitiesInProvince(
  userContext: UserContext,
  provinceId: number
): Promise<number[]> {
  // Get all facilities with their district information
  const allFacilities = await db.query.facilities.findMany({
    with: {
      district: true,
    },
  });

  // Filter by province
  const provinceFacilities = allFacilities.filter(
    f => f.district?.provinceId === provinceId
  );

  // Admin users have access to all facilities in the province
  if (isAdminUser(userContext)) {
    return provinceFacilities.map(f => f.id);
  }

  // Regular users: filter by their accessible facilities
  return provinceFacilities
    .filter(f => userContext.accessibleFacilityIds.includes(f.id))
    .map(f => f.id);
}

/**
 * Get facilities accessible to the user within a specific district
 * 
 * @param userContext - User context with access control information
 * @param districtId - District ID to filter facilities
 * @returns Array of accessible facility IDs within the district
 */
export async function getAccessibleFacilitiesInDistrict(
  userContext: UserContext,
  districtId: number
): Promise<number[]> {
  // Admin users have access to all facilities in the district
  if (isAdminUser(userContext)) {
    const districtFacilities = await db
      .select({ id: facilities.id })
      .from(facilities)
      .where(eq(facilities.districtId, districtId));
    
    return districtFacilities.map(f => f.id);
  }

  // Regular users: filter by their accessible facilities
  return userContext.accessibleFacilityIds.filter(async (facilityId) => {
    const facility = await db.query.facilities.findFirst({
      where: eq(facilities.id, facilityId),
    });
    return facility?.districtId === districtId;
  });
}

/**
 * Filter facility IDs based on user access control
 * 
 * @param facilityIds - Array of facility IDs to filter
 * @param userContext - User context with access control information
 * @returns Filtered array of facility IDs that user can access
 */
export function filterAccessibleFacilities(
  facilityIds: number[],
  userContext: UserContext
): number[] {
  // Admin users can access all facilities
  if (isAdminUser(userContext)) {
    return facilityIds;
  }

  // Regular users: only facilities in their accessible list
  return facilityIds.filter(id => userContext.accessibleFacilityIds.includes(id));
}

/**
 * Check if user has admin access
 * 
 * @param userContext - User context with role and permissions
 * @returns True if user has admin access
 */
export function isAdminUser(userContext: UserContext): boolean {
  return (
    userContext.role === 'superadmin' ||
    userContext.role === 'admin' ||
    userContext.permissions?.includes('admin_access')
  );
}

/**
 * Validate that user can access a specific facility
 * 
 * @param facilityId - Facility ID to check
 * @param userContext - User context with access control information
 * @throws Error if user cannot access the facility
 */
export function validateFacilityAccess(
  facilityId: number,
  userContext: UserContext
): void {
  if (!isAdminUser(userContext) && !userContext.accessibleFacilityIds.includes(facilityId)) {
    throw new Error('Access denied to this facility');
  }
}

/**
 * Validate that user can access a specific district
 * 
 * @param districtId - District ID to check
 * @param userContext - User context with access control information
 * @throws Error if user cannot access the district
 */
export async function validateDistrictAccess(
  districtId: number,
  userContext: UserContext
): Promise<void> {
  if (isAdminUser(userContext)) {
    return; // Admin can access all districts
  }

  // Check if user has any facilities in this district
  const userFacilities = await db.query.facilities.findMany({
    where: (facilities, { inArray }) => 
      inArray(facilities.id, userContext.accessibleFacilityIds),
  });

  const hasAccessToDistrict = userFacilities.some(f => f.districtId === districtId);
  
  if (!hasAccessToDistrict) {
    throw new Error('Access denied to this district');
  }
}

/**
 * Validate that user can access a specific province
 * 
 * @param provinceId - Province ID to check
 * @param userContext - User context with access control information
 * @throws Error if user cannot access the province
 */
export async function validateProvinceAccess(
  provinceId: number,
  userContext: UserContext
): Promise<void> {
  if (isAdminUser(userContext)) {
    return; // Admin can access all provinces
  }

  // Check if user has any facilities in this province
  const userFacilities = await db.query.facilities.findMany({
    where: (facilities, { inArray }) => 
      inArray(facilities.id, userContext.accessibleFacilityIds),
    with: {
      district: true,
    },
  });

  const hasAccessToProvince = userFacilities.some(
    f => f.district?.provinceId === provinceId
  );
  
  if (!hasAccessToProvince) {
    throw new Error('Access denied to this province');
  }
}
