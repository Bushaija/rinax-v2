# Design Document

## Overview

This design addresses critical bugs in the execution event mapping system where activities are incorrectly mapped due to case-sensitivity issues and inadequate filtering. The solution involves modifying the `seedExecutionEventMappings` function in `configurable-event-mappings.ts` to:

1. Use case-insensitive activity name matching
2. Filter out total rows using the `isTotalRow` flag
3. Ensure all Payable activities map to PAYABLES event
4. Improve fallback logic to only map B subcategory expenses to GOODS_SERVICES
5. Add comprehensive validation after mapping

## Architecture

### Current System Flow

```
1. Load events from database
2. Load execution activities from database
3. Build activity lookup map (key: projectType|activityName)
4. Process explicit mappings from executionEventMappings array
5. Apply fallback mapping (GOODS_SERVICES) to unmapped activities
6. Insert/update mappings in database
7. Run basic verification
```

### Proposed System Flow

```
1. Load events from database
2. Load execution activities from database (EXCLUDE total rows)
3. Build case-insensitive activity lookup map (key: projectType|lowercase(activityName))
4. Process explicit mappings with case-insensitive matching
5. Apply improved fallback mapping (only B subcategory expenses)
6. Insert/update mappings in database
7. Run comprehensive validation
8. Report detailed mapping statistics
```

## Components and Interfaces

### Modified Function: `seedExecutionEventMappings`

**Location:** `apps/server/src/db/seeds/modules/configurable-event-mappings.ts`

**Signature:**
```typescript
export async function seedExecutionEventMappings(
  db: Database,
  projectType?: "HIV" | "Malaria" | "TB"
): Promise<{
  success: boolean;
  totalMappings: number;
  verification: any[];
  validationErrors: string[];
}>
```

**Key Changes:**

1. **Activity Loading with Total Row Exclusion**
```typescript
const activities = await db
  .select({
    id: schema.dynamicActivities.id,
    name: schema.dynamicActivities.name,
    projectType: schema.dynamicActivities.projectType,
    facilityType: schema.dynamicActivities.facilityType,
    categoryId: schema.dynamicActivities.categoryId,
    activityType: schema.dynamicActivities.activityType,
    isTotalRow: schema.dynamicActivities.isTotalRow  // NEW: Include flag
  })
  .from(schema.dynamicActivities)
  .where(
    and(
      eq(schema.dynamicActivities.moduleType, 'execution'),
      eq(schema.dynamicActivities.isTotalRow, false),  // NEW: Exclude totals
      projectType ? eq(schema.dynamicActivities.projectType, projectType) : sql`1=1`
    )
  );
```

2. **Case-Insensitive Activity Lookup Map**
```typescript
const activityByProjectAndName = new Map<string, typeof activities>();
activities.forEach(activity => {
  // Use lowercase for case-insensitive matching
  const key = `${activity.projectType}|${activity.name.toLowerCase()}`;
  if (!activityByProjectAndName.has(key)) {
    activityByProjectAndName.set(key, []);
  }
  activityByProjectAndName.get(key)!.push(activity);
});
```

3. **Case-Insensitive Mapping Lookup**
```typescript
for (const mapping of filterMappings) {
  const eventId = eventMap.get(mapping.eventCode);
  if (!eventId) continue;

  // Use lowercase for matching
  const key = `${mapping.projectType}|${mapping.activityName.toLowerCase()}`;
  const matchingActivities = activityByProjectAndName.get(key) || [];
  
  // ... rest of mapping logic
}
```

4. **Improved Fallback Logic**
```typescript
const unmappedActivities = activities.filter(a => {
  // Already mapped?
  if (mappedActivityIds.has(a.id)) return false;
  
  // Is it a total row? (double-check)
  if (a.isTotalRow) return false;
  
  // Is it a computed/total activity type?
  if (a.activityType === 'COMPUTED' || 
      a.activityType?.includes('TOTAL')) return false;
  
  // Only map B subcategory expenses to GOODS_SERVICES
  // Get category code from categoryId lookup
  const category = categoryMap.get(a.categoryId);
  if (!category || category.code !== 'B') return false;
  
  return true;
});
```

