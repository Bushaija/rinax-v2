# Cash at Bank Auto-Calculation Fix for Malaria Program

## Problem Statement
After adding two new activities (`Communication - Airtime` and `Communication - Internet`) under B-04 Overheads, the cash at bank auto-computation stopped working **only for the Malaria program**. HIV program continued to work correctly.

## Final Solution (Implemented)
**Normalize project type at the source** - Convert `'Malaria'` to `'MAL'` at the page level before passing to components. This is cleaner and more maintainable than mapping in multiple places.

## Root Cause Analysis

### The Issue
There was a **mismatch between activity code prefixes** used by the backend seed file and the frontend code:

1. **Backend (Seed File)**:
   - Uses `'MAL'` as the internal project type identifier
   - Generates activity codes like: `MAL_EXEC_HOSPITAL_D_1`
   - Converts to `'Malaria'` when saving to database via `toDbProjectType()` function

2. **Frontend (React Components)**:
   - Receives `projectType = 'Malaria'` from the database
   - Constructs activity codes using `projectType.toUpperCase()` → `'MALARIA'`
   - Looks for: `MALARIA_EXEC_HOSPITAL_D_1` ❌ (doesn't exist!)

3. **Result**:
   - Frontend couldn't find the cash at bank activity to update
   - Auto-calculation failed silently

### Why HIV Worked But Malaria Didn't
- HIV uses `'HIV'` in both seed file and database → `HIV_EXEC_HOSPITAL_D_1` ✅
- Malaria uses `'MAL'` in seed but `'Malaria'` in database → mismatch ❌
- TB would have the same issue (uses `'TB'` everywhere, so it works)

## The Fix

### Files Modified
1. `apps/client/app/dashboard/execution/new/page.tsx` - **Main fix location**
2. `apps/client/features/execution/components/v2/enhanced-execution-form.tsx` - Type updates
3. `apps/client/features/execution/components/v2/enhanced-execution-form-auto-load.tsx` - Type updates
4. `apps/client/hooks/use-execution-form.ts` - Type updates
5. `apps/client/hooks/use-execution-submission-handler.ts` - Type updates

### Changes Made

**1. Normalize at the source (page.tsx):**
```typescript
// Normalize Malaria to MAL for consistency with activity codes
const normalizedProgram = rawProgram.toUpperCase() === "MALARIA" ? "MAL" : rawProgram;
const projectType = (allowedPrograms.has(normalizedProgram) ? normalizedProgram : "HIV") as "HIV" | "MAL" | "TB";
```

**2. Update TypeScript types throughout:**
```typescript
// Changed from:
projectType: "HIV" | "Malaria" | "TB"

// To:
projectType: "HIV" | "MAL" | "TB"
```

**3. Simplified component logic:**
```typescript
// No more complex mapping needed - projectType is already "MAL"
const projectPrefix = projectType.toUpperCase(); // "MAL"
const cashAtBankCode = `${projectPrefix}_EXEC_${facilityPrefix}_D_1`; // "MAL_EXEC_HOSPITAL_D_1"
```

### URL Parameter Handling
Both URL formats now work correctly:
- `?projectId=MAL` → normalized to `'MAL'` ✅
- `?projectId=Malaria` → normalized to `'MAL'` ✅
- `?projectId=malaria` → normalized to `'MAL'` ✅

### Code Locations
The fix was applied in 3 locations where `cashAtBankCode` is constructed:

1. **enhanced-execution-form.tsx** (line ~165)
2. **enhanced-execution-form-auto-load.tsx** (line ~204)
3. **enhanced-execution-form-auto-load.tsx** (line ~241)

## Testing Recommendations

### Test Case 1: Malaria Program - New Execution
1. Create a new execution entry for Byumba Hospital, Malaria program
2. Enter "Transfers from SPIU/RBC" amount (e.g., 85,000)
3. **Expected**: Cash at Bank should auto-calculate to 85,000
4. Mark some expenses as paid/unpaid
5. **Expected**: Cash at Bank should update automatically

### Test Case 2: HIV Program - Regression Test
1. Create a new execution entry for Byumba Hospital, HIV program
2. Enter "Transfers from SPIU/RBC" amount (e.g., 100,000)
3. **Expected**: Cash at Bank should still auto-calculate correctly (no regression)

### Test Case 3: TB Program - Verification
1. Create a new execution entry for any facility, TB program
2. **Expected**: Cash at Bank should auto-calculate correctly

## Why the New Activities Weren't the Problem

The addition of `Communication - Airtime` and `Communication - Internet` activities was **NOT the root cause**. These activities:
- Were added correctly to Section B-04 (Overheads)
- Had corresponding payables in Section E
- Did not affect Section D (Financial Assets) where Cash at Bank lives

The timing was coincidental - the issue existed before but only manifested when testing Malaria after testing HIV.

## Prevention

To prevent similar issues in the future:

1. **Standardize Project Type Identifiers**: Consider using consistent identifiers across seed files and database (either all use 'MAL' or all use 'Malaria')

2. **Add Type Mapping Utility**: Create a centralized utility function for project type mapping:
   ```typescript
   // utils/project-type-mapper.ts
   export function getActivityCodePrefix(projectType: string): string {
     const mapping: Record<string, string> = {
       'HIV': 'HIV',
       'Malaria': 'MAL',
       'TB': 'TB'
     };
     return mapping[projectType] || projectType.toUpperCase();
   }
   ```

3. **Add Integration Tests**: Test activity code construction for all project types

## Related Files
- Backend seed: `apps/server/src/db/seeds/modules/execution-categories-activities.ts`
- Frontend forms: `apps/client/features/execution/components/v2/enhanced-execution-form*.tsx`
- Carryforward service: `apps/server/src/lib/statement-engine/services/carryforward-service.ts`
