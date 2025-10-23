# Design Document: User Management Facility Selection

## Overview

This design implements a user-friendly facility selection interface for user registration and updates. Instead of requiring administrators to manually enter numeric facility IDs, the system will provide a searchable dropdown selector that displays facility names with district context. The implementation leverages existing facility API endpoints and UI component patterns while maintaining backward compatibility with the current database schema.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              User Management UI Layer                        │
│  (UpdateUserSheet, CreateUserSheet)                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              UserForm Component                              │
│  - Facility Selector (replaces numeric input)                │
│  - Other user fields (name, email, role, etc.)              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         FacilitySelector Component (New)                     │
│  - Searchable dropdown with facility names                   │
│  - District context display                                  │
│  - Facility type badges                                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         React Query Hook (New)                               │
│  useGetAllFacilities()                                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              API Fetcher (New)                               │
│  getAllFacilities()                                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         Server API Endpoint (New)                            │
│  GET /api/facilities/all                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Database Layer                                  │
│  facilities + districts tables (JOIN)                        │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
1. Admin opens user registration/update form
   ↓
2. UserForm renders with FacilitySelector
   ↓
3. FacilitySelector triggers useGetAllFacilities() hook
   ↓
4. Hook calls getAllFacilities() fetcher
   ↓
5. Fetcher makes GET request to /api/facilities/all
   ↓
6. Server joins facilities + districts tables
   ↓
7. Server returns enriched facility list with district names
   ↓
8. FacilitySelector displays facilities in dropdown
   ↓
9. Admin searches/selects facility by name
   ↓
10. Selected facility's ID is stored in form state
   ↓
11. Form submission sends facilityId (number) to API
   ↓
12. User record is created/updated with facilityId
```

## Components and Interfaces

### 1. FacilitySelector Component

**Location:** `apps/client/components/facility-selector.tsx` (new file)

**Purpose:** Reusable facility selection component with search, district context, and facility type indication.

**Interface:**

```typescript
interface FacilitySelectorProps {
  value?: number; // Selected facility ID
  onChange: (facilityId: number) => void;
  disabled?: boolean;
  error?: string;
}

