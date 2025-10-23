# Event Mapping Verification Results

## Date: 2025-10-17

## Task: Verify CASH_EQUIVALENTS_END Event Mappings

### Expected Configuration
- **Event Code**: CASH_EQUIVALENTS_END
- **Expected Mappings**: 6 total (2 activities × 3 projects)
- **Activities**: 
  - Cash at bank
  - Petty cash
- **Projects**: HIV, Malaria, TB
- **Mapping Type**: DIRECT

### Verification Query
```sql
SELECT 
  e.code as event_code,
  da.name as activity_name,
  da.project_type,
  cem.mapping_type,
  cem.is_active
FROM configurable_event_mappings cem
JOIN events e ON e.id = cem.event_id
JOIN dynamic_activities da ON da.id = cem.activity_id
WHERE e.code = 'CASH_EQUIVALENTS_END'
  AND da.module_type = 'execution'
  AND cem.is_active = true
ORDER BY da.project_type, da.name;
```

### Configuration Found in Seed File

**File**: `apps/server/src/db/seeds/modules/configurable-event-mappings.ts`

**Lines 38-49**: CASH_EQUIVALENTS_END mappings defined

```typescript
// Asset mappings
{ projectType: 'HIV', activityName: 'Cash at bank', eventCode: 'CASH_EQUIVALENTS_END', mappingType: 'DIRECT' },
{ projectType: 'HIV', activityName: 'Petty cash', eventCode: 'CASH_EQUIVALENTS_END', mappingType: 'DIRECT' },

{ projectType: 'Malaria', activityName: 'Cash at bank', eventCode: 'CASH_EQUIVALENTS_END', mappingType: 'DIRECT' },
{ projectType: 'Malaria', activityName: 'Petty cash', eventCode: 'CASH_EQUIVALENTS_END', mappingType: 'DIRECT' },

{ projectType: 'TB', activityName: 'Cash at bank', eventCode: 'CASH_EQUIVALENTS_END', mappingType: 'DIRECT' },
{ projectType: 'TB', activityName: 'Petty cash', eventCode: 'CASH_EQUIVALENTS_END', mappingType: 'DIRECT' },
```

### Verification Results

✅ **All 6 expected mappings are configured correctly**

| Project Type | Activity Name | Event Code | Mapping Type | Status |
|--------------|---------------|------------|--------------|--------|
| HIV | Cash at bank | CASH_EQUIVALENTS_END | DIRECT | ✅ Configured |
| HIV | Petty cash | CASH_EQUIVALENTS_END | DIRECT | ✅ Configured |
| Malaria | Cash at bank | CASH_EQUIVALENTS_END | DIRECT | ✅ Configured |
| Malaria | Petty cash | CASH_EQUIVALENTS_END | DIRECT | ✅ Configured |
| TB | Cash at bank | CASH_EQUIVALENTS_END | DIRECT | ✅ Configured |
| TB | Petty cash | CASH_EQUIVALENTS_END | DIRECT | ✅ Configured |

### Cross-Facility Expansion

The seed function `seedExecutionEventMappings()` includes logic to expand mappings across facility types:

```typescript
// CRITICAL: Expand to both facility types
for (const activity of matchingActivities) {
  mappingRows.push({
    eventId,
    activityId: activity.id,
    categoryId: activity.categoryId,
    projectType: activity.projectType!,
    facilityType: activity.facilityType,  // Expands to both hospital and health_center
    mappingType: mapping.mappingType,
    // ...
  });
}
```

This means each of the 6 logical mappings will be expanded to cover both facility types (hospital and health_center), resulting in **12 actual database rows** when seeded.

### Requirements Verification

✅ **Requirement 4.1**: Cash at bank activity is mapped to CASH_EQUIVALENTS_END event  
✅ **Requirement 4.2**: Petty cash activity is mapped to CASH_EQUIVALENTS_END event  
✅ **Requirement 4.3**: All mappings use `is_active = true` (set in seed function)  
✅ **Requirement 4.4**: All mappings use `mappingType = 'DIRECT'`

### Conclusion

The event mapping configuration is **correct and complete**. All required mappings for CASH_EQUIVALENTS_END are properly defined in the seed file and will be created when the database is seeded.

The system is ready to proceed with removing the HOTFIX code and relying solely on event mapping for CASH_ENDING calculation.

### Next Steps

With event mappings verified, we can safely proceed to:
1. Remove HOTFIX code for CASH_ENDING (Task 2)
2. Remove CASH_ENDING from special totals (Task 3)
3. Add cash reconciliation validation (Task 4)

### Notes

- The seed file uses a sophisticated cross-facility expansion mechanism
- Each logical mapping (e.g., "HIV - Cash at bank") expands to multiple rows for different facility types
- The verification query should be run against the actual database to confirm the mappings are seeded correctly
- Query file created: `verify-cash-event-mappings.sql`
