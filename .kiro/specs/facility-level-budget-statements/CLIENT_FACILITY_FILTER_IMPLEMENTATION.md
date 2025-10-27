# Client-Side Facility Filtering Implementation

## Overview
Successfully integrated health facility filtering on the client-side for the Budget vs Actual report page. Users can now select individual facilities or view aggregated data for all facilities at district level.

## Implementation Details

### 1. New Component: FacilitySelectorWithAll
**File**: `apps/client/components/facility-selector-with-all.tsx`

A new facility selector component that extends the existing `FacilitySelector` with an "All Facilities" option.

#### Features:
- **"All Facilities" Option**: Default selection showing aggregated data
- **Individual Facility Selection**: Users can select specific facilities
- **Access-Controlled Facility List**: Only shows facilities the user has access to (determined server-side)
- **Aggregation Level Display**: Shows the current aggregation level (District/Province)
- **Visual Indicators**: 
  - Globe icon for "All Facilities"
  - Building/Home icons for individual facilities
  - Color-coded badges for facility types and aggregation levels
- **Search Functionality**: Inherited from base FacilitySelector
- **Responsive Design**: Works on mobile and desktop

#### Props:
```typescript
interface FacilitySelectorWithAllProps {
  value?: number | "all";
  onChange: (facilityId: number | "all") => void;
  disabled?: boolean;
  error?: string;
  aggregationLevel?: "FACILITY" | "DISTRICT" | "PROVINCE";
}
```

#### Visual Design:
- **All Facilities Option**: Purple badge with Globe icon
- **Hospital Facilities**: Blue badge with Building icon
- **Health Centers**: Green badge with Home icon
- **Border separator**: Separates "All" option from individual facilities

### 2. Updated Budget vs Actual Page
**File**: `apps/client/app/dashboard/reports/budget-vs-actual/page.tsx`

#### Changes Made:

1. **State Management**:
   ```typescript
   const [selectedFacilityId, setSelectedFacilityId] = useState<number | "all">("all")
   const [aggregationLevel, setAggregationLevel] = useState<"FACILITY" | "DISTRICT" | "PROVINCE">("DISTRICT")
   ```

2. **Facility Filter UI**:
   - Added a dedicated filter section above the project tabs
   - Gray background (`bg-gray-50`) to distinguish from content
   - Label and helper text for user guidance
   - Responsive max-width container

3. **API Integration**:
   - When "all" is selected:
     - `facilityId` is set to `undefined`
     - `aggregationLevel` is set to "DISTRICT"
     - `includeFacilityBreakdown` is set to `true`
   - When specific facility is selected:
     - `facilityId` is set to the facility ID
     - `aggregationLevel` is set to "FACILITY"
     - `includeFacilityBreakdown` is set to `false`

4. **Dynamic Helper Text**:
   ```typescript
   {selectedFacilityId === "all" 
     ? `Showing aggregated data for all facilities at ${aggregationLevel.toLowerCase()} level`
     : "Showing data for selected facility"}
   ```

### 3. Component Integration Flow

```
BudgetVsActualPage
  ├── FinancialStatementHeader
  ├── Facility Filter Section (NEW)
  │   └── FacilitySelectorWithAll
  │       ├── "All Facilities" option (default)
  │       └── Individual facility options
  └── FilterTabs (Project tabs: HIV, Malaria, TB)
      └── TabContent
          └── BudgetVsActualStatement
```

## User Experience

### Default State
- **Selection**: "All Facilities"
- **Aggregation**: District level
- **Display**: Shows aggregated budget vs actual for all accessible facilities
- **Helper Text**: "Showing aggregated data for all facilities at district level"

### Selecting Individual Facility
1. User clicks on facility selector
2. Dropdown shows "All Facilities" at top (with purple badge)
3. Individual facilities listed below with search capability
4. User selects a facility
5. Report refreshes to show single facility data
6. Helper text updates: "Showing data for selected facility"

### Visual Hierarchy
```
┌─────────────────────────────────────────┐
│ Financial Statement Header              │
├─────────────────────────────────────────┤
│ Health Facility Filter (Gray Section)   │
│ ┌─────────────────────────────────────┐ │
│ │ [🌐 All Facilities]                 │ │
│ │ District level aggregation          │ │
│ └─────────────────────────────────────┘ │
│ Helper text                             │
├─────────────────────────────────────────┤
│ Project Tabs: HIV | Malaria | TB        │
├─────────────────────────────────────────┤
│ Budget vs Actual Statement Content      │
└─────────────────────────────────────────┘
```

## API Request Examples

### All Facilities (Default)
```typescript
{
  statementCode: "BUDGET_VS_ACTUAL",
  reportingPeriodId: 2,
  projectType: "HIV",
  facilityId: undefined,
  aggregationLevel: "DISTRICT",
  includeFacilityBreakdown: true,
  includeComparatives: true,
  customMappings: {}
}
```

### Specific Facility
```typescript
{
  statementCode: "BUDGET_VS_ACTUAL",
  reportingPeriodId: 2,
  projectType: "HIV",
  facilityId: 20,
  aggregationLevel: "FACILITY",
  includeFacilityBreakdown: false,
  includeComparatives: true,
  customMappings: {}
}
```

