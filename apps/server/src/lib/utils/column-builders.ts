import { db } from "@/api/db";
import { districts, provinces } from "@/api/db/schema";
import { inArray } from "drizzle-orm";

// Type definition for FacilityColumn (to avoid circular dependency)
interface FacilityColumn {
  id: number;
  name: string;
  facilityType: string;
  projectType: string;
  hasData: boolean;
}

interface ExecutionEntry {
  id: number;
  formData: any;
  computedValues: any;
  facilityId: number;
  facilityName: string;
  facilityType: string;
  projectType: string;
  year?: number;
  quarter?: string;
  districtId?: number;
  districtName?: string;
  provinceId?: number;
  provinceName?: string;
}

interface Column {
  id: number;
  name: string;
  type: 'facility' | 'district' | 'province';
  facilityType?: string;
  projectType?: string;
  hasData: boolean;
  aggregatedFacilityCount?: number;
  facilityIds: number[]; // IDs of facilities that belong to this column
}

/**
 * Build facility-level columns for district scope
 * Each column represents an individual facility
 */
export function buildFacilityColumns(executionData: ExecutionEntry[]): Column[] {
  const facilityMap = new Map<number, Column>();

  executionData.forEach(entry => {
    if (!facilityMap.has(entry.facilityId)) {
      facilityMap.set(entry.facilityId, {
        id: entry.facilityId,
        name: entry.facilityName,
        type: 'facility',
        facilityType: entry.facilityType,
        projectType: entry.projectType,
        hasData: true,
        aggregatedFacilityCount: 1,
        facilityIds: [entry.facilityId]
      });
    }
  });

  return Array.from(facilityMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Build district-level columns for provincial scope
 * Each column represents a district (aggregating all facilities in that district)
 */
export async function buildDistrictColumns(
  executionData: ExecutionEntry[]
): Promise<Column[]> {
  // Get unique district IDs from execution data
  const districtIds = [...new Set(executionData.map(e => e.districtId).filter(Boolean))] as number[];

  if (districtIds.length === 0) {
    return [];
  }

  // Fetch district information
  const districtData = await db
    .select({
      id: districts.id,
      name: districts.name,
      provinceId: districts.provinceId
    })
    .from(districts)
    .where(inArray(districts.id, districtIds));

  // Group facilities by district
  const districtMap = new Map<number, {
    district: typeof districtData[0];
    facilityIds: number[];
  }>();

  executionData.forEach(entry => {
    if (entry.districtId) {
      if (!districtMap.has(entry.districtId)) {
        const district = districtData.find(d => d.id === entry.districtId);
        if (district) {
          districtMap.set(entry.districtId, {
            district,
            facilityIds: []
          });
        }
      }
      districtMap.get(entry.districtId)?.facilityIds.push(entry.facilityId);
    }
  });

  // Create columns
  const columns: Column[] = Array.from(districtMap.values()).map(({ district, facilityIds }) => ({
    id: district.id,
    name: `${district.name} District`,
    type: 'district' as const,
    hasData: true,
    aggregatedFacilityCount: new Set(facilityIds).size,
    facilityIds: [...new Set(facilityIds)]
  }));

  return columns.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Build province-level columns for country scope
 * Each column represents a province (aggregating all facilities in that province)
 */
export async function buildProvinceColumns(executionData: ExecutionEntry[]): Promise<Column[]> {
  // Get unique province IDs from execution data
  const provinceIds = [...new Set(executionData.map(e => e.provinceId).filter(Boolean))] as number[];

  if (provinceIds.length === 0) {
    return [];
  }

  // Fetch province information
  const provinceData = await db
    .select({
      id: provinces.id,
      name: provinces.name
    })
    .from(provinces)
    .where(inArray(provinces.id, provinceIds));

  // Group facilities by province
  const provinceMap = new Map<number, {
    province: typeof provinceData[0];
    facilityIds: number[];
  }>();

  executionData.forEach(entry => {
    if (entry.provinceId) {
      if (!provinceMap.has(entry.provinceId)) {
        const province = provinceData.find(p => p.id === entry.provinceId);
        if (province) {
          provinceMap.set(entry.provinceId, {
            province,
            facilityIds: []
          });
        }
      }
      provinceMap.get(entry.provinceId)?.facilityIds.push(entry.facilityId);
    }
  });

  // Create columns
  const columns: Column[] = Array.from(provinceMap.values()).map(({ province, facilityIds }) => ({
    id: province.id,
    name: province.name,
    type: 'province' as const,
    hasData: true,
    aggregatedFacilityCount: new Set(facilityIds).size,
    facilityIds: [...new Set(facilityIds)]
  }));

  return columns.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Aggregate execution data by columns
 * Maps facility-level data to the appropriate column based on scope
 */
export function aggregateDataByColumns(
  executionData: ExecutionEntry[],
  columns: Column[]
): ExecutionEntry[] {
  // Create a map of facilityId -> columnId
  const facilityToColumnMap = new Map<number, number>();
  
  columns.forEach(column => {
    column.facilityIds.forEach(facilityId => {
      facilityToColumnMap.set(facilityId, column.id);
    });
  });

  // Group execution data by column
  const columnDataMap = new Map<number, ExecutionEntry[]>();

  executionData.forEach(entry => {
    const columnId = facilityToColumnMap.get(entry.facilityId);
    if (columnId !== undefined) {
      if (!columnDataMap.has(columnId)) {
        columnDataMap.set(columnId, []);
      }
      columnDataMap.get(columnId)!.push(entry);
    }
  });

  // Aggregate data for each column
  const aggregatedData: ExecutionEntry[] = [];

  columns.forEach(column => {
    const columnEntries = columnDataMap.get(column.id) || [];
    
    if (columnEntries.length === 0) {
      return;
    }

    // Aggregate formData across all facilities in this column
    const aggregatedFormData: any = {};
    const aggregatedComputedValues: any = {};

    columnEntries.forEach(entry => {
      // Sum up all activity values
      Object.entries(entry.formData || {}).forEach(([key, value]) => {
        if (typeof value === 'number') {
          aggregatedFormData[key] = (aggregatedFormData[key] || 0) + value;
        } else if (typeof value === 'object' && value !== null) {
          // Handle quarterly data
          if (!aggregatedFormData[key]) {
            aggregatedFormData[key] = {};
          }
          Object.entries(value).forEach(([quarter, qValue]) => {
            if (typeof qValue === 'number') {
              aggregatedFormData[key][quarter] = (aggregatedFormData[key][quarter] || 0) + qValue;
            }
          });
        }
      });

      // Sum up computed values
      Object.entries(entry.computedValues || {}).forEach(([key, value]) => {
        if (typeof value === 'number') {
          aggregatedComputedValues[key] = (aggregatedComputedValues[key] || 0) + value;
        } else if (typeof value === 'object' && value !== null) {
          if (!aggregatedComputedValues[key]) {
            aggregatedComputedValues[key] = {};
          }
          Object.entries(value).forEach(([quarter, qValue]) => {
            if (typeof qValue === 'number') {
              aggregatedComputedValues[key][quarter] = (aggregatedComputedValues[key][quarter] || 0) + qValue;
            }
          });
        }
      });
    });

    // Create aggregated entry for this column
    const firstEntry = columnEntries[0];
    aggregatedData.push({
      id: column.id, // Use column ID instead of facility ID
      formData: aggregatedFormData,
      computedValues: aggregatedComputedValues,
      facilityId: column.id, // Use column ID as facilityId for aggregation service
      facilityName: column.name,
      facilityType: column.facilityType || firstEntry.facilityType,
      projectType: firstEntry.projectType,
      year: firstEntry.year,
      quarter: firstEntry.quarter
    });
  });

  return aggregatedData;
}

/**
 * Convert Column type to FacilityColumn type for API response
 */
export function columnsToFacilityColumns(columns: Column[]): FacilityColumn[] {
  return columns.map(column => ({
    id: column.id,
    name: column.name,
    facilityType: column.facilityType || 'aggregated',
    projectType: column.projectType || 'aggregated',
    hasData: column.hasData
  }));
}
