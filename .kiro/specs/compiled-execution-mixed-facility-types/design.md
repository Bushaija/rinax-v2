# Design Document

## Overview

This design addresses the bug where the compiled execution endpoint fails to display data from multiple facility types (hospitals and health centers) in the same report. The root cause is that the endpoint loads a single activity catalog based on the first facility's type, causing activity code mismatches for facilities of different types.

The solution involves loading multiple activity catalogs (one per facility type), matching each facility's data to its appropriate catalog, and building a unified response structure that accommodates activities from all facility types.

## Architecture

### Current Flow (Buggy)
```
1. Query execution data → Get mixed facilities (hospital + health_center)
2. Load activity catalog using executionData[0].facilityType → Only loads health_center catalog
3. Aggregate all facilities using single catalog → Hospital activities don't match
4. Build response → Hospital shows zeros
```

### New Flow (Fixed)
```
1. Query execution data → Get mixed facilities (hospital + health_center)
2. Detect unique facility types → ['hospital', 'health_center']
3. Load activity catalogs for each type → Two catalogs loaded in parallel
4. Create facility-to-catalog mapping → {20: hospitalCatalog, 24: healthCenterCatalog}
5. Build unified activity structure → Merge both catalogs intelligently
6. Aggregate each facility using its catalog → Correct matching
7. Build response with unified structure → All facilities show correct values
```

## Components and Interfaces

### 1. Multi-Catalog Loader

**Location:** `apps/server/src/api/routes/execution/execution.handlers.ts` (compiled endpoint)

**Purpose:** Load activity catalogs for all facility types present in the execution data

```typescript
interface ActivityCatalogMap {
  [facilityType: string]: ActivityDefinition[];
}

interface FacilityCatalogMapping {
  [facilityId: string]: ActivityDefinition[];
}

/**
 * Load activity catalogs for all unique facility types in the execution data
 */
async function loadMultipleActivityCatalogs(
  executionData: ExecutionEntry[],
  projectType: string,
  facilityTypeFilter?: string
): Promise<{
  catalogsByType: ActivityCatalogMap;
  facilityCatalogMap: FacilityCatalogMapping;
  subcategoryNames: Record<string, string>;
}> {
  // Extract unique facility types from execution data
  const facilityTypes = new Set<string>();
  
  if (facilityTypeFilter) {
    // If filter provided, only load that type
    facilityTypes.add(facilityTypeFilter);
  } else {
    // Otherwise, load catalogs for all types present
    for (const entry of executionData) {
      if (entry.facilityType) {
        facilityTypes.add(entry.facilityType);
      }
    }
  }
  
  console.log(`[MULTI-CATALOG] Loading catalogs for facility types:`, Array.from(facilityTypes));
  
  // Load activity catalogs in parallel
  const catalogPromises = Array.from(facilityTypes).map(async (facilityType) => {
    const activities = await db
      .select({
        code: dynamicActivities.code,
        name: dynamicActivities.name,
        displayOrder: dynamicActivities.displayOrder,
        isTotalRow: dynamicActivities.isTotalRow,
        fieldMappings: dynamicActivities.fieldMappings,
      })
      .from(dynamicActivities)
      .leftJoin(schemaActivityCategories, eq(dynamicActivities.categoryId, schemaActivityCategories.id))
      .where(
        and(
          eq(dynamicActivities.projectType, projectType as any),
          eq(dynamicActivities.facilityType, facilityType as any),
          eq(dynamicActivities.moduleType, 'execution'),
          eq(dynamicActivities.isActive, true),
          eq(schemaActivityCategories.isActive, true)
        )
      );
    
    return { facilityType, activities };
  });
  
  const catalogResults = await Promise.all(catalogPromises);
  
  // Build catalogsByType map
  const catalogsByType: ActivityCatalogMap = {};
  for (const result of catalogResults) {
    catalogsByType[result.facilityType] = result.activities.map(activity => {
      const fieldMappings = activity.fieldMappings as any;
      const category = fieldMappings?.category || 'A';
      const subcategory = fieldMappings?.subcategory;
      
      return {
        code: activity.code as string,
        name: activity.name as string,
        category,
        subcategory,
        displayOrder: activity.displayOrder as number,
        isSection: false,
        isSubcategory: false,
        isComputed: false,
        level: subcategory ? 2 : 1
      };
    });
  }
  
  // Build facility-to-catalog mapping
  const facilityCatalogMap: FacilityCatalogMapping = {};
  for (const entry of executionData) {
    const facilityId = entry.facilityId.toString();
    const catalog = catalogsByType[entry.facilityType];
    if (catalog) {
      facilityCatalogMap[facilityId] = catalog;
    }
  }
  
  // Load subcategory names (same for all facility types)
  const categories = await db
    .select({
      code: schemaActivityCategories.subCategoryCode,
      name: schemaActivityCategories.name,
    })
    .from(schemaActivityCategories)
    .where(
      and(
        eq(schemaActivityCategories.moduleType, 'execution' as any),
        eq(schemaActivityCategories.projectType, projectType as any),
        eq(schemaActivityCategories.isSubCategory, true),
        eq(schemaActivityCategories.isActive, true)
      )
    );
  
  const subcategoryNames: Record<string, string> = {};
  categories.forEach(cat => {
    if (cat.code) {
      subcategoryNames[cat.code] = cat.name;
    }
  });
  
  return { catalogsByType, facilityCatalogMap, subcategoryNames };
}
```