### Updated Data Structure: `executionEventMappings`

**Location:** `apps/server/src/db/seeds/modules/configurable-event-mappings.ts`

**Changes:**
```typescript
const executionEventMappings: EventMappingData[] = [
  // ... existing mappings ...
  
  // FIX: Use title case to match actual activity names
  { projectType: 'HIV', activityName: 'Payable 1: Salaries', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'HIV', activityName: 'Payable 2: Supervision', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'HIV', activityName: 'Payable 3: Meetings', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'HIV', activityName: 'Payable 4: Sample transport', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'HIV', activityName: 'Payable 5: Home visits', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'HIV', activityName: 'Payable 6: Travel survellance', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'HIV', activityName: 'Payable 7: Communication - airtime', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'HIV', activityName: 'Payable 8: Communication - internet', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'HIV', activityName: 'Payable 9: Infrastructure support', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'HIV', activityName: 'Payable 10: Supplies', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'HIV', activityName: 'Payable 11: Transport reporting', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'HIV', activityName: 'Payable 12: Bank charges', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'HIV', activityName: 'Payable 13: VAT refund', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  
  // Repeat for Malaria and TB...
];
```

### New Validation Function: `validateExecutionEventMappings`

**Location:** `apps/server/src/db/seeds/modules/configurable-event-mappings.ts`

**Signature:**
```typescript
async function validateExecutionEventMappings(
  db: Database,
  projectType?: "HIV" | "Malaria" | "TB"
): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
  statistics: {
    totalMappings: number;
    byEvent: Record<string, number>;
    totalRowsMapped: number;
    payablesToGoodsServices: number;
  };
}>
```

**Validation Checks:**

1. **No Total Rows Mapped**
```sql
SELECT COUNT(*) 
FROM configurable_event_mappings cem
JOIN dynamic_activities da ON cem.activity_id = da.id
WHERE da.is_total_row = true
  AND da.module_type = 'execution'
```

2. **All Payables Map to PAYABLES Event**
```sql
SELECT da.name, e.code
FROM configurable_event_mappings cem
JOIN dynamic_activities da ON cem.activity_id = da.id
JOIN events e ON cem.event_id = e.id
WHERE da.name LIKE 'Payable%'
  AND da.module_type = 'execution'
  AND e.code != 'PAYABLES'
```

3. **Only B Subcategories Map to GOODS_SERVICES**
```sql
SELECT da.name, sac.code
FROM configurable_event_mappings cem
JOIN dynamic_activities da ON cem.activity_id = da.id
JOIN events e ON cem.event_id = e.id
JOIN schema_activity_categories sac ON da.category_id = sac.id
WHERE e.code = 'GOODS_SERVICES'
  AND da.module_type = 'execution'
  AND sac.code NOT LIKE '%_B'
```

## Data Models

### Activity Lookup Key Structure

**Before:**
```typescript
key = `${projectType}|${activityName}`
// Example: "HIV|payable 1: salaries"
```

**After:**
```typescript
key = `${projectType}|${activityName.toLowerCase()}`
// Example: "hiv|payable 1: salaries"
```

### Category Lookup Map (New)

```typescript
interface CategoryInfo {
  id: number;
  code: string;
  subCategoryCode: string | null;
}

const categoryMap = new Map<number, CategoryInfo>();
// Populated from schema_activity_categories table
```

## Error Handling

### Validation Errors

1. **Total Rows Mapped Error**
```typescript
if (totalRowsMapped > 0) {
  errors.push(
    `CRITICAL: ${totalRowsMapped} total rows have event mappings. ` +
    `Total rows should never be mapped.`
  );
}
```

