# Execution New Page - How It Works

## Overview

The execution new page (`apps/client/app/dashboard/execution/new/page.tsx`) is a **server component** that handles the creation of new execution records. It uses a smart auto-load system that can detect and load existing execution data if it already exists for the given parameters.

---

## Page Structure

### 1. **Server Component**
```tsx
export default async function CreateDynamicExecutionPage(props: PageProps)
```

- This is an **async server component** (Next.js 13+ App Router)
- Handles search params on the server side
- Validates and normalizes input parameters
- Passes clean props to the client component

### 2. **Search Parameters Handling**

The page accepts these URL parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `projectId` | string | "HIV" | Project type (HIV/TB/Malaria) or numeric ID |
| `facilityType` | string | "health_center" | Facility type (hospital/health_center) |
| `quarter` | string | "Q1" | Quarter (Q1/Q2/Q3/Q4) |
| `program` | number | - | Alternative project ID parameter |
| `facilityId` | number | - | Facility ID |
| `reportingPeriodId` | number | - | Reporting period ID |
| `facilityName` | string | - | Facility name for display |

**Example URLs:**
```
/dashboard/execution/new?projectId=HIV&facilityType=hospital&quarter=Q2
/dashboard/execution/new?projectId=1&facilityId=5&reportingPeriodId=3
```

---

## How It Works

### Step 1: Parameter Extraction and Validation

```tsx
const awaitedSearchParams = typeof (props.searchParams as any)?.then === "function"
  ? await (props.searchParams as Promise<Record<string, string | string[] | undefined>>)
  : ((props.searchParams as Record<string, string | string[] | undefined>) ?? {});
```

**Purpose**: Handles both Promise-based and direct search params (Next.js compatibility)

### Step 2: Parameter Normalization

```tsx
function asString(value: string | string[] | undefined, fallback = ""): string {
  if (Array.isArray(value)) return value[0] ?? fallback;
  return value ?? fallback;
}
```

**Purpose**: Converts array or undefined values to strings safely

### Step 3: Validation with Allowed Sets

```tsx
const allowedPrograms = new Set(["HIV", "Malaria", "TB"]);
const allowedFacilityTypes = new Set(["hospital", "health_center"]);
const allowedQuarters = new Set(["Q1", "Q2", "Q3", "Q4"]);

const projectType = (allowedPrograms.has(rawProgram) ? rawProgram : "HIV") as "HIV" | "Malaria" | "TB";
const facilityType = (allowedFacilityTypes.has(rawFacilityType) ? rawFacilityType : "health_center") as "hospital" | "health_center";
const quarter = (allowedQuarters.has(rawQuarter) ? rawQuarter : "Q1") as "Q1" | "Q2" | "Q3" | "Q4";
```

**Purpose**: 
- Validates input against allowed values
- Provides safe defaults if invalid
- Ensures type safety

### Step 4: Smart Project ID Resolution

```tsx
projectId={(() => {
  const projectIdParam = asString(awaitedSearchParams.projectId);
  const programParam = asString(awaitedSearchParams.program);
  
  // If projectId is numeric, use it; otherwise use program parameter
  if (/^\d+$/.test(projectIdParam)) {
    return Number(projectIdParam);
  } else if (/^\d+$/.test(programParam)) {
    return Number(programParam);
  }
  return undefined;
})()}
```

**Purpose**: 
- Handles both string project types ("HIV") and numeric IDs (1)
- Checks `projectId` parameter first
- Falls back to `program` parameter
- Returns undefined if neither is numeric

### Step 5: Render Auto-Load Component

```tsx
<EnhancedExecutionFormAutoLoad 
  projectType={projectType} 
  facilityType={facilityType} 
  quarter={quarter}
  mode="create"
  projectId={...}
  facilityId={...}
  reportingPeriodId={...}
  facilityName={...}
  programName={projectType}
/>
```

---

## EnhancedExecutionFormAutoLoad Component

This is the **client component** that handles the actual form logic.

### Key Features:

#### 1. **Existing Execution Detection**

```tsx
const shouldCheckForExisting = Boolean(
  projectId && 
  facilityId && 
  reportingPeriodId && 
  effectiveMode === "create" && 
  !executionId
);

const { 
  data: existingExecution, 
  isLoading: isCheckingExisting,
  refetch: recheckExisting 
} = useCheckExistingExecution({
  projectId: String(projectId),
  facilityId: String(facilityId),
  reportingPeriodId: String(reportingPeriodId),
});
```