### 2. Unified Activity Structure Builder

**Location:** `apps/server/src/lib/services/aggregation.service.ts`

**Purpose:** Merge activity catalogs from multiple facility types into a single unified structure

```typescript
interface UnifiedActivity extends ActivityDefinition {
  facilityTypes: string[]; // Which facility types have this activity
  sourceCode?: string; // Original code if normalized
}

/**
 * Build a unified activity structure from multiple facility-type-specific catalogs
 */
function buildUnifiedActivityCatalog(
  catalogsByType: ActivityCatalogMap
): UnifiedActivity[] {
  const unifiedMap = new Map<string, UnifiedActivity>();
  
  // Process each facility type's catalog
  for (const [facilityType, catalog] of Object.entries(catalogsByType)) {
    for (const activity of catalog) {
      // Create a normalized key for grouping similar activities
      // Activities with same category, subcategory, and display order are considered similar
      const normalizedKey = `${activity.category}_${activity.subcategory || 'none'}_${activity.displayOrder}`;
      
      if (unifiedMap.has(normalizedKey)) {
        // Activity already exists - add this facility type
        const existing = unifiedMap.get(normalizedKey)!;
        existing.facilityTypes.push(facilityType);
      } else {
        // New activity - add to unified structure
        unifiedMap.set(normalizedKey, {
          ...activity,
          facilityTypes: [facilityType],
          sourceCode: activity.code
        });
      }
    }
  }
  
  // Convert map to array and sort by display order
  const unifiedCatalog = Array.from(unifiedMap.values())
    .sort((a, b) => {
      // Sort by category first, then display order
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.displayOrder - b.displayOrder;
    });
  
  return unifiedCatalog;
}
```

### 3. Enhanced Aggregation Service

**Location:** `apps/server/src/lib/services/aggregation.service.ts`

**Purpose:** Aggregate data using facility-specific catalogs