2. **Payables Misrouted Error**
```typescript
if (payablesToWrongEvent.length > 0) {
  errors.push(
    `CRITICAL: ${payablesToWrongEvent.length} payable activities ` +
    `are not mapped to PAYABLES event: ${payablesToWrongEvent.join(', ')}`
  );
}
```

3. **Non-Expense to GOODS_SERVICES Error**
```typescript
if (nonExpensesToGoodsServices.length > 0) {
  errors.push(
    `ERROR: ${nonExpensesToGoodsServices.length} non-expense activities ` +
    `are mapped to GOODS_SERVICES: ${nonExpensesToGoodsServices.join(', ')}`
  );
}
```

### Warnings

1. **Missing Explicit Mappings**
```typescript
if (matchingActivities.length === 0) {
  warnings.push(
    `No activities found for mapping: ${mapping.projectType} - ${mapping.activityName}`
  );
}
```

## Testing Strategy

### Unit Tests

1. **Test Case-Insensitive Matching**
```typescript
describe('Activity Name Matching', () => {
  it('should match "Payable 1: Salaries" with "payable 1: salaries"', () => {
    const key1 = buildActivityKey('HIV', 'Payable 1: Salaries');
    const key2 = buildActivityKey('HIV', 'payable 1: salaries');
    expect(key1).toBe(key2);
  });
});
```

2. **Test Total Row Exclusion**
```typescript
describe('Total Row Filtering', () => {
  it('should exclude activities with isTotalRow=true', () => {
    const activities = [
      { id: 1, name: 'Item', isTotalRow: false },
      { id: 2, name: 'Total', isTotalRow: true }
    ];
    const filtered = filterMappableActivities(activities);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe(1);
  });
});
```

3. **Test Fallback Logic**
```typescript
describe('Fallback Mapping', () => {
  it('should only include B subcategory expenses', () => {
    const activities = [
      { id: 1, categoryCode: 'B', isTotalRow: false },
      { id: 2, categoryCode: 'E', isTotalRow: false }
    ];
    const fallback = getFallbackActivities(activities, new Set());
    expect(fallback).toHaveLength(1);
    expect(fallback[0].id).toBe(1);
  });
});
```

### Integration Tests

1. **Test Full Mapping Process**
```typescript
describe('seedExecutionEventMappings', () => {
  it('should map all payables to PAYABLES event', async () => {
    await seedExecutionEventMappings(db, 'HIV');
    
    const payableMappings = await db
      .select()
      .from(schema.configurableEventMappings)
      .where(/* payable activities */);
    
    expect(payableMappings.every(m => m.eventCode === 'PAYABLES')).toBe(true);
  });
});
```

2. **Test No Total Rows Mapped**
```typescript
describe('Total Row Exclusion', () => {
  it('should not create mappings for total rows', async () => {
    await seedExecutionEventMappings(db);
    
    const totalRowMappings = await db.execute(sql`
      SELECT COUNT(*) FROM configurable_event_mappings cem
      JOIN dynamic_activities da ON cem.activity_id = da.id
      WHERE da.is_total_row = true
    `);
    
    expect(totalRowMappings[0].count).toBe(0);
  });
});
```

### Validation Tests

1. **Run Validation After Seeding**
```typescript
describe('Mapping Validation', () => {
  it('should pass all validation checks', async () => {
    await seedExecutionEventMappings(db);
    const validation = await validateExecutionEventMappings(db);
    
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });
});
```

## Design Decisions

### Decision 1: Case-Insensitive Matching vs. Fixing Data

**Options:**
- A) Make matching case-insensitive
- B) Fix all activity names to match mapping definitions exactly

**Choice:** A - Case-insensitive matching

**Rationale:**
- More robust against future data entry variations
- Doesn't require modifying existing activity data
- Simpler to maintain - one place to handle case differences
- Follows principle of "be liberal in what you accept"

### Decision 2: Filter at Query vs. Filter in Memory

