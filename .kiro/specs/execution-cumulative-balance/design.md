# Design Document

## Overview

The Execution Cumulative Balance feature adds intelligent cumulative balance calculations to execution activity data. The design implements two distinct calculation strategies based on the financial nature of each section: flow-based calculations (cumulative sum) for income/expense sections and stock-based calculations (latest quarter) for asset/liability sections. This approach ensures accurate financial reporting that aligns with accounting principles.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    API Request Layer                         │
│  (create/update execution handlers in execution.handlers.ts) │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              enrichFormData() Function                       │
│         (execution.helpers.ts - existing)                    │
│  • Normalizes activities array/object                        │
│  • Computes rollups by section/subsection                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         NEW: addCumulativeBalances() Function                │
│              (execution.helpers.ts)                          │
│  • Iterates through all activities                           │
│  • Determines section from activity code                     │
│  • Applies appropriate calculation strategy                  │
│  • Returns enriched activities with cumulative_balance       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Database Storage Layer                          │
│  • Stores formData with cumulative_balance in activities     │
│  • Maintains backward compatibility                          │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Input**: Client sends execution data with activities containing q1, q2, q3, q4 values
2. **Normalization**: `enrichFormData()` normalizes the data structure
3. **Calculation**: `addCumulativeBalances()` adds cumulative_balance to each activity
4. **Validation**: Balance validation runs using the enriched data
5. **Storage**: Data is saved with cumulative_balance included
6. **Output**: API responses include cumulative_balance for all activities

## Components and Interfaces

### 1. Helper Functions (execution.helpers.ts)

#### New Function: `addCumulativeBalances()`

```typescript
/**
 * Adds cumulative_balance to each activity based on its section type
 * @param activities - Keyed activities object from enrichFormData
 * @returns Activities object with cumulative_balance added to each activity
 */
export function addCumulativeBalances(activities: Record<string, any>): Record<string, any> {
  const enriched: Record<string, any> = {};
  
  for (const code in activities) {
    const activity = activities[code];
    const { section, subSection } = parseCode(code);
    
    // Determine calculation strategy based on section
    const cumulativeBalance = calculateCumulativeBalance(
      activity.q1 || 0,
      activity.q2 || 0,
      activity.q3 || 0,
      activity.q4 || 0,
      section,
      subSection
    );
    
    enriched[code] = {
      ...activity,
      cumulative_balance: cumulativeBalance
    };
  }
  
  return enriched;
}
```

#### New Function: `calculateCumulativeBalance()`

```typescript
/**
 * Calculates cumulative balance based on section type
 * @param q1, q2, q3, q4 - Quarter values
 * @param section - Main section code (A, B, D, E, G, etc.)
 * @param subSection - Subsection code (A, B, D, E, G)
 * @returns Calculated cumulative balance
 */
function calculateCumulativeBalance(
  q1: number,
  q2: number,
  q3: number,
  q4: number,
  section: string | null,
  subSection: string | null
): number {
  // Determine which section to use for calculation logic
  const effectiveSection = subSection || section;
  
  // Flow-based sections: cumulative sum (A, B, C, F, and flow items in G)
  const flowSections = ['A', 'B', 'C', 'F'];
  
  // Stock-based sections: latest quarter (D, E, and stock items in G)
  const stockSections = ['D', 'E'];
  
  if (flowSections.includes(effectiveSection || '')) {
    // Cumulative sum for flow sections
    return q1 + q2 + q3 + q4;
  } else if (stockSections.includes(effectiveSection || '')) {
    // Latest non-zero quarter for stock sections
    return getLatestQuarterValue(q1, q2, q3, q4);
  } else if (effectiveSection === 'G') {
    // Section G: default to cumulative sum (most G items are flows)
    // Special handling can be added for specific codes if needed
    return q1 + q2 + q3 + q4;
  } else {
    // Default to cumulative sum for unknown sections
    return q1 + q2 + q3 + q4;
  }
}
```

