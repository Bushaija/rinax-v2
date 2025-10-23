# Compiled Report Architecture

## Component Hierarchy

```
AggregatedReportPage (page.tsx)
├── ReportHeader
│   ├── Project Title
│   ├── Metadata (Reporting Period, Facility Count)
│   └── Export Buttons
│       ├── Export PDF Button
│       └── Export DOCX Button
└── FilterTabs
    └── TabContent (for each project type)
        ├── Loading State (ReportSkeleton)
        ├── Error State
        ├── Empty State
        └── CompiledReport
            ├── Table Header
            │   ├── Activity Column (sticky left)
            │   ├── Facility Columns (scrollable)
            │   └── Total Column (sticky right)
            └── Table Body
                └── ActivityRows (recursive)
                    ├── Section Rows (A-G)
                    ├── Subcategory Rows (B-01 to B-05)
                    └── Activity Rows (individual items)
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    AggregatedReportPage                      │
│                                                              │
│  State: selectedTab ('HIV' | 'Malaria' | 'TB')              │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ├─────────────────────────────────────┐
                        │                                     │
                        ▼                                     ▼
        ┌───────────────────────────┐         ┌──────────────────────────┐
        │ useGetCompiledExecution   │         │ useExportCompiledExecution│
        │                           │         │                          │
        │ Query: { projectType }    │         │ Mutation: { query, file }│
        └───────────┬───────────────┘         └────────────┬─────────────┘
                    │                                      │
                    ▼                                      ▼
        ┌───────────────────────────┐         ┌──────────────────────────┐
        │ GET /api/execution/       │         │ GET /api/execution/      │
        │     compiled              │         │     compiled/export      │
        └───────────┬───────────────┘         └────────────┬─────────────┘
                    │                                      │
                    ▼                                      ▼
        ┌───────────────────────────┐         ┌──────────────────────────┐
        │ Response:                 │         │ Response:                │
        │ {                         │         │ Binary file (PDF/DOCX)   │
        │   data: {                 │         │ + Content-Disposition    │
        │     facilities: [...],    │         │   header                 │
        │     activities: [...],    │         └──────────────────────────┘
        │     sections: [...],      │
        │     totals: {...}         │
        │   },                      │
        │   meta: {...}             │
        │ }                         │
        └───────────┬───────────────┘
                    │
                    ▼
        ┌───────────────────────────┐
        │ CompiledReport Component  │
        │                           │
        │ Props: { compiledData }   │
        └───────────────────────────┘
```

## Hook Dependencies

### useGetCompiledExecution
```typescript
// Location: apps/client/hooks/queries/executions/use-get-compiled-execution.ts

Dependencies:
├── @tanstack/react-query (useQuery)
├── getCompiledExecution fetcher
└── Query Key: ["execution", "compiled", ...filters]

Returns:
├── data: GetCompiledExecutionResponse
├── isLoading: boolean
├── error: Error | null
└── Other React Query states
```

### useExportCompiledExecution
```typescript
// Location: apps/client/hooks/mutations/executions/use-export-compiled-execution.ts

Dependencies:
├── @tanstack/react-query (useMutation)
└── exportCompiledExecution fetcher

Returns:
├── mutate: (options, callbacks) => void
├── isPending: boolean
├── error: Error | null
└── Other React Query mutation states
```

## Fetcher Functions

### getCompiledExecution
```typescript
// Location: apps/client/fetchers/execution/get-compiled-execution.ts

Input: GetCompiledExecutionRequest
├── projectType?: 'HIV' | 'Malaria' | 'TB'
├── facilityType?: 'hospital' | 'health_center'
├── reportingPeriodId?: number
├── year?: number
├── quarter?: 'Q1' | 'Q2' | 'Q3' | 'Q4'
└── districtId?: number

Output: GetCompiledExecutionResponse
└── { data, meta }
```

### exportCompiledExecution
```typescript
// Location: apps/client/fetchers/execution/export-compiled-execution.ts

Input: ExportCompiledExecutionOptions
├── query: (same as getCompiledExecution + format)
│   ├── projectType: 'HIV' | 'Malaria' | 'TB'
│   ├── format: 'pdf' | 'docx'
│   └── filename?: string
└── filename?: string (for download)

Output: { success: boolean, filename: string }
Side Effect: Triggers browser download
```

## State Management

### Page Level State
```typescript
// In AggregatedReportPage component

Local State:
├── selectedTab: string ('HIV' | 'Malaria' | 'TB')
└── (managed by FilterTabs component)

React Query Cache:
├── ["execution", "compiled", "HIV", null, null, ...]
├── ["execution", "compiled", "Malaria", null, null, ...]
└── ["execution", "compiled", "TB", null, null, ...]
```