## Performance Considerations

### Optimized Query Execution
- Single facility queries use optimized `=` operator (from Task 7.1)
- District-wide queries use `IN` clause for multiple facilities
- Performance metrics tracked and logged (from Task 7.2)

### Data Loading
- Statement data resets when facility selection changes
- Loading skeleton shown during data fetch
- Error handling with toast notifications

## Accessibility

### ARIA Labels
- Combobox role for selector button
- Descriptive labels for screen readers
- Expanded state communicated
- Invalid state indicated when errors present

### Keyboard Navigation
- Full keyboard support via Command component
- Tab navigation through options
- Enter/Space to select
- Escape to close dropdown

## Responsive Design

### Mobile (< 640px)
- Full-width selector
- Abbreviated badges (H for Hospital, HC for Health Center)
- Stacked layout for facility info
- Touch-friendly tap targets

### Desktop (≥ 640px)
- Max-width container (max-w-md)
- Full badge labels
- Horizontal layout with icons
- Hover states

## Future Enhancements

### Potential Improvements
1. **Province-Level Aggregation**: Add toggle for province-level view
2. **Facility Breakdown Table**: Show detailed breakdown when "All" is selected
3. **Performance Metrics Display**: Show query execution time in UI
4. **Facility Comparison**: Side-by-side comparison of selected facilities
5. **Export with Breakdown**: Include facility breakdown in PDF/Excel exports
6. **Saved Selections**: Remember user's last facility selection
7. **Quick Filters**: Filter by facility type (Hospital/HC) or district

### Technical Debt
- Hardcoded period ID (periodId = 2) should be replaced with proper period selector
- Consider adding loading state for facility list
- Add error boundary for component failures

## Testing Recommendations

### Manual Testing
1. ✅ Default "All Facilities" selection loads correctly
2. ✅ Switching to individual facility updates report
3. ✅ Switching back to "All" shows aggregated data
4. ✅ Project tab changes work with both selection types
5. ✅ Search functionality works in dropdown
6. ✅ Helper text updates correctly
7. ✅ Loading states display properly
8. ✅ Error states handled gracefully

### Automated Testing
- Component rendering tests
- State management tests
- API integration tests
- Accessibility tests
- Responsive design tests

## Files Modified

### Client-Side
1. **New File**: `apps/client/components/facility-selector-with-all.tsx`
   - New component with "All" option support

2. **Modified**: `apps/client/app/dashboard/reports/budget-vs-actual/page.tsx`
   - Added facility filter UI
   - Updated state management
   - Integrated new selector component
   - Updated API request logic

### Server-Side
3. **Modified**: `apps/server/src/api/routes/facilities/facilities.handlers.ts`
   - Updated `getAll` handler to filter facilities by user access
   - Uses `getUserContext` to get accessible facility IDs
   - Returns only facilities the user has permission to view

## Dependencies

### Existing Components Used
- `@/components/ui/button`
- `@/components/ui/command`
- `@/components/ui/popover`
- `@/components/ui/badge`
- `@/components/ui/label`
- `@/hooks/queries/facilities/use-get-all-facilities`

### Icons
- `lucide-react`: Globe, Building2, Home, ChevronsUpDown, Check, Loader2, AlertCircle

## Security & Access Control

### Server-Side Access Control
The `/facilities/all` endpoint now implements proper access control:

1. **User Context Retrieval**: Gets user's accessible facility IDs from session
2. **Facility Filtering**: Only returns facilities in `userContext.accessibleFacilityIds`
3. **District-Based Access**: District hospital accountants only see facilities in their district
4. **Province-Based Access**: Provincial users see facilities in their province
5. **Facility-Level Access**: Individual facility users only see their own facility

### Access Control Flow
```typescript
// Server-side (facilities.handlers.ts)
const userContext = await getUserContext(c);
const accessibleFacilities = allFacilities.filter(facility => 
    userContext.accessibleFacilityIds.includes(facility.id)
);
```

### Benefits
- **Security**: Users cannot see facilities they don't have access to
- **Performance**: Reduces data transfer by filtering server-side
- **Consistency**: Access control logic centralized on server
- **Scalability**: Works for users with varying access levels

## Backward Compatibility

- Existing API endpoints unchanged (only filtering logic added)
- Optional parameters used for new features
- Graceful fallback to single facility mode
- No breaking changes to existing functionality
- Client-side code remains compatible

## Requirements Coverage

✅ **Client-side facility filtering implemented**
✅ **Default selection set to "All"**
✅ **Overall budget vs actual aggregation working**
✅ **Individual facility selection supported**
✅ **Proper API integration with aggregation levels**
✅ **User-friendly interface with clear indicators**
✅ **Responsive and accessible design**

## Conclusion

The facility filtering feature is now fully integrated on the client-side, providing users with flexible options to view either aggregated district-level data or individual facility reports. The implementation leverages the optimized query performance from Task 7 and provides a seamless user experience with clear visual indicators and helpful guidance text.