#### New Function: `getLatestQuarterValue()`

```typescript
/**
 * Gets the latest quarter value with data (including explicit zero)
 * @param q1, q2, q3, q4 - Quarter values (number | undefined | null)
 * @returns Latest quarter value with data, or undefined if all quarters are undefined/null
 */
function getLatestQuarterValue(
  q1: number | undefined | null,
  q2: number | undefined | null,
  q3: number | undefined | null,
  q4: number | undefined | null
): number | undefined {
  // Check quarters in reverse order (Q4 -> Q3 -> Q2 -> Q1)
  // Use the first DEFINED value (including explicit zero)
  if (q4 !== undefined && q4 !== null) return q4;
  if (q3 !== undefined && q3 !== null) return q3;
  if (q2 !== undefined && q2 !== null) return q2;
  if (q1 !== undefined && q1 !== null) return q1;
  return undefined; // No data entered for any quarter
}
```

#### Modified Function: `enrichFormData()`

```typescript
export function enrichFormData(
  formData: any,
  context: { projectType: string; facilityType: string; year?: number; quarter?: string; }
) {
  const incoming = Array.isArray(formData?.activities) ? formData.activities : [];
  const activities = toKeyedActivities(incoming);
  
  // NEW: Add cumulative balances to activities
  const activitiesWithBalances = addCumulativeBalances(activities);
  
  const rollups = computeRollups(activitiesWithBalances);
  
  return {
    version: '1.0',
    context,
    activities: activitiesWithBalances, // Now includes cumulative_balance
    rollups,
  };
}
```

### 2. Handler Modifications (execution.handlers.ts)

#### Create Handler

No changes needed - `enrichFormData()` is already called and will automatically add cumulative_balance.

#### Update Handler

No changes needed - `enrichFormData()` is already called and will automatically add cumulative_balance.

#### GetOne Handler

Modify the `pushItem` helper to include cumulative_balance in the UI response:

```typescript
const pushItem = (rec: any, targetArr: any[]) => {
  const code = rec.code as string;
  const label = codeToName.get(code) || code;
  const v = valueByCode.get(code) || { q1: 0, q2: 0, q3: 0, q4: 0 };
  
  // Calculate cumulative_balance for UI display
  const { section, subSection } = parseCode(code);
  const cumulativeBalance = calculateCumulativeBalance(
    v.q1, v.q2, v.q3, v.q4, section, subSection
  );

  const item = {
    code,
    label,
    q1: v.q1,
    q2: v.q2,
    q3: v.q3,
    q4: v.q4,
    total: v.q1 + v.q2 + v.q3 + v.q4,
    cumulative_balance: cumulativeBalance // NEW
  };
  
  targetArr.push(item);
  return item.total;
};
```

#### CheckExisting Handler

Same modification as getOne - update the `pushItem` helper to include cumulative_balance.

## Data Models

### Activity Object Structure (Before)

```typescript
{
  code: "MAL_EXEC_HEALTH_CENTER_A_2",
  q1: 80000,
  q2: 80000,
  q3: 80000,
  q4: 0,
  comment: "",
  section: "CENTER",
  subSection: "A"
}
```

### Activity Object Structure (After)

```typescript
{
  code: "MAL_EXEC_HEALTH_CENTER_A_2",
  q1: 80000,
  q2: 80000,
  q3: 80000,
  q4: 0,
  cumulative_balance: 240000, // NEW: Sum for flow section A
  comment: "",
  section: "CENTER",
  subSection: "A"
}
```

### Example: Stock Section (D - Financial Assets)

**Case 1: Explicit zero in latest quarter**
```typescript
{
  code: "MAL_EXEC_HEALTH_CENTER_D_1", // Cash at bank
  q1: 25000,
  q2: 0,        // Explicit zero = "no balance remaining"
  q3: undefined,
  q4: undefined,
  cumulative_balance: 0, // NEW: Latest quarter with data is Q2 = 0
  comment: "",
  section: "CENTER",
  subSection: "D"
}
```