### Component Props Flow
```
AggregatedReportPage
├── selectedTab → ReportHeader (for display)
├── selectedTab → useGetCompiledExecution (for data)
├── selectedTab → TabContent (for rendering)
└── selectedTab → export handlers (for filename)

ReportHeader
├── project: string (display name)
├── reportingPeriod?: string (from API meta)
├── facilityCount?: number (from API meta)
├── onExportPDF: () => void (handler)
├── onExportDOCX: () => void (handler)
└── isExporting: boolean (loading state)

TabContent
└── projectType: string → useGetCompiledExecution

CompiledReport
└── compiledData: CompiledData (from API response)
```

## API Response Structure

### Compiled Execution Response
```typescript
{
  data: {
    facilities: [
      {
        id: number,
        name: string,
        facilityType: 'hospital' | 'health_center',
        projectType: 'HIV' | 'Malaria' | 'TB',
        hasData: boolean
      }
    ],
    activities: [
      {
        code: string,              // e.g., "A", "B-01", "MAL_EXEC_..."
        name: string,              // e.g., "Receipts", "Human Resources"
        category: string,          // e.g., "A", "B", "C"
        subcategory?: string,      // e.g., "B-01", "B-02"
        displayOrder: number,      // For sorting
        isSection: boolean,        // true for A, B, C, D, E, F, G
        isSubcategory: boolean,    // true for B-01, B-02, etc.
        isComputed: boolean,       // true for C, F, G-3
        computationFormula?: string, // e.g., "A - B"
        values: {                  // facilityId -> value mapping
          "17": 8,
          "18": 12
        },
        total: number,             // Sum across all facilities
        level: number,             // 0=section, 1=subcategory, 2=activity
        items?: ActivityRow[]      // Nested children
      }
    ],
    sections: [
      {
        code: string,
        name: string,
        total: number,
        isComputed: boolean,
        computationFormula?: string
      }
    ],
    totals: {
      byFacility: {
        "17": 44,
        "18": 56
      },
      grandTotal: 100
    }
  },
  meta: {
    filters: {
      projectType: 'Malaria'
    },
    aggregationDate: '2025-10-05T15:41:57.078Z',
    facilityCount: 2,
    reportingPeriod: 'All periods'
  }
}
```

## Styling System

### Tailwind Classes by Component Type

**Section Rows (A-G):**
- Background: `bg-blue-50`
- Font: `font-bold`
- Level: 0

**Subcategory Rows (B-01 to B-05):**
- Background: `bg-gray-100`
- Font: `font-semibold`
- Level: 1

**Activity Rows:**
- Background: `bg-white`
- Font: `normal`
- Level: 2

**Sticky Columns:**
- Activity column: `sticky left-0 z-10`
- Total column: `sticky right-0 z-10`

**Indentation:**
- Calculated: `paddingLeft: ${(level + 1) * 1.5}rem`
- Level 0: 1.5rem
- Level 1: 3.0rem
- Level 2: 4.5rem

## Performance Considerations

### Optimization Strategies

1. **Single API Call**: One request per project type (not N+1)
2. **React Query Caching**: Cached responses for each project type
3. **Memoization**: Not needed - data is already aggregated
4. **Lazy Loading**: Tabs load content on demand
5. **Sticky Positioning**: CSS-based, no JS calculations

### Bundle Size

**Dependencies Added:**
- `lucide-react` (icons) - ~50KB
- React Query hooks - minimal overhead
- No additional heavy dependencies

### Network Requests

**Per Page Load:**
- 1 request for initial project type
- 1 request per tab switch (cached after first load)
- 1 request per export action

**Caching:**
- React Query default: 5 minutes stale time
- Background refetch on window focus
- Automatic retry on failure

## Error Boundaries

### Error Handling Layers

1. **Network Level**: Fetcher catches and throws errors
2. **Hook Level**: React Query manages error state
3. **Component Level**: Error UI for user feedback
4. **Toast Level**: User notifications for actions

### Error States

```typescript
// In TabContent component
if (isLoading) return <ReportSkeleton />
if (error) return <ErrorMessage error={error} />
if (!data?.data) return <EmptyState />
return <CompiledReport compiledData={data.data} />
```

## Testing Strategy

### Unit Tests
- [ ] Test export filename generation
- [ ] Test project type mapping
- [ ] Test error handling in fetchers
- [ ] Test toast notifications

### Integration Tests
- [ ] Test tab switching
- [ ] Test export button clicks
- [ ] Test data loading states
- [ ] Test error states

### E2E Tests
- [ ] Test full export flow (PDF)
- [ ] Test full export flow (DOCX)
- [ ] Test tab navigation
- [ ] Test with different project types
- [ ] Test with no data scenarios

## Future Architecture Improvements

1. **Filter Panel**: Add dedicated filter component
2. **Export Options Modal**: More export customization
3. **Comparison View**: Side-by-side project comparison
4. **Data Visualization**: Charts and graphs
5. **Real-time Updates**: WebSocket for live data
6. **Offline Support**: Service worker for offline access
7. **Print Optimization**: CSS print styles
8. **Accessibility**: ARIA labels and keyboard navigation