```typescript
/**
 * Aggregate execution data using facility-specific activity catalogs
 */
function aggregateByActivityWithMultipleCatalogs(
  executionData: ExecutionEntry[],
  facilityCatalogMap: FacilityCatalogMapping,
  unifiedCatalog: UnifiedActivity[]
): AggregatedData {
  const aggregated: AggregatedData = {};
  
  // Initialize aggregated data structure for all unified activities
  for (const activity of unifiedCatalog) {
    aggregated[activity.code] = {};
  }
  
  // Process each facility's execution data
  for (const entry of executionData) {
    const facilityId = entry.facilityId.toString();
    const facilityCatalog = facilityCatalogMap[facilityId];
    
    if (!facilityCatalog) {
      console.warn(`[AGGREGATION] No catalog found for facility ${facilityId} (${entry.facilityName})`);
      continue;
    }
    
    // Get available activity codes from this facility's data
    let availableCodes: string[] = [];
    if (entry.formData?.activities && typeof entry.formData.activities === 'object' && !Array.isArray(entry.formData.activities)) {
      availableCodes = Object.keys(entry.formData.activities);
    } else if (Array.isArray(entry.formData?.activities)) {
      availableCodes = entry.formData.activities
        .filter((a: any) => a?.code)
        .map((a: any) => a.code);
    }
    
    // Process each activity in the unified catalog
    for (const unifiedActivity of unifiedCatalog) {
      // Find matching activity in facility's catalog
      const facilityActivity = facilityCatalog.find(a => 
        a.category === unifiedActivity.category &&
        a.subcategory === unifiedActivity.subcategory &&
        a.displayOrder === unifiedActivity.displayOrder
      );
      
      if (facilityActivity && availableCodes.includes(facilityActivity.code)) {
        // Extract values using the facility-specific activity code
        const values = aggregationService.extractActivityValues(entry.formData, facilityActivity.code);
        aggregated[unifiedActivity.code][facilityId] = values;
        
        console.log(`[AGGREGATION] Facility ${facilityId}: ${unifiedActivity.code} matched to ${facilityActivity.code}, values:`, values);
      } else {
        // Use zero values for missing activities
        aggregated[unifiedActivity.code][facilityId] = { q1: 0, q2: 0, q3: 0, q4: 0, total: 0 };
      }
    }
  }
  
  return aggregated;
}
```

## Data Models

### ActivityCatalogMap
```typescript
interface ActivityCatalogMap {
  [facilityType: string]: ActivityDefinition[];
}

// Example:
{
  "hospital": [
    { code: "HIV_EXEC_HOSPITAL_A_1", name: "Transfers from SPIU/RBC", ... },
    { code: "HIV_EXEC_HOSPITAL_A_2", name: "Other Incomes", ... }
  ],
  "health_center": [
    { code: "HIV_EXEC_HEALTH_CENTER_A_1", name: "Other Incomes", ... },
    { code: "HIV_EXEC_HEALTH_CENTER_A_2", name: "Transfers from SPIU/RBC", ... }
  ]
}
```

### FacilityCatalogMapping
```typescript
interface FacilityCatalogMapping {
  [facilityId: string]: ActivityDefinition[];
}

// Example:
{
  "20": [ /* hospital activities */ ],
  "24": [ /* health_center activities */ ]
}
```

### UnifiedActivity
```typescript
interface UnifiedActivity extends ActivityDefinition {
  facilityTypes: string[]; // Which facility types have this activity
  sourceCode?: string; // Original code if normalized
}

// Example:
{
  code: "A_1", // Normalized code
  name: "Transfers from SPIU/RBC",
  category: "A",
  displayOrder: 1,
  facilityTypes: ["hospital", "health_center"],
  sourceCode: "HIV_EXEC_HOSPITAL_A_1" // Original code from first facility type
}
```

## Error Handling

### 1. Catalog Loading Failures
```typescript
try {
  const catalogResults = await Promise.all(catalogPromises);
} catch (error) {
  console.error('[MULTI-CATALOG] Failed to load activity catalogs:', error);
  return c.json(
    {
      message: "Failed to load activity catalogs",
      error: "Unable to load activity definitions for one or more facility types"
    },
    HttpStatusCodes.INTERNAL_SERVER_ERROR
  );
}
```