**Case 2: Latest quarter has value**
```typescript
{
  code: "MAL_EXEC_HEALTH_CENTER_D_1",
  q1: 25000,
  q2: 43000,
  q3: 3000,
  q4: undefined,
  cumulative_balance: 3000, // NEW: Latest quarter with data is Q3 = 3000
  comment: "",
  section: "CENTER",
  subSection: "D"
}
```

**Case 3: No data entered**
```typescript
{
  code: "MAL_EXEC_HEALTH_CENTER_D_1",
  q1: undefined,
  q2: undefined,
  q3: undefined,
  q4: undefined,
  cumulative_balance: undefined, // NEW: No data entered
  comment: "",
  section: "CENTER",
  subSection: "D"
}
```

## UI Display Logic

### Display Rules by Section Type

The UI must distinguish between meaningful zero values and missing data based on section type.

#### Stock Sections (D, E)

For financial assets and liabilities, explicit zero has meaning (no balance remaining):

```typescript
function formatCumulativeBalance(value: number | undefined, sectionCode: string): string {
  const stockSections = ['D', 'E'];
  const isStockSection = stockSections.includes(sectionCode);
  
  if (isStockSection) {
    // Stock sections: distinguish between 0 and undefined
    if (value === undefined || value === null) {
      return "—"; // No data entered
    }
    if (value === 0) {
      return "0"; // Explicit zero = no balance remaining
    }
    return value.toLocaleString(); // Format number
  } else {
    // Flow sections: 0 and undefined both show as dash
    if (value === undefined || value === null || value === 0) {
      return "—"; // No activity or no data
    }
    return value.toLocaleString(); // Format number
  }
}
```

#### Flow Sections (A, B, C, F, G)

For income/expense sections, zero typically means no activity (same as no data):

| Value | Display | Meaning |
|-------|---------|---------|
| undefined/null | "—" | No data entered |
| 0 | "—" | No activity |
| Non-zero | Formatted number | Activity occurred |

#### Stock Sections (D, E)

For asset/liability sections, zero is meaningful:

| Value | Display | Meaning |
|-------|---------|---------|
| undefined/null | "—" | No data entered |
| 0 | "0" | No balance remaining |
| Non-zero | Formatted number | Current balance |

### Example Scenarios

**Scenario 1: Cash at Bank (Section D)**
- Q1 = 25,000 → Display: "25,000"
- Q2 = 0 (explicit) → Display: "0" (funds depleted)
- Cumulative Balance = 0 → Display: "0"

**Scenario 2: Receipts (Section A)**
- Q1 = 50,000 → Display: "50,000"
- Q2 = 0 → Display: "—" (no receipts)
- Cumulative Balance = 50,000 → Display: "50,000"

**Scenario 3: No Data Entered**
- Q1 = undefined → Display: "—"
- Q2 = undefined → Display: "—"
- Cumulative Balance = undefined → Display: "—"

## Error Handling

### Validation Strategy

1. **Input Validation**: Ensure q1-q4 are numeric values (default to 0 if missing)
2. **Section Detection**: Handle cases where section cannot be determined from code
3. **Calculation Errors**: Log warnings if cumulative_balance calculation fails
4. **Backward Compatibility**: Handle activities without cumulative_balance gracefully

### Error Scenarios

| Scenario | Handling |
|----------|----------|
| Missing quarter values (undefined/null) | Keep as undefined for stock sections; treat as 0 for flow sections |
| Invalid activity code | Default to cumulative sum calculation |
| All quarters are undefined | Set cumulative_balance to undefined |
| All quarters are explicit zero | Set cumulative_balance to 0 |
| Negative values | Allow (valid for corrections/adjustments) |
| Non-numeric values | Convert to undefined and log warning |

## Testing Strategy

### Unit Tests

1. **Flow Section Calculations**
   - Test cumulative sum for sections A, B, C, F
   - Test with all quarters filled
   - Test with some quarters zero
   - Test with all quarters zero