**Purpose**: 
- Checks if an execution already exists for the given parameters
- Only checks in "create" mode
- Prevents duplicate executions

#### 2. **Auto-Load Existing Data**

```tsx
useEffect(() => {
  if (existingExecution?.exists && existingExecution?.entry && !initialData && !autoLoadedRef.current) {
    const entry = existingExecution.entry;
    const activities = entry.formData?.activities || {};
    const transformedData: Record<string, any> = {};
    // ... transform and load data
    autoLoadedRef.current = true;
  }
}, [existingExecution, initialData]);
```

**Purpose**: 
- Automatically loads existing execution data if found
- Transforms data to match form format
- Uses ref to prevent infinite loops
- Only loads once

#### 3. **Form State Management**

```tsx
const form = useExecutionForm({ 
  projectType, 
  facilityType, 
  quarter, 
  executionId, 
  initialData 
});
```

**Purpose**: 
- Manages form state
- Handles validation
- Tracks changes

#### 4. **Temporary Save Store**

```tsx
const { getTempSave, setTempSave, clearTempSave } = useTempSaveStore();
const saveId = generateSaveId({ projectId, facilityId, reportingPeriodId, quarter });
```

**Purpose**: 
- Saves form data temporarily (browser storage)
- Allows users to resume work
- Prevents data loss

---

## Data Flow

```
1. User navigates to /dashboard/execution/new?params
   ↓
2. Server component extracts and validates params
   ↓
3. Server component renders EnhancedExecutionFormAutoLoad
   ↓
4. Client component checks for existing execution
   ↓
5a. If exists → Auto-load existing data
5b. If not exists → Check temp save
5c. If no temp save → Start with empty form
   ↓
6. User fills form
   ↓
7. Form auto-saves to temp storage
   ↓
8. User submits
   ↓
9. Submit handler creates/updates execution
   ↓
10. Redirect to execution list
```

---

## Smart Features

### 1. **Duplicate Prevention**
- Checks if execution already exists before creating
- Auto-loads existing data if found
- Prevents accidental duplicates

### 2. **Data Recovery**
- Saves form data to temporary storage
- Recovers data if user navigates away
- Clears temp data after successful submission

### 3. **Flexible Parameter Handling**
- Accepts both string project types ("HIV") and numeric IDs (1)
- Handles multiple parameter formats
- Provides safe defaults

### 4. **Type Safety**
- Validates all inputs against allowed sets
- Uses TypeScript for type checking
- Prevents invalid data

---

## Current Issues/Observations

### 1. **No Page Header**
- Missing back button
- No page title or description
- Inconsistent with planning module

### 2. **Simple Container**
- Just `<div className="p-4">`
- No background or max-width
- Less professional appearance

### 3. **No Loading State**
- No skeleton while checking for existing execution
- No feedback during data load

### 4. **No Error Handling**
- No error display if check fails
- No retry mechanism

---

## Comparison with Planning New Page

| Feature | Planning New | Execution New |
|---------|-------------|---------------|
| Page Header | ✅ Yes | ❌ No |
| Back Button | ✅ Yes | ❌ No |
| Title/Description | ✅ Yes | ❌ No |
| Loading Skeleton | ✅ Yes | ❌ No |
| Error Handling | ✅ Yes | ❌ No |
| Container Styling | ✅ Professional | ❌ Basic |
| Auto-load Existing | ❌ No | ✅ Yes |
| Temp Save | ❌ No | ✅ Yes |

---

## Recommended Improvements

### 1. **Add Page Header**
```tsx
<div className="min-h-screen bg-gray-50">
  <div className="container mx-auto p-4 md:p-8 max-w-7xl">
    {/* Page Header */}
    <div className="mb-6">
      <Button onClick={() => router.push('/dashboard/execution')}>
        <ArrowLeft /> Back to Execution List
      </Button>
      <h1>Create New Execution</h1>
      <p>Fill in execution activities and data</p>
    </div>
    
    <EnhancedExecutionFormAutoLoad {...props} />
  </div>
</div>
```

### 2. **Add Loading State**
```tsx
{isCheckingExisting && (
  <div>
    <Skeleton />
    <p>Checking for existing execution...</p>
  </div>
)}
```

### 3. **Add Error Handling**
```tsx
{checkError && (
  <Alert variant="destructive">
    <AlertCircle />
    <AlertTitle>Error</AlertTitle>
    <AlertDescription>
      Failed to check for existing execution
      <Button onClick={recheckExisting}>Retry</Button>
    </AlertDescription>
  </Alert>
)}
```