interface FacilityOption {
  id: number;
  name: string;
  districtName: string;
  facilityType: "hospital" | "health_center";
}
```

**Implementation Details:**

- Uses shadcn/ui `Combobox` or `Select` component as base
- Displays facility name as primary text
- Shows district name as secondary text (muted)
- Displays facility type badge (Hospital/Health Center)
- Implements client-side search filtering
- Handles loading and error states
- Supports keyboard navigation (arrow keys, Enter, Escape)
- Accessible with proper ARIA labels

**Visual Structure:**

```
┌─────────────────────────────────────────────┐
│ Select Facility                        ▼    │
├─────────────────────────────────────────────┤
│ 🔍 Search facilities...                     │
├─────────────────────────────────────────────┤
│ Butaro District Hospital          [🏥]      │
│ District: Burera                            │
├─────────────────────────────────────────────┤
│ Kivuye Health Center              [🏥]      │
│ District: Burera                            │
├─────────────────────────────────────────────┤
│ Rusasa Health Center              [🏥]      │
│ District: Burera                            │
└─────────────────────────────────────────────┘
```

### 2. Updated UserForm Component

**Location:** `apps/client/app/dashboard/admin/users/_components/user-form.tsx` (modify existing)

**Changes:**

- Replace numeric `facilityId` input field with `FacilitySelector` component
- Update form field to use the new selector
- Maintain same form validation logic
- Keep all other fields unchanged

**Before:**

```typescript
<FormField
  control={form.control}
  name={"facilityId" as FieldPath<T>}
  render={({ field }) => (
    <FormItem>
      <FormLabel>Facility ID</FormLabel>
      <FormControl>
        <Input
          type="number"
          placeholder="Enter facility ID"
          {...field}
          onChange={(e) => field.onChange(parseInt(e.target.value))}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

**After:**

```typescript
<FormField
  control={form.control}
  name={"facilityId" as FieldPath<T>}
  render={({ field }) => (
    <FormItem>
      <FormLabel>Facility</FormLabel>
      <FormControl>
        <FacilitySelector
          value={field.value}
          onChange={field.onChange}
          error={form.formState.errors.facilityId?.message}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

### 3. React Query Hook

**Location:** `apps/client/hooks/queries/facilities/use-get-all-facilities.ts` (new file)

**Purpose:** Fetch and cache all facilities with district information for user management.

**Interface:**

```typescript
interface FacilityWithDistrict {
  id: number;
  name: string;
  facilityType: "hospital" | "health_center";
  districtId: number;
  districtName: string;
}

interface UseGetAllFacilitiesResult {
  data: FacilityWithDistrict[] | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useGetAllFacilities(): UseGetAllFacilitiesResult
```

**Implementation:**

```typescript
import { useQuery } from "@tanstack/react-query";
import { getAllFacilities } from "@/fetchers/facilities/get-all-facilities";

export function useGetAllFacilities() {
  return useQuery({
    queryKey: ["facilities", "all"],
    queryFn: getAllFacilities,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
}
```

### 4. API Fetcher

**Location:** `apps/client/fetchers/facilities/get-all-facilities.ts` (new file)

**Purpose:** Client-side function to fetch facilities from the API.

**Interface:**

```typescript
export async function getAllFacilities(): Promise<FacilityWithDistrict[]>
```

**Implementation:**

```typescript
import { apiClient } from "@/lib/api-client";

export async function getAllFacilities() {
  const response = await apiClient.get("/api/facilities/all");
  return response.data;
}
```

### 5. Server API Endpoint

**Location:** `apps/server/src/api/routes/facilities/facilities.routes.ts` (add new route)

**Route Definition:**

```typescript
export const getAllRoute = createRoute({
  method: "get",
  path: "/all",
  tags: ["facilities"],
  summary: "Get all facilities with district information",
  responses: {
    [HttpStatusCodes.OK]: {
      content: {
        "application/json": {
          schema: z.array(
            z.object({
              id: z.number(),
              name: z.string(),
              facilityType: z.enum(["hospital", "health_center"]),
              districtId: z.number(),
              districtName: z.string(),
            })
          ),
        },
      },
      description: "List of all facilities with district names",
    },
  },
});

export type GetAllRoute = typeof getAllRoute;
```

**Location:** `apps/server/src/api/routes/facilities/facilities.handlers.ts` (add new handler)

**Handler Implementation:**

```typescript
export const getAll: AppRouteHandler<GetAllRoute> = async (c) => {
  const data = await db
    .select({
      id: facilities.id,
      name: facilities.name,
      facilityType: facilities.facilityType,
      districtId: facilities.districtId,
      districtName: districts.name,
    })
    .from(facilities)
    .innerJoin(districts, eq(facilities.districtId, districts.id))
    .orderBy(asc(districts.name), asc(facilities.name));

  return c.json(data, HttpStatusCodes.OK);
};
```

## Data Models

### Existing Database Schema (No Changes)

```typescript
// facilities table (unchanged)
export const facilities = pgTable("facilities", {
  id: serial().primaryKey().notNull(),
  name: text().notNull(),
  facilityType: facilityType("facility_type").notNull(),
  districtId: integer("district_id").notNull(),
});

// users table (unchanged)
export const users = pgTable("users", {
  id: serial().primaryKey().notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  // ... other fields
  facilityId: integer("facility_id"),
  // ... other fields
});
```

### API Response Types

**GET /api/facilities/all Response:**

```typescript
[
  {
    "id": 1,
    "name": "Butaro District Hospital",
    "facilityType": "hospital",
    "districtId": 11,
    "districtName": "Burera"
  },
  {
    "id": 2,
    "name": "Kivuye Health Center",
    "facilityType": "health_center",
    "districtId": 11,
    "districtName": "Burera"
  }
  // ... more facilities
]
```

## UI/UX Design

### FacilitySelector Component States

**1. Default State (Closed):**
```
┌─────────────────────────────────────────────┐
│ Select Facility                        ▼    │
└─────────────────────────────────────────────┘
```

**2. Loading State:**
```
┌─────────────────────────────────────────────┐
│ Loading facilities...              ⟳        │
└─────────────────────────────────────────────┘
```

**3. Error State:**
```
┌─────────────────────────────────────────────┐
│ Failed to load facilities          ⚠        │
│ [Retry]                                     │
└─────────────────────────────────────────────┘
```

**4. Selected State:**
```
┌─────────────────────────────────────────────┐
│ Butaro District Hospital (Burera)      ▼    │
└─────────────────────────────────────────────┘
```

**5. Open with Search:**
```
┌─────────────────────────────────────────────┐
│ 🔍 Search facilities...                     │
├─────────────────────────────────────────────┤
│ [🏥] Butaro District Hospital               │
│      District: Burera                       │
├─────────────────────────────────────────────┤
│ [🏥] Kivuye Health Center                   │
│      District: Burera                       │
├─────────────────────────────────────────────┤
│ [🏥] Rusasa Health Center                   │
│      District: Burera                       │
└─────────────────────────────────────────────┘
```

**6. Filtered Results:**
```
┌─────────────────────────────────────────────┐
│ 🔍 butaro                                   │
├─────────────────────────────────────────────┤
│ [🏥] Butaro District Hospital               │
│      District: Burera                       │
└─────────────────────────────────────────────┘
```

**7. No Results:**
```
┌─────────────────────────────────────────────┐
│ 🔍 xyz                                      │
├─────────────────────────────────────────────┤
│ No facilities found                         │
└─────────────────────────────────────────────┘
```

### Visual Indicators

**Facility Type Badges:**
- Hospital: `[🏥 Hospital]` - Blue badge
- Health Center: `[🏥 HC]` - Green badge

**District Context:**
- Displayed as secondary text in muted color
- Format: "District: {districtName}"

## Error Handling

### Client-Side Errors

| Scenario | Handling | User Feedback |
|----------|----------|---------------|
| API fetch fails | Display error state in selector | "Failed to load facilities. Please try again." with Retry button |
| Network timeout | Retry with exponential backoff | Loading indicator with timeout message |
| Empty facility list | Display empty state | "No facilities available" |
| Invalid facility ID on load | Show warning, allow reselection | "Invalid facility. Please select a valid facility." |
| Form validation fails | Display validation error | "Facility is required" below selector |

### Server-Side Errors

| Scenario | Status Code | Response | Handling |
|----------|-------------|----------|----------|
| Unauthorized request | 401 | `{ message: "Authentication required" }` | Redirect to login |
| Database connection error | 500 | `{ message: "Internal server error" }` | Display generic error |
| No facilities found | 200 | `[]` | Display empty state |

## Testing Strategy

### Unit Tests

**File:** `apps/client/components/__tests__/facility-selector.test.tsx`

Test cases:
- Renders with loading state initially
- Displays facilities after successful fetch
- Filters facilities based on search input
- Handles facility selection correctly
- Shows error state when fetch fails
- Displays "No facilities found" for empty results
- Supports keyboard navigation (arrow keys, Enter, Escape)
- Calls onChange with correct facility ID
- Displays district context for each facility
- Shows facility type badges correctly

**File:** `apps/client/hooks/queries/facilities/__tests__/use-get-all-facilities.test.ts`

Test cases:
- Fetches facilities on mount
- Caches results for 5 minutes
- Refetches on manual refetch call
- Handles API errors gracefully
- Returns correct data structure

### Integration Tests

**File:** `apps/server/src/api/routes/facilities/__tests__/facilities.handlers.test.ts`

Test cases:
- GET /api/facilities/all returns all facilities with districts
- Facilities are ordered by district name then facility name
- Response includes all required fields (id, name, facilityType, districtId, districtName)
- Returns 401 for unauthenticated requests
- Handles database errors gracefully

**File:** `apps/client/app/dashboard/admin/users/__tests__/user-form.test.tsx`

Test cases:
- UserForm renders FacilitySelector instead of numeric input
- Form validation requires facility selection
- Selected facility ID is included in form submission
- Facility selector displays current facility on edit
- Form handles facility change correctly

### Manual Testing Scenarios

1. **User Registration Flow:**
   - Open user registration form
   - Verify facility selector loads facilities
   - Search for "Butaro" → verify filtering works
   - Select "Butaro District Hospital"
   - Verify district context is displayed
   - Submit form → verify user is created with correct facilityId

2. **User Update Flow:**
   - Open user update form for existing user
   - Verify current facility is displayed by name (not ID)
   - Change facility to different one
   - Submit form → verify facilityId is updated in database

3. **Error Handling:**
   - Simulate API failure → verify error state and retry button
   - Submit form without selecting facility → verify validation error
   - Select facility with invalid ID → verify warning message

4. **Accessibility:**
   - Navigate form using only keyboard (Tab, Arrow keys, Enter)
   - Use screen reader → verify announcements are clear
   - Verify focus indicators are visible

## Performance Considerations

### Caching Strategy

1. **React Query Cache:**
   - Stale time: 5 minutes (facilities don't change frequently)
   - Cache time: 10 minutes (keep in memory for quick access)
   - Automatic background refetch on window focus

2. **API Response:**
   - Single query with JOIN (efficient)
   - No pagination needed (facility list is manageable size)
   - Ordered by district and name for consistent display

### Optimization Techniques

1. **Client-Side Filtering:**
   - Filter facilities in memory (no API calls on search)
   - Debounce search input (300ms) to reduce re-renders
   - Use `useMemo` for filtered results

2. **Component Rendering:**
   - Virtualize facility list if count exceeds 100 (using `react-window`)
   - Memoize facility option components
   - Lazy load district names only when dropdown opens

## Security Considerations

1. **Authorization:**
   - Only admin users can access user management endpoints
   - Validate user role on server before returning facility list
   - Ensure facility IDs in form submissions are valid

2. **Data Validation:**
   - Validate facilityId exists in database before creating/updating user
   - Sanitize search input to prevent XSS
   - Use Zod schema validation on both client and server

3. **Error Messages:**
   - Don't expose internal database errors to client
   - Use generic error messages for security-sensitive failures
   - Log detailed errors server-side for debugging

## Migration Path

### Phase 1: Add New API Endpoint (Non-Breaking)
- Create GET /api/facilities/all endpoint
- Add handler with district JOIN
- Test endpoint independently
- No changes to existing user management yet

### Phase 2: Create FacilitySelector Component
- Build FacilitySelector component
- Create React Query hook and fetcher
- Test component in isolation (Storybook)
- No integration with UserForm yet

### Phase 3: Integrate with UserForm
- Replace numeric input with FacilitySelector in UserForm
- Update UpdateUserSheet to display facility name
- Test user registration and update flows
- Deploy to staging for testing

### Phase 4: Production Deployment
- Deploy to production
- Monitor for errors and performance issues
- Gather user feedback
- Iterate on UX improvements

## Backward Compatibility

- Database schema remains unchanged (facilityId is still integer)
- Existing API consumers continue to work (no breaking changes)
- User records maintain same data structure
- Only UI layer changes (transparent to backend)
- Existing users with facilityId will see facility name automatically

## Accessibility Compliance

### WCAG 2.1 Level AA Requirements

1. **Keyboard Navigation:**
   - All interactive elements accessible via keyboard
   - Logical tab order through form fields
   - Arrow keys for navigating facility list
   - Enter to select, Escape to close

2. **Screen Reader Support:**
   - Proper ARIA labels for all form fields
   - Announce facility name, district, and type
   - Announce loading and error states
   - Announce search results count

3. **Visual Indicators:**
   - Clear focus indicators (2px outline)
   - Sufficient color contrast (4.5:1 minimum)
   - Visual feedback for selected state
   - Error messages in red with icons

4. **Form Labels:**
   - All form fields have associated labels
   - Error messages linked to fields via aria-describedby
   - Required fields marked with asterisk and aria-required

## Future Enhancements

1. **Multi-Facility Selection:**
   - Allow selecting multiple facilities for users with broader access
   - Useful for program managers overseeing multiple facilities

2. **Facility Grouping:**
   - Group facilities by district in dropdown
   - Collapsible district sections for better organization

3. **Recent Facilities:**
   - Show recently selected facilities at top
   - Improve efficiency for admins managing similar users

4. **Facility Details Preview:**
   - Show additional facility info on hover (address, contact)
   - Help admins verify correct facility selection

5. **Bulk User Import:**
   - CSV import with facility name matching
   - Automatic facility ID resolution from names