2. **Stock Section Calculations**
   - Test latest quarter logic for sections D, E
   - Test Q4 as latest (Q4 defined, others undefined)
   - Test Q3 as latest (Q4 undefined, Q3 defined)
   - Test Q2 as latest (Q4, Q3 undefined, Q2 defined)
   - Test Q1 as latest (Q4, Q3, Q2 undefined, Q1 defined)
   - Test explicit zero as latest (Q2 = 0, Q1 = 25000) → should return 0
   - Test all quarters undefined → should return undefined
   - Test all quarters explicit zero → should return 0

3. **Section G Handling**
   - Test flow items in G (accumulated balances)
   - Test computed surplus/deficit item

4. **Helper Functions**
   - Test `addCumulativeBalances()` with various activity structures
   - Test `calculateCumulativeBalance()` with edge cases
   - Test `getLatestQuarterValue()` with all combinations

### Integration Tests

1. **Create Execution Entry**
   - Verify cumulative_balance is added to all activities
   - Verify stored data includes cumulative_balance
   - Verify balance validation still works

2. **Update Execution Entry**
   - Verify cumulative_balance is recalculated
   - Verify updated values are correct

3. **Read Operations**
   - Verify getOne includes cumulative_balance in UI
   - Verify list includes cumulative_balance in formData
   - Verify checkExisting includes cumulative_balance

4. **Backward Compatibility**
   - Test reading legacy data without cumulative_balance
   - Verify on-the-fly calculation works
   - Test updating legacy data adds cumulative_balance

## Performance Considerations

### Optimization Strategies

1. **Calculation Efficiency**: Simple arithmetic operations (O(1) per activity)
2. **Memory Usage**: Minimal overhead (one additional number per activity)
3. **Database Impact**: No schema changes, only data enrichment
4. **API Response Time**: Negligible impact (<1ms per 100 activities)

### Scalability

- **Activities per Entry**: Typical 20-50 activities, max ~200
- **Calculation Time**: ~0.1ms per activity
- **Total Overhead**: <20ms for typical entry, <200ms for max size

## Migration Strategy

### Phase 1: Soft Launch (Backward Compatible)

1. Deploy code changes that add cumulative_balance during create/update
2. Existing data remains unchanged
3. Read operations calculate cumulative_balance on-the-fly if missing
4. No breaking changes to API contracts

### Phase 2: Data Migration (Optional)

1. Create migration script to add cumulative_balance to existing entries
2. Run migration during low-traffic period
3. Verify data integrity after migration
4. Monitor for any issues

### Phase 3: Cleanup (Future)

1. Remove on-the-fly calculation fallbacks (after all data migrated)
2. Make cumulative_balance required in validation
3. Update API documentation

## Security Considerations

- **Input Validation**: Validate quarter values are numeric
- **Authorization**: No changes to existing access control
- **Data Integrity**: Cumulative_balance is calculated, not user-provided
- **Audit Trail**: Existing audit mechanisms apply

## Monitoring and Logging

### Logging Points

1. Log when cumulative_balance calculation fails
2. Log when section cannot be determined from code
3. Log when legacy data is encountered (missing cumulative_balance)
4. Debug log showing calculation details (when enabled)

### Metrics to Track

1. Number of activities processed per request
2. Calculation errors/warnings
3. Legacy data encounters
4. Performance impact on create/update operations

## Dependencies

### Internal Dependencies

- `execution.helpers.ts`: Core calculation logic
- `execution.handlers.ts`: Integration points
- `execution.types.ts`: Type definitions (may need updates)

### External Dependencies

None - uses only standard JavaScript/TypeScript features

## Rollback Plan

### Rollback Procedure

1. Revert code changes to previous version
2. Existing data with cumulative_balance remains valid (ignored by old code)
3. No data cleanup needed
4. System returns to previous behavior

### Rollback Impact

- Minimal impact - cumulative_balance is additive, not breaking
- Existing functionality unaffected
- Data integrity maintained
