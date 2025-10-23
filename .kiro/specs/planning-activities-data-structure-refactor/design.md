# Design Document

## Overview

This design document outlines the approach for refactoring the planning activities data structure from a hierarchical `PROGRAM_CONFIGURATIONS` array to a flat `programActivities` object. The refactoring will maintain all existing functionality while simplifying the data structure and improving maintainability.

## Architecture

### Current Architecture

The current implementation uses:
- `PROGRAM_CONFIGURATIONS`: Array of `ProgramConfig` objects
- Each `ProgramConfig` contains:
  - `projectType`: Program identifier (HIV, Malaria, TB)
  - `facilityTypes`: Array of applicable facility types
  - `categories`: Array of category configurations with nested activities
- Activities use `applicableTo` property to indicate facility applicability ('hospital', 'health_center', 'both')

### New Architecture

The new implementation will use:
- `programActivities`: Record/object keyed by program type (HIV, MAL, TB)
- Each program contains a flat array of `PlanningActivityData` objects
- Each activity explicitly specifies:
  - `facilityType`: Direct facility type assignment
  - `categoryCode`: Category identifier
  - `name`: Activity name
  - `displayOrder`: Ordering within category
- `categoryDisplayNames`: Separate mapping for category metadata

### Key Architectural Changes

1. **Flattening**: Move from nested structure to flat array per program
2. **Explicit Facility Assignment**: Replace `applicableTo` logic with direct `facilityType` assignment
3. **Separation of Concerns**: Move category metadata to separate `categoryDisplayNames` object
4. **Duplication for 'both'**: Activities that apply to both facility types will be duplicated in the data

## Components and Interfaces

### New Data Structures

```typescript
interface PlanningActivityData {
  facilityType: 'hospital' | 'health_center';
  categoryCode: string;
  name: string;
  displayOrder: number;
  isAnnualOnly?: boolean;
}

const programActivities: Record<string, PlanningActivityData[]> = {
  HIV: [...],
  MAL: [...],  // Note: Using 'MAL' instead of 'Malaria'
  TB: [...]
};

const categoryDisplayNames: Record<string, Record<string, string>> = {
  HIV: {
    'HR': 'Human Resources (HR)',
    'TRC': 'Travel Related Costs (TRC)',
    'HPE': 'Health Products & Equipment (HPE)',
    'PA': 'Program Administration Costs (PA)'
  },
  MALARIA: {  // Note: Using 'MALARIA' for category names
    'EPID': 'Epidemiology',
    'PM': 'Program Management',
    'HR': 'Human Resources'
  },
  TB: {
    'HR': 'Human Resources (HR)',
    'TRC': 'Travel Related Costs (TRC)',
    'PA': 'Program Administration Costs (PA)'
  }
};
```

### Modified Functions

#### 1. `seedFormSchemas(db: Database)`

**Current Behavior:**
- Iterates over `PROGRAM_CONFIGURATIONS`
- Uses `config.projectType` and `config.facilityTypes`

**New Behavior:**
- Extract unique program types from `programActivities` keys
- Extract unique facility types from activities within each program
- Create form schemas for each program-facility combination

#### 2. `seedSchemaActivityCategories(db: Database)`

**Current Behavior:**
- Iterates over `PROGRAM_CONFIGURATIONS` and nested categories
- Uses category metadata from `CategoryConfig` objects

**New Behavior:**
- Extract unique category codes from activities
- Look up category names and descriptions from `categoryDisplayNames`
- Handle program name normalization (MAL → Malaria, MALARIA → Malaria)
- Create categories for each program-facility-category combination

#### 3. `seedDynamicActivities(db: Database)`

**Current Behavior:**
- Filters activities based on `applicableTo` property
- Processes activities that match facility type or are marked as 'both'

**New Behavior:**
- Directly use activities from flat array
- No filtering needed as each activity explicitly specifies its facility type
- Group activities by program, facility type, and category code
- Maintain display order within each category

## Data Models

### Activity Mapping Logic

**Old Logic:**
```typescript
const relevantActivities = category.activities.filter(activity => 
  activity.applicableTo === facilityType || activity.applicableTo === 'both'
);
```

**New Logic:**
```typescript
const relevantActivities = programActivities[programKey].filter(activity =>
  activity.facilityType === facilityType &&
  activity.categoryCode === categoryCode
);
```

### Category Metadata Resolution

**Old Logic:**
```typescript
// Category metadata embedded in structure
{
  code: 'HR',
  name: 'Human Resources (HR)',
  description: 'Staff salaries and bonuses',
  displayOrder: 1
}
```

