# Comprehensive Data Table System Architecture

## Project Structure

```
src/
├── components/
│   ├── ui/                           # shadcn/ui base components
│   │   ├── table.tsx
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── dialog.tsx
│   │   ├── alert-dialog.tsx
│   │   ├── badge.tsx
│   │   ├── card.tsx
│   │   ├── select.tsx
│   │   └── ...
│   │
│   ├── data-table/                   # Core table components
│   │   ├── data-table.tsx           # Main table component
│   │   ├── data-table-toolbar.tsx   # Search, filters, actions
│   │   ├── data-table-pagination.tsx # Pagination controls
│   │   ├── data-table-column-header.tsx # Sortable column headers
│   │   ├── data-table-row-actions.tsx # Row action dropdown
│   │   ├── data-table-view-options.tsx # Column visibility
│   │   └── data-table-faceted-filter.tsx # Advanced filtering
│   │
│   ├── forms/                        # Form components
│   │   ├── base-form.tsx            # Reusable form wrapper
│   │   ├── dynamic-form-field.tsx   # Field renderer
│   │   └── form-schema-builder.tsx  # Schema-driven forms
│   │
│   ├── dialogs/                      # Modal components
│   │   ├── create-item-dialog.tsx
│   │   ├── edit-item-dialog.tsx
│   │   ├── delete-confirmation-dialog.tsx
│   │   └── bulk-actions-dialog.tsx
│   │
│   ├── notifications/                # Toast system
│   │   ├── toast-provider.tsx
│   │   ├── toast-container.tsx
│   │   └── use-toast.tsx
│   │
│   └── export/                       # Export functionality
│       ├── export-dropdown.tsx
│       ├── csv-exporter.tsx
│       └── pdf-exporter.tsx
│
├── hooks/                            # Custom React hooks
│   ├── use-data-table.tsx           # Main table state management
│   ├── use-table-filters.tsx        # Filter logic
│   ├── use-table-sorting.tsx        # Sorting logic
│   ├── use-table-selection.tsx      # Selection logic
│   ├── use-bulk-actions.tsx         # Bulk operations
│   └── use-table-export.tsx         # Export functionality
│
├── lib/                              # Utilities and configurations
│   ├── table-config.ts              # Default table configurations
│   ├── column-definitions.ts        # Reusable column definitions
│   ├── filtering-utils.ts           # Filter utilities
│   ├── sorting-utils.ts             # Sort utilities
│   ├── export-utils.ts              # Export utilities
│   └── validation-schemas.ts        # Form validation schemas
│
├── types/                            # TypeScript definitions
│   ├── table.ts                     # Table-related types
│   ├── api.ts                       # API response types
│   └── forms.ts                     # Form-related types
│
├── app/                              # Next.js app directory
│   ├── (dashboard)/
│   │   ├── users/
│   │   │   ├── page.tsx             # Users table page
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx         # User detail page
│   │   │   │   └── edit/page.tsx    # User edit page
│   │   │   └── new/page.tsx         # Create user page
│   │   │
│   │   └── products/                # Example: Products table
│   │       ├── page.tsx
│   │       ├── [id]/page.tsx
│   │       └── new/page.tsx
│   │
│   └── api/                          # API routes
│       ├── users/
│       │   ├── route.ts             # GET, POST users
│       │   └── [id]/route.ts        # GET, PUT, DELETE user
│       └── export/
│           ├── csv/route.ts         # CSV export endpoint
│           └── pdf/route.ts         # PDF export endpoint
│
└── config/
    ├── table-columns/               # Column configurations
    │   ├── users-columns.tsx
    │   └── products-columns.tsx
    └── table-schemas/               # Form schemas
        ├── user-schema.ts
        └── product-schema.ts
```

## Core Architecture Concepts

### 1. **Data Table Core (`data-table.tsx`)**

