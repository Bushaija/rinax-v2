# Compiled Report Migration Notes

## Overview
The compiled report page has been migrated from using the old `useCompiledReport` hook to the new API-based `useGetCompiledExecution` hook that consumes the `/api/execution/compiled` endpoint.

## Key Changes

### 1. Page Component (`page.tsx`)

**Before:**
- Used `useCompiledReport({ projectCode })` which fetched individual facility data
- Project tabs used lowercase values ('hiv', 'malaria', 'tb')
- Data structure was based on `FinancialRow[]` from execution form schema

**After:**
- Uses `useGetCompiledExecution({ projectType })` which fetches aggregated data
- Project tabs use capitalized values ('HIV', 'Malaria', 'TB') matching API enum
- Data structure matches the compiled execution API response
- Added error handling and empty state handling
- Displays facility count and reporting period from API metadata

### 2. CompiledReport Component

**Before:**
- Accepted `facilities: FacilityData[]` with nested `FinancialRow[]` structure
- Used `generateEmptyFinancialTemplate()` for table structure
- Manually calculated totals across facilities
- Had separate Comments column

**After:**
- Accepts `compiledData: CompiledData` matching API response structure
- Uses dynamic `activities` array from API with hierarchical structure
- Totals are pre-calculated by the backend
- Removed Comments column (not in API response)
- Fully dynamic rendering based on API data structure

### 3. Data Structure Comparison

**Old Structure:**
```typescript
{
  facilityName: string
  data: FinancialRow[] // Nested hierarchy with q1, q2, q3, q4, cumulativeBalance
}
```

**New Structure:**
```typescript
{
  facilities: FacilityColumn[] // Facility metadata
  activities: ActivityRow[] // Hierarchical activity structure
  sections: SectionSummary[] // Section totals
  totals: { byFacility, grandTotal } // Pre-calculated totals
}
```

### 4. Activity Row Structure

The new API provides a rich activity structure:
- `level`: Indicates hierarchy depth (0=section, 1=subcategory, 2=activity)
- `isSection`: Boolean flag for section rows (A, B, C, etc.)
- `isSubcategory`: Boolean flag for subcategory rows (B-01, B-02, etc.)
- `isComputed`: Boolean flag for computed values (C, F, G-3)
- `computationFormula`: Formula for computed values (e.g., "A - B")
- `values`: Object mapping facilityId to value
- `total`: Pre-calculated total across all facilities
- `items`: Nested child activities

### 5. Styling Changes

- Section rows: Blue background (`bg-blue-50`)
- Subcategory rows: Gray background (`bg-gray-100`)
- Regular activity rows: White background
- Computed values show formula in italics
- Facility type displayed under facility name in header

### 6. Features Added

- **Error Handling**: Shows error message if API call fails
- **Empty State**: Shows message if no data available
- **Summary Section**: Displays facility count and grand total
- **Facility Metadata**: Shows facility type in column headers
- **Computed Indicators**: Shows computation formulas for calculated values

### 7. Features Removed

- **Comments Column**: Not provided by the API
- **Quarterly Columns**: API provides aggregated totals, not quarterly breakdown
- **Manual Total Calculation**: Backend handles all calculations

## Migration Benefits

1. **Performance**: Single API call instead of N+1 queries (one per facility)
2. **Consistency**: Backend ensures consistent calculations across all facilities
3. **Scalability**: Backend can handle large numbers of facilities efficiently
4. **Type Safety**: Full TypeScript types from API client
5. **Maintainability**: Single source of truth for data structure

## API Endpoint

```
GET /api/execution/compiled?projectType={HIV|Malaria|TB}
```

Optional query parameters:
- `facilityType`: Filter by facility type
- `reportingPeriodId`: Filter by reporting period
- `year`: Filter by year
- `quarter`: Filter by quarter
- `districtId`: Filter by district (future)

## Testing Checklist

- [ ] Verify all three project types load correctly
- [ ] Check that facility columns display properly
- [ ] Verify section totals match individual activities
- [ ] Test computed values (C, F, G-3) show formulas
- [ ] Verify hierarchical indentation works correctly
- [ ] Test error states (network error, no data)
- [ ] Check responsive behavior with many facilities
- [ ] Verify number formatting is consistent

## Export Functionality

### Implementation
The page now includes export functionality using the `useExportCompiledExecution` hook:

**Features:**
- Export to PDF format
- Export to DOCX format
- Automatic filename generation with project type and date
- Toast notifications for success/error states
- Disabled state during export to prevent multiple requests

**Usage:**
```typescript
const { mutate: exportReport, isPending: isExporting } = useExportCompiledExecution()

exportReport(
  {
    query: {
      projectType: 'HIV',
      format: 'pdf',
      filename: 'hiv-compiled-report-2025-10-05.pdf'
    },
    filename: 'hiv-compiled-report-2025-10-05.pdf'
  },
  {
    onSuccess: () => { /* Show success toast */ },
    onError: (error) => { /* Show error toast */ }
  }
)
```

**Export Button Location:**
- Located in the report header, top-right corner
- Two buttons: "Export PDF" and "Export DOCX"
- Both buttons disabled during export operation
- Icons from lucide-react for visual clarity

## Future Enhancements

1. ✅ ~~Add export functionality using `useExportCompiledExecution` hook~~ (Completed)
2. Add filter controls for facility type, reporting period, etc.
3. Add drill-down capability to view individual facility details
4. Add comparison views (year-over-year, quarter-over-quarter)
5. Add data visualization (charts, graphs)
6. Add email/share functionality for reports
7. Add scheduled report generation
8. Add custom date range selection for exports