**New Logic:**
```typescript
// Category metadata looked up from separate mapping
const categoryName = categoryDisplayNames[normalizedProgramType]?.[categoryCode];
const categoryDescription = deriveCategoryDescription(categoryCode);
```

### Program Type Normalization

The new structure uses different program identifiers:
- `programActivities` uses: 'HIV', 'MAL', 'TB'
- `categoryDisplayNames` uses: 'HIV', 'MALARIA', 'TB'
- Database uses: 'HIV', 'Malaria', 'TB'

A normalization function will handle these variations:

```typescript
function normalizeProgramType(programKey: string): 'HIV' | 'Malaria' | 'TB' {
  if (programKey === 'MAL' || programKey === 'MALARIA') return 'Malaria';
  return programKey as 'HIV' | 'Malaria' | 'TB';
}

function getCategoryDisplayKey(programKey: string): string {
  if (programKey === 'MAL') return 'MALARIA';
  return programKey;
}
```

## Error Handling

### Missing Category Metadata

**Issue:** Category code exists in activities but not in `categoryDisplayNames`

**Solution:**
- Log warning with category code and program type
- Use fallback: category code as display name
- Continue processing to avoid blocking seed operation

### Duplicate Activities

**Issue:** Multiple activities with same facility type, category, and display order

**Solution:**
- Rely on database unique constraints
- Use `onConflictDoUpdate` to handle duplicates gracefully
- Log warning about potential data issues

### Program Type Mismatches

**Issue:** Program key in `programActivities` doesn't match expected database values

**Solution:**
- Implement normalization function
- Map 'MAL' → 'Malaria' consistently
- Validate program types before database insertion

## Testing Strategy

### Unit Testing Approach

1. **Data Structure Validation**
   - Verify all activities have required fields
   - Check for duplicate activities within same category/facility
   - Validate category codes exist in `categoryDisplayNames`

2. **Normalization Function Testing**
   - Test program type normalization (MAL → Malaria)
   - Test category display key mapping (MAL → MALARIA)
   - Verify bidirectional consistency

3. **Activity Filtering**
   - Test grouping activities by program, facility, and category
   - Verify display order preservation
   - Check special properties (isAnnualOnly) are maintained

### Integration Testing Approach

1. **Seed Function Testing**
   - Run seed functions against test database
   - Verify record counts match expected values
   - Check foreign key relationships are maintained

2. **Data Integrity Verification**
   - Compare seeded data with original structure
   - Verify all activities are created
   - Check category associations are correct

3. **Backward Compatibility**
   - Ensure existing queries continue to work
   - Verify API responses remain unchanged
   - Test planning module functionality end-to-end

### Manual Testing Checklist

- [ ] Run seed script and verify no errors
- [ ] Check database for correct number of form schemas
- [ ] Verify categories are created with correct names
- [ ] Confirm activities are associated with correct categories
- [ ] Test planning module in UI to ensure activities display correctly
- [ ] Verify facility-specific activities only appear for correct facility types

## Migration Strategy

### Phase 1: Preparation
1. Create backup of current seed file
2. Define new data structures and interfaces
3. Implement normalization helper functions

### Phase 2: Data Migration
1. Replace `PROGRAM_CONFIGURATIONS` with `programActivities`
2. Add `categoryDisplayNames` mapping
3. Update TypeScript interfaces if needed

### Phase 3: Function Refactoring
1. Update `seedFormSchemas` to work with new structure
2. Refactor `seedSchemaActivityCategories` to use `categoryDisplayNames`
3. Modify `seedDynamicActivities` to process flat activity arrays
4. Update helper functions and exports

### Phase 4: Testing and Validation
1. Run seed script in development environment
2. Verify database state matches expectations
3. Test planning module functionality
4. Address any issues discovered

### Phase 5: Deployment
1. Update seed script in version control
2. Document changes in commit message
3. Run seed script in staging environment
4. Deploy to production after validation

## Performance Considerations

### Current Performance
- Nested iteration over programs, facility types, and categories
- Filtering activities for each facility type

### New Performance
- Direct array access by program key
- Simple filtering by facility type and category code
- Slightly more memory usage due to activity duplication for 'both' cases

**Expected Impact:** Negligible performance difference. The new structure may be slightly faster due to reduced nesting, but the difference will be imperceptible given the small dataset size (< 200 activities total).

## Rollback Plan

If issues are discovered after deployment:

1. **Immediate Rollback**
   - Revert to previous version of seed file from version control
   - Re-run seed script to restore original data structure

2. **Data Cleanup**
   - If new seed has already run, may need to truncate affected tables
   - Re-seed with original structure

3. **Investigation**
   - Identify root cause of issues
   - Fix problems in new structure
   - Re-test before attempting deployment again