```typescript
// Conceptual structure
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  config?: TableConfig
  onRowClick?: (row: TData) => void
  onRowAction?: (action: string, row: TData) => void
  enableSelection?: boolean
  enableSorting?: boolean
  enableFiltering?: boolean
  enablePagination?: boolean
  enableColumnVisibility?: boolean
  enableExport?: boolean
}

// Uses TanStack Table's useReactTable hook
// Manages all table state (sorting, filtering, pagination, selection)
// Renders table structure with shadcn/ui components
```

### 2. **Custom Hooks Architecture**

#### `use-data-table.tsx`
- Central state management for table functionality
- Integrates all TanStack Table features
- Manages server/client-side data fetching
- Handles optimistic updates

#### `use-table-filters.tsx`
- Advanced filtering logic (text, date ranges, multi-select)
- Filter persistence (URL params, localStorage)
- Custom filter operators (contains, equals, greater than, etc.)

#### `use-table-selection.tsx`
- Row selection management
- Bulk action coordination
- Selection persistence across pages

### 3. **Component Composition Strategy**

#### **Toolbar Component (`data-table-toolbar.tsx`)**
```typescript
interface ToolbarProps {
  table: Table<any>
  globalFilter: string
  onGlobalFilterChange: (value: string) => void
  onCreateNew: () => void
  onExport: (type: 'csv' | 'pdf') => void
  enableAdvancedFilters?: boolean
  customActions?: React.ReactNode
}

// Features:
// - Global search input
// - Advanced filter dialog trigger
// - Column visibility dropdown
// - Bulk actions dropdown (when rows selected)
// - Create new button
// - Export options dropdown
// - Custom action slots
```

#### **Column Header Component (`data-table-column-header.tsx`)**
```typescript
interface ColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>
  title: string
  sortable?: boolean
  filterable?: boolean
  className?: string
}

// Features:
// - Sort indicators (asc/desc/none)
// - Click to sort functionality
// - Filter dropdown for specific column
// - Resize handle (if enabled)
```

#### **Row Actions Component (`data-table-row-actions.tsx`)**
```typescript
interface RowActionsProps<TData> {
  row: TData
  actions: TableRowAction[]
  onAction: (action: string, row: TData) => void
}

// Features:
// - Dropdown menu with configurable actions
// - View, Edit, Delete common actions
// - Custom actions based on row data/permissions
// - Confirmation dialogs for destructive actions
```

### 4. **Advanced Features Implementation**

#### **Faceted Filtering**
```typescript
// Multi-value filters for enum-like columns
interface FacetedFilterProps {
  column: Column<any, unknown>
  title: string
  options: FilterOption[]
  selectedValues: string[]
  onSelectionChange: (values: string[]) => void
}

// Uses shadcn/ui Popover + Command components
// Checkbox list with search
// Clear all/Select all options
```

#### **Date Range Filtering**
```typescript
// For date columns
interface DateRangeFilterProps {
  column: Column<any, unknown>
  onRangeChange: (range: { from: Date; to: Date }) => void
}

// Uses shadcn/ui Calendar component
// Preset ranges (Last 7 days, Last month, etc.)
```

#### **Export System**
```typescript
interface ExportConfig {
  csv: {
    enabled: boolean
    filename?: string
    columns?: string[]
  }
  pdf: {
    enabled: boolean
    filename?: string
    template?: 'simple' | 'detailed'
    includeFilters?: boolean
  }
}

// Server-side generation for large datasets
// Client-side for smaller datasets
// Progress indicators for large exports
```

### 5. **Form Integration Strategy**

#### **Dynamic Form Builder**
```typescript
interface FormFieldConfig {
  name: string
  type: 'text' | 'email' | 'select' | 'textarea' | 'date' | 'number'
  label: string
  placeholder?: string
  required?: boolean
  validation?: ZodSchema
  options?: SelectOption[] // for select fields
  dependencies?: FormFieldDependency[] // conditional fields
}

interface ResourceFormProps {
  schema: FormFieldConfig[]
  initialData?: any
  mode: 'create' | 'edit'
  onSubmit: (data: any) => Promise<void>
  onCancel: () => void
}
```