### 2. Missing Catalog for Facility
```typescript
if (!facilityCatalog) {
  console.warn(`[AGGREGATION] No catalog found for facility ${facilityId} (${entry.facilityName})`);
  // Continue processing other facilities, use zero values for this facility
  continue;
}
```

### 3. Activity Code Mismatch
```typescript
if (!facilityActivity) {
  console.warn(
    `[AGGREGATION] Activity not found in catalog for facility ${facilityId}: ` +
    `category=${unifiedActivity.category}, subcategory=${unifiedActivity.subcategory}, ` +
    `displayOrder=${unifiedActivity.displayOrder}`
  );
  // Use zero values
  aggregated[unifiedActivity.code][facilityId] = { q1: 0, q2: 0, q3: 0, q4: 0, total: 0 };
}
```

## Testing Strategy

### Unit Tests

**File:** `apps/server/src/lib/services/__tests__/aggregation.service.test.ts`

```typescript
describe('AggregationService - Mixed Facility Types', () => {
  describe('buildUnifiedActivityCatalog', () => {
    it('should merge activities from multiple facility types', () => {
      const catalogsByType = {
        hospital: [
          { code: 'HIV_EXEC_HOSPITAL_A_1', category: 'A', displayOrder: 1, ... },
          { code: 'HIV_EXEC_HOSPITAL_A_2', category: 'A', displayOrder: 2, ... }
        ],
        health_center: [
          { code: 'HIV_EXEC_HEALTH_CENTER_A_1', category: 'A', displayOrder: 1, ... },
          { code: 'HIV_EXEC_HEALTH_CENTER_A_2', category: 'A', displayOrder: 2, ... }
        ]
      };
      
      const unified = buildUnifiedActivityCatalog(catalogsByType);
      
      expect(unified).toHaveLength(2); // Two unique activities
      expect(unified[0].facilityTypes).toEqual(['hospital', 'health_center']);
    });
    
    it('should handle facility-type-specific activities', () => {
      const catalogsByType = {
        hospital: [
          { code: 'HIV_EXEC_HOSPITAL_A_1', category: 'A', displayOrder: 1, ... },
          { code: 'HIV_EXEC_HOSPITAL_A_3', category: 'A', displayOrder: 3, ... } // Hospital-only
        ],
        health_center: [
          { code: 'HIV_EXEC_HEALTH_CENTER_A_1', category: 'A', displayOrder: 1, ... }
        ]
      };
      
      const unified = buildUnifiedActivityCatalog(catalogsByType);
      
      expect(unified).toHaveLength(2);
      expect(unified[0].facilityTypes).toEqual(['hospital', 'health_center']);
      expect(unified[1].facilityTypes).toEqual(['hospital']); // Hospital-only activity
    });
  });
  
  describe('aggregateByActivityWithMultipleCatalogs', () => {
    it('should aggregate data using facility-specific catalogs', () => {
      const executionData = [
        {
          facilityId: 20,
          facilityType: 'hospital',
          formData: {
            activities: {
              'HIV_EXEC_HOSPITAL_A_1': { q1: 100, q2: 200, q3: 300, q4: 400 }
            }
          }
        },
        {
          facilityId: 24,
          facilityType: 'health_center',
          formData: {
            activities: {
              'HIV_EXEC_HEALTH_CENTER_A_1': { q1: 50, q2: 60, q3: 70, q4: 80 }
            }
          }
        }
      ];
      
      const facilityCatalogMap = {
        '20': [{ code: 'HIV_EXEC_HOSPITAL_A_1', category: 'A', displayOrder: 1, ... }],
        '24': [{ code: 'HIV_EXEC_HEALTH_CENTER_A_1', category: 'A', displayOrder: 1, ... }]
      };
      
      const unifiedCatalog = [
        { code: 'A_1', category: 'A', displayOrder: 1, facilityTypes: ['hospital', 'health_center'] }
      ];
      
      const aggregated = aggregateByActivityWithMultipleCatalogs(
        executionData,
        facilityCatalogMap,
        unifiedCatalog
      );
      
      expect(aggregated['A_1']['20'].q1).toBe(100);
      expect(aggregated['A_1']['24'].q1).toBe(50);
    });
  });
});
```