### 4. **Add Info Message**
```tsx
{existingExecution?.exists && (
  <Alert>
    <Info />
    <AlertTitle>Existing Execution Found</AlertTitle>
    <AlertDescription>
      Loading existing execution data for this facility and period
    </AlertDescription>
  </Alert>
)}
```

---

## Smart Submission Logic - The Key Feature! 🎯

### **Two Purposes, One Page:**

Yes, you're absolutely correct! The execution new page serves **two main purposes**:

#### **Purpose 1: Create New Execution (Q1)**
When no execution exists for the facility/project/period combination:
- Creates a **new execution record**
- Uses `useCreateExecution` mutation
- Saves all quarterly data (Q1-Q4)

#### **Purpose 2: Update Existing Execution (Q2-Q4)**
When an execution already exists:
- **Updates the existing record** instead of creating a duplicate
- Uses `useUpdateExecution` mutation
- **Merges quarterly data** intelligently:
  - Preserves existing quarter data
  - Only updates the current quarter being submitted
  - Keeps all other quarters intact

### **The Smart Submission Flow:**

```tsx
// From use-smart-execution-submission.ts

1. Check if execution exists
   ↓
2a. IF EXISTS (Q2-Q4 scenario):
   - Get existing execution by ID
   - Load existing activities
   - Merge new quarter data with existing quarters
   - UPDATE via useUpdateExecution
   - Toast: "The quarterly data has been merged with the existing execution record."
   
2b. IF NOT EXISTS (Q1 scenario):
   - CREATE new execution via useCreateExecution
   - Save all quarterly data
   - Toast: "A new execution record has been created for this combination."
```

### **Quarterly Data Merging Logic:**

```tsx
// Only update the current quarter, preserve others
const currentQuarter = params.formData.quarter.toLowerCase();

if (currentQuarter === 'q1') {
  mergedActivity.q1 = newActivity.q1;  // Update Q1 only
} else if (currentQuarter === 'q2') {
  mergedActivity.q2 = newActivity.q2;  // Update Q2 only
} else if (currentQuarter === 'q3') {
  mergedActivity.q3 = newActivity.q3;  // Update Q3 only
} else if (currentQuarter === 'q4') {
  mergedActivity.q4 = newActivity.q4;  // Update Q4 only
}

// Preserve all other quarters from existing data
```

### **Why This Is Brilliant:**

1. **No Duplicates**: One execution record per facility/project/period
2. **Incremental Updates**: Add Q2, Q3, Q4 data without losing Q1
3. **Flexible Workflow**: Users can enter quarters in any order
4. **Data Integrity**: Existing quarters are never overwritten
5. **Single Entry Point**: Same page for create and update

### **Example Workflow:**

```
Month 1 (Q1):
- User creates execution for Q1
- System: CREATE new record
- Record has: Q1=data, Q2=0, Q3=0, Q4=0

Month 4 (Q2):
- User enters Q2 data
- System: CHECKS → finds existing record
- System: UPDATE existing record
- Record has: Q1=data, Q2=data, Q3=0, Q4=0

Month 7 (Q3):
- User enters Q3 data
- System: CHECKS → finds existing record
- System: UPDATE existing record
- Record has: Q1=data, Q2=data, Q3=data, Q4=0

Month 10 (Q4):
- User enters Q4 data
- System: CHECKS → finds existing record
- System: UPDATE existing record
- Record has: Q1=data, Q2=data, Q3=data, Q4=data ✅
```

---

## Summary

The execution new page is a **smart, server-rendered component** that:

✅ **Validates and normalizes** URL parameters
✅ **Checks for existing** executions automatically
✅ **Auto-loads data** if execution exists
✅ **Intelligently merges** quarterly data (Q1-Q4)
✅ **Uses CREATE for Q1**, UPDATE for Q2-Q4
✅ **Prevents duplicates** with smart detection
✅ **Saves temporarily** to prevent data loss
✅ **Handles flexible** parameter formats

But it needs:
❌ **Page header** with back button
❌ **Loading states** for better UX
❌ **Error handling** for robustness
❌ **Professional styling** for consistency

**The core functionality is brilliant** - it's a unified interface for both creating new executions and updating existing ones with quarterly data. The UI/UX just needs improvement to match the planning module's standards.