#### **Schema-Driven Development**
```typescript
// Example: User resource configuration
const userTableConfig: TableResourceConfig = {
  columns: [
    {
      id: 'name',
      header: 'Name',
      sortable: true,
      filterable: true,
      searchable: true
    },
    {
      id: 'email',
      header: 'Email',
      sortable: true,
      filterable: true,
      searchable: true
    },
    // ... more columns
  ],
  formSchema: [
    {
      name: 'name',
      type: 'text',
      label: 'Full Name',
      required: true,
      validation: z.string().min(2)
    },
    // ... more fields
  ],
  actions: ['view', 'edit', 'delete'],
  bulkActions: ['delete', 'export'],
  export: {
    csv: { enabled: true },
    pdf: { enabled: true, template: 'detailed' }
  }
}
```

### 6. **State Management & Data Flow**

#### **Server State Management**
```typescript
// Using TanStack Query for server state
interface TableQueryParams {
  page: number
  pageSize: number
  sorting: SortingState
  filters: ColumnFiltersState
  globalFilter: string
}

// Server-side pagination, sorting, filtering
// Optimistic updates for mutations
// Real-time updates via WebSocket/SSE
```

#### **URL State Synchronization**
```typescript
// Persist table state in URL for shareability
// ?page=2&sort=name:desc&filter=status:active&search=john

interface TableURLState {
  page?: number
  pageSize?: number
  sort?: string
  filter?: Record<string, string>
  search?: string
}
```

### 7. **Customization & Extensibility**

#### **Theme Integration**
```typescript
// Custom table themes
interface TableTheme {
  colors: {
    primary: string
    secondary: string
    muted: string
  }
  spacing: {
    compact: boolean
    rowHeight: 'sm' | 'md' | 'lg'
  }
  borders: 'none' | 'rows' | 'all'
}
```

#### **Plugin System**
```typescript
interface TablePlugin {
  name: string
  install: (table: TableInstance) => void
  toolbar?: React.ComponentType<any>
  columnExtensions?: Record<string, any>
}

// Example plugins:
// - Row expansion plugin
// - Drag and drop reordering
// - Inline editing
// - Advanced search builder
```

### 8. **Performance Considerations**

#### **Virtualization**
- Implement `@tanstack/react-virtual` for large datasets
- Row virtualization for 10,000+ rows
- Column virtualization for wide tables

#### **Memoization Strategy**
- Column definitions memoization
- Filter/sort function memoization
- Row rendering optimization

#### **Progressive Loading**
- Skeleton loading states
- Progressive enhancement
- Background data refresh

### 9. **Accessibility & UX**

#### **Keyboard Navigation**
- Arrow key navigation between cells
- Tab order management
- Keyboard shortcuts for common actions

#### **Screen Reader Support**
- Proper ARIA labels
- Table structure announcements
- Loading state announcements

#### **Mobile Responsiveness**
- Collapsible columns on mobile
- Touch-friendly controls
- Horizontal scroll with sticky columns

## Implementation Phases

### Phase 1: Core Table
1. Basic table with TanStack Table
2. Column definitions and rendering
3. Sorting and pagination
4. Basic search

### Phase 2: Advanced Features
1. Advanced filtering system
2. Column visibility controls
3. Row selection and bulk actions
4. Export functionality

### Phase 3: Forms & CRUD
1. Create/Edit forms integration
2. Detail view pages
3. Delete confirmations
4. Validation and error handling

### Phase 4: Enhanced UX
1. Toast notification system
2. Loading states and skeletons
3. Optimistic updates
4. Real-time synchronization

### Phase 5: Customization
1. Theming system
2. Plugin architecture
3. Configuration-driven tables
4. Performance optimizations

This architecture provides a solid foundation for building a comprehensive, reusable data table system that can adapt to various resource types while maintaining consistency and excellent user experience.