### Integration Tests

**File:** `apps/server/src/api/routes/execution/__tests__/execution.handlers.test.ts`

```typescript
describe('Compiled Execution Endpoint - Mixed Facility Types', () => {
  it('should return data for both hospital and health center', async () => {
    // Create execution data for hospital
    await createExecutionData({
      facilityId: 20, // Hospital
      projectType: 'HIV',
      reportingPeriodId: 2,
      formData: {
        activities: {
          'HIV_EXEC_HOSPITAL_A_1': { q1: 100, q2: 200, q3: 300, q4: 400 }
        }
      }
    });
    
    // Create execution data for health center
    await createExecutionData({
      facilityId: 24, // Health center
      projectType: 'HIV',
      reportingPeriodId: 2,
      formData: {
        activities: {
          'HIV_EXEC_HEALTH_CENTER_A_1': { q1: 50, q2: 60, q3: 70, q4: 80 }
        }
      }
    });
    
    const response = await request(app)
      .get('/api/execution/compiled')
      .query({ projectType: 'HIV', reportingPeriodId: 2, scope: 'district' });
    
    expect(response.status).toBe(200);
    expect(response.body.data.facilities).toHaveLength(2);
    
    // Both facilities should have non-zero values
    const hospitalValues = response.body.data.activities[0].values['20'];
    const healthCenterValues = response.body.data.activities[0].values['24'];
    
    expect(hospitalValues).not.toBe(0);
    expect(healthCenterValues).not.toBe(0);
  });
  
  it('should maintain backward compatibility with facilityType filter', async () => {
    const response = await request(app)
      .get('/api/execution/compiled')
      .query({ projectType: 'HIV', reportingPeriodId: 2, facilityType: 'hospital' });
    
    expect(response.status).toBe(200);
    // Should only return hospital facilities
    expect(response.body.data.facilities.every(f => f.facilityType === 'hospital')).toBe(true);
  });
});
```

## Performance Considerations

### 1. Parallel Catalog Loading
- Load activity catalogs for different facility types in parallel using `Promise.all()`
- Reduces total loading time from O(n) to O(1) where n is number of facility types

### 2. Catalog Caching
- Each facility type's catalog is loaded only once
- Reused for all facilities of that type
- Memory overhead: ~2-3 catalogs × ~50 activities = ~150 activity definitions

### 3. Efficient Matching
- Use Map/Object lookups instead of array searches
- O(1) lookup time for activity matching
- Pre-build facility-to-catalog mapping before aggregation

### 4. Memory Usage
- Unified catalog size: ~100-150 activities (merged from all types)
- Aggregated data size: ~150 activities × ~10 facilities × 5 values = ~7,500 numbers
- Total memory impact: < 1MB additional

## Migration Strategy

### Phase 1: Add Multi-Catalog Support (Non-Breaking)
1. Add `loadMultipleActivityCatalogs()` function
2. Add `buildUnifiedActivityCatalog()` function
3. Add `aggregateByActivityWithMultipleCatalogs()` function
4. Keep existing single-catalog code path

### Phase 2: Switch to Multi-Catalog (Breaking Fix)
1. Replace single-catalog loading with multi-catalog loading in compiled endpoint
2. Update aggregation logic to use facility-specific catalogs
3. Add comprehensive logging for debugging

### Phase 3: Cleanup
1. Remove old single-catalog code path
2. Add performance monitoring
3. Update documentation

## Rollback Plan

If issues arise:
1. Revert to single-catalog loading
2. Add `facilityType` filter requirement to compiled endpoint
3. Document limitation in API docs
4. Plan more thorough testing for next attempt