**Options:**
- A) Exclude total rows in SQL WHERE clause
- B) Load all activities and filter in JavaScript

**Choice:** A - Filter at query level

**Rationale:**
- More efficient - don't load unnecessary data
- Clearer intent in the query
- Reduces memory footprint
- Database can optimize the query better

### Decision 3: Comprehensive Validation vs. Basic Checks

**Options:**
- A) Add comprehensive validation function
- B) Keep basic verification only

**Choice:** A - Comprehensive validation

**Rationale:**
- Catches errors early before they affect financial statements
- Provides detailed diagnostics for troubleshooting
- Documents expected mapping behavior
- Prevents regression of these bugs

### Decision 4: Update Mapping Definitions vs. Dynamic Pattern Matching

**Options:**
- A) Update all 78 payable mapping definitions (13 × 3 projects × 2 facilities)
- B) Use pattern matching (e.g., `activityName.startsWith('Payable')`)

**Choice:** A - Update mapping definitions explicitly

**Rationale:**
- More explicit and maintainable
- Easier to audit which activities are mapped where
- Allows for future customization per payable type
- Case-insensitive matching handles the case issue
- Pattern matching could accidentally match unintended activities

## Performance Considerations

### Query Optimization

1. **Reduced Data Loading**
   - Filtering total rows at query level reduces data transfer
   - Estimated reduction: ~30 rows per project × 3 projects = 90 fewer rows

2. **Index Usage**
   - Existing indexes on `module_type` and `is_total_row` will be used
   - No new indexes required

### Memory Optimization

1. **Map Size Reduction**
   - Excluding total rows reduces map size by ~15%
   - Case-insensitive keys don't increase memory (same string length)

### Execution Time

- Expected impact: Negligible (< 100ms difference)
- Validation adds ~200ms but runs only during seeding
- Overall seeding time remains under 2 seconds

## Migration Strategy

### Database Changes

**No schema changes required** - all fixes are in application logic

### Data Migration

1. **Delete Incorrect Mappings**
```sql
-- Delete mappings for total rows
DELETE FROM configurable_event_mappings
WHERE activity_id IN (
  SELECT id FROM dynamic_activities 
  WHERE is_total_row = true AND module_type = 'execution'
);

-- Delete incorrect payable mappings
DELETE FROM configurable_event_mappings
WHERE activity_id IN (
  SELECT da.id FROM dynamic_activities da
  JOIN events e ON configurable_event_mappings.event_id = e.id
  WHERE da.name LIKE 'Payable%' 
    AND da.module_type = 'execution'
    AND e.code != 'PAYABLES'
);
```

2. **Re-run Seeder**
```bash
npm run seed:execution-mappings
```

### Rollback Plan

If issues arise:
1. Restore `configurable_event_mappings` table from backup
2. Revert code changes to `configurable-event-mappings.ts`
3. Re-run original seeder

## Monitoring and Logging

### Logging Enhancements

```typescript
console.log(`\n📊 MAPPING STATISTICS:`);
console.log(`  Total activities loaded: ${activities.length}`);
console.log(`  Total rows excluded: ${totalRowsExcluded}`);
console.log(`  Explicit mappings created: ${explicitMappingCount}`);
console.log(`  Fallback mappings created: ${fallbackMappingCount}`);
console.log(`\n📋 MAPPINGS BY EVENT:`);
Object.entries(mappingsByEvent).forEach(([event, count]) => {
  console.log(`  ${event}: ${count}`);
});

if (validationErrors.length > 0) {
  console.error(`\n❌ VALIDATION ERRORS:`);
  validationErrors.forEach(err => console.error(`  - ${err}`));
}
```

### Success Metrics

- Zero total rows mapped
- All 78 payable activities (13 × 3 × 2) mapped to PAYABLES
- Only B subcategory expenses mapped to GOODS_SERVICES
- Validation passes with no errors
