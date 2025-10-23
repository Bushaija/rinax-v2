# Financial Reports Client-Side Structure

## Overview

The financial reports system on the client-side follows a consistent pattern across all statement types. Each report fetches data from the server, transforms it, and displays it in a tabular format with comparative periods.

---

## Report Types

| Report | Statement Code | Route | Component |
|--------|---------------|-------|-----------|
| **Revenue & Expenditure** | `REV_EXP` | `/reports/revenue-expenditure` | `RevenueExpenditureStatement` |
| **Balance Sheet** | `ASSETS_LIAB` | `/reports/balance-sheet` | `BalanceSheetStatement` |
| **Cash Flow** | `CASH_FLOW` | `/reports/cash-flow` | `CashFlowStatement` |
| **Changes in Net Assets** | `NET_ASSETS_CHANGES` | `/reports/net-assets-changes` | `ChangesInNetAssetsStatement` |
| **Budget vs Actual** | `BUDGET_VS_ACTUAL` | `/reports/budget-vs-actual` | `BudgetVsActualStatement` |

---

## Architecture Pattern

### **1. Page Component** (`page.tsx`)

Each report page follows this structure:

```typescript
// apps/client/app/dashboard/reports/[report-type]/page.tsx

"use client";

import { useState, useRef, useEffect } from 'react';
import { FinancialStatementHeader } from '@/components/reports/financial-statement-header';
import { [StatementComponent] } from '@/features/reports/[report-type]';
import { FilterTabs } from '@/components/ui/filter-tabs';
import useGenerateStatement from '@/hooks/mutations/financial-reports/use-generate-statement';
import { transformStatementData } from '../utils/transform-statement-data';

// 1. Define project tabs (HIV, Malaria, TB)
const projectTabs = [
  { value: 'hiv', label: 'HIV', content: null },
  { value: 'malaria', label: 'Malaria', content: null },
  { value: 'tb', label: 'TB', content: null }
];

// 2. Tab content component with loading state
const TabContent = ({ tabValue, periodId }) => {
  const [statementData, setStatementData] = useState(null);
  const { mutate: generateStatement, isPending } = useGenerateStatement();

  useEffect(() => {
    generateStatement({
      statementCode: "CASH_FLOW",  // Statement-specific code
      reportingPeriodId: periodId,
      projectType: projectTypeMapping[tabValue],
      includeComparatives: true,
    }, {
      onSuccess: (data) => setStatementData(data.statement),
    });
  }, [periodId, tabValue]);

  if (isPending || !statementData) return <ReportSkeleton />;

  // 3. Transform API data to component format
  const transformedData = transformStatementData(statementData.lines ?? []);

  // 4. Render statement component
  return <CashFlowStatement initialData={transformedData} {...periodLabels} />;
};

// 5. Main page component
export default function CashFlowPage() {
  const [selectedTab, setSelectedTab] = useState('hiv');
  const periodId = 2; // TODO: Implement period selection

  return (
    <main>
      <FinancialStatementHeader
        statementType="cash-flow"
        selectedProject={selectedTab}
        reportingPeriodId={periodId}
      />
      <FilterTabs
        tabs={tabsWithContent}
        value={selectedTab}
        onValueChange={setSelectedTab}
      />
    </main>
  );
}
```

---

### **2. Statement Component** (`features/reports/[report-type].tsx`)

All statement components share the same structure:

```typescript
// apps/client/features/reports/cash-flow.tsx

"use client";

import { formatCurrency } from '@/features/planning/utils';

// 1. Row type definition
export type CashFlowRow = {
  description: string;
  note: number | null;
  current: number | null;    // Current period value
  previous: number | null;   // Previous period value
  isTotal: boolean;          // Bold, border-top
  isSubtotal: boolean;       // Semi-bold
};

// 2. Props interface
interface Props {
  initialData: CashFlowRow[];
  currentPeriodLabel: string;   // e.g., "FY 2024/2025 (Frw)"
  previousPeriodLabel: string;  // e.g., "FY 2023/2024 (Frw)"
}

// 3. Component
export function CashFlowStatement({ initialData, currentPeriodLabel, previousPeriodLabel }: Props) {
  if (!initialData) return null;

  // 4. Row renderer
  const renderRow = (row: CashFlowRow, idx: number) => {
    const rowClass = `
      ${row.isSubtotal ? 'font-semibold' : ''} 
      ${row.isTotal ? 'font-bold border-t-2' : ''}
    `;
    
    return (
      <tr key={idx} className={rowClass}>
        <td className="px-6 py-2 text-sm text-gray-700">{row.description}</td>
        <td className="px-6 py-2 text-center text-sm">{row.note ?? ''}</td>
        <td className="px-6 py-2 text-right text-sm">
          {row.current !== null ? formatCurrency(row.current) : ''}
        </td>
        <td className="px-6 py-2 text-right text-sm">
          {row.previous !== null ? formatCurrency(row.previous) : ''}
        </td>
      </tr>
    );
  };

  // 5. Table structure
  return (
    <div className="overflow-x-auto rounded-lg border shadow-sm">
      <table className="min-w-full bg-white">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left">Description</th>
            <th className="px-6 py-3 text-center">Note</th>
            <th className="px-6 py-3 text-right">{currentPeriodLabel}</th>
            <th className="px-6 py-3 text-right">{previousPeriodLabel}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {initialData.map(renderRow)}
        </tbody>
      </table>
    </div>
  );
}
```

---

### **3. Data Transformation** (`utils/transform-statement-data.ts`)

Transforms API response to component format:

```typescript
// API Format (from server)
interface StatementLine {
  id: string;
  description: string;
  currentPeriodValue?: number | null;
  previousPeriodValue?: number | null;
  note?: number | null;
  formatting?: {
    bold?: boolean;
    italic?: boolean;
    indentLevel?: number;
    isSection?: boolean;
    isSubtotal?: boolean;
    isTotal?: boolean;
  };
  metadata?: {
    lineCode?: string;
    eventCodes?: number[];
    formula?: string;
    isComputed?: boolean;
    displayOrder?: number;
  };
}

// Component Format (for UI)
interface TransformedRow {
  description: string;
  note: number | null;
  current: number | null;
  previous: number | null;
  variance: number | null;
  performancePercentage: number | null;
  isTotal: boolean;
  isSubtotal: boolean;
}

// Transformation function
export function transformStatementData(lines: StatementLine[]): TransformedRow[] {
  return lines.map(line => ({
    description: line.description,
    note: line.note ?? (line.metadata?.eventCodes?.[0] ?? null),
    current: line.currentPeriodValue ?? null,
    previous: line.previousPeriodValue ?? null,
    variance: null,
    performancePercentage: null,
    isTotal: line.formatting?.isTotal ?? false,
    isSubtotal: line.formatting?.isSubtotal ?? false,
  }));
}
```

---

## Cash Flow Statement Structure

### **Visual Layout**

```
┌─────────────────────────────────────────────────────────────────┐
│ FINANCIAL STATEMENT HEADER                                      │
│ - Organization name                                             │
│ - Statement title                                               │
│ - Period information                                            │
│ - Export buttons (PDF, Excel)                                   │
├─────────────────────────────────────────────────────────────────┤
│ FILTER TABS                                                     │
│ [ HIV ] [ Malaria ] [ TB ]                                      │
├─────────────────────────────────────────────────────────────────┤
│ CASH FLOW STATEMENT TABLE                                       │
│                                                                 │
│ Description                  Note    FY 24/25    FY 23/24      │
│ ─────────────────────────────────────────────────────────────  │
│ CASH FLOWS FROM OPERATING ACTIVITIES                           │
│   Receipts from donors        1     5,000,000   4,500,000     │
│   Payments to suppliers       2    (3,000,000) (2,800,000)    │
│   Payments to employees       3    (1,500,000) (1,400,000)    │
│   ─────────────────────────────────────────────────────────    │
│   Net cash from operations          500,000     300,000       │
│                                                                 │
│ CASH FLOWS FROM INVESTING ACTIVITIES                           │
│   Purchase of equipment       4      (200,000)  (150,000)     │
│   ─────────────────────────────────────────────────────────    │
│   Net cash from investing          (200,000)   (150,000)      │
│                                                                 │
│ CASH FLOWS FROM FINANCING ACTIVITIES                           │
│   Loans received              5       100,000    200,000      │
│   ─────────────────────────────────────────────────────────    │
│   Net cash from financing           100,000     200,000       │
│                                                                 │
│ ═════════════════════════════════════════════════════════════  │
│ NET INCREASE IN CASH                 400,000     350,000      │
│ Cash at beginning of period        1,000,000     650,000      │
│ ═════════════════════════════════════════════════════════════  │
│ CASH AT END OF PERIOD              1,400,000   1,000,000      │
│ ═════════════════════════════════════════════════════════════  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│ 1. USER INTERACTION                                          │
│    - Selects project tab (HIV/Malaria/TB)                   │
│    - Selects reporting period                                │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ↓
┌──────────────────────────────────────────────────────────────┐
│ 2. API REQUEST                                               │
│    useGenerateStatement({                                    │
│      statementCode: "CASH_FLOW",                            │
│      reportingPeriodId: 2,                                   │
│      projectType: "HIV",                                     │
│      includeComparatives: true                               │
│    })                                                        │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ↓
┌──────────────────────────────────────────────────────────────┐
│ 3. SERVER PROCESSING                                         │
│    - Fetches statement template                             │
│    - Retrieves execution data                                │
│    - Calculates line values                                  │
│    - Applies formulas                                        │
│    - Formats response                                        │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ↓
┌──────────────────────────────────────────────────────────────┐
│ 4. API RESPONSE                                              │
│    {                                                         │
│      statement: {                                            │
│        lines: [                                              │
│          {                                                   │
│            id: "1",                                          │
│            description: "Receipts from donors",             │
│            currentPeriodValue: 5000000,                     │
│            previousPeriodValue: 4500000,                    │
│            note: 1,                                          │
│            formatting: {                                     │
│              isTotal: false,                                 │
│              isSubtotal: false                               │
│            }                                                 │
│          },                                                  │
│          // ... more lines                                   │
│        ]                                                     │
│      }                                                       │
│    }                                                         │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ↓
┌──────────────────────────────────────────────────────────────┐
│ 5. DATA TRANSFORMATION                                       │
│    transformStatementData(lines) →                          │
│    [                                                         │
│      {                                                       │
│        description: "Receipts from donors",                 │
│        note: 1,                                              │
│        current: 5000000,                                     │
│        previous: 4500000,                                    │
│        isTotal: false,                                       │
│        isSubtotal: false                                     │
│      },                                                      │
│      // ... more rows                                        │
│    ]                                                         │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ↓
┌──────────────────────────────────────────────────────────────┐
│ 6. UI RENDERING                                              │
│    <CashFlowStatement                                        │
│      initialData={transformedData}                          │
│      currentPeriodLabel="FY 2024/2025 (Frw)"               │
│      previousPeriodLabel="FY 2023/2024 (Frw)"              │
│    />                                                        │
│                                                              │
│    Renders table with:                                       │
│    - Headers                                                 │
│    - Data rows                                               │
│    - Formatting (bold, borders)                              │
│    - Currency formatting                                     │
└──────────────────────────────────────────────────────────────┘
```

---

## Key Features

### **1. Consistent Structure**
All financial statements share:
- Same table layout (4 columns: Description, Note, Current, Previous)
- Same row types (normal, subtotal, total)
- Same formatting rules
- Same data transformation pattern

### **2. Project Filtering**
- Tab-based navigation (HIV, Malaria, TB)
- Each tab fetches its own data
- Independent loading states per tab

### **3. Comparative Periods**
- Current period (e.g., FY 2024/2025)
- Previous period (e.g., FY 2023/2024)
- Side-by-side comparison

### **4. Formatting Rules**

| Row Type | Styling | Use Case |
|----------|---------|----------|
| **Normal** | Regular font | Line items |
| **Subtotal** | Semi-bold (`font-semibold`) | Section subtotals |
| **Total** | Bold + top border (`font-bold border-t-2`) | Grand totals |

### **5. Currency Formatting**
```typescript
formatCurrency(5000000) → "5,000,000"
formatCurrency(-3000000) → "(3,000,000)"  // Negative in parentheses
formatCurrency(null) → ""  // Empty for null values
```

---

## Statement-Specific Differences

### **Cash Flow Statement**
- **Sections**: Operating, Investing, Financing activities
- **Focus**: Cash movements
- **Key Lines**: Net increase in cash, Cash at end of period

### **Revenue & Expenditure Statement**
- **Sections**: Revenue (A), Expenditures (B), Surplus/Deficit (C)
- **Focus**: Income statement
- **Key Lines**: Total revenue, Total expenditures, Surplus/Deficit

### **Balance Sheet**
- **Sections**: Assets (D), Liabilities (E), Net Assets (F)
- **Focus**: Financial position
- **Key Lines**: Total assets, Total liabilities, Net assets

### **Changes in Net Assets**
- **Sections**: Opening balance, Changes during period, Closing balance
- **Focus**: Net asset movements
- **Key Lines**: Opening net assets, Net surplus, Closing net assets

### **Budget vs Actual**
- **Columns**: Description, Note, Budget, Actual, Variance, Performance %
- **Focus**: Performance analysis
- **Key Lines**: Variance analysis, Performance percentages

---

## File Structure

```
apps/client/
├── app/dashboard/reports/
│   ├── cash-flow/
│   │   └── page.tsx                    # Cash flow page
│   ├── revenue-expenditure/
│   │   └── page.tsx                    # Revenue & expenditure page
│   ├── balance-sheet/
│   │   └── page.tsx                    # Balance sheet page
│   ├── net-assets-changes/
│   │   └── page.tsx                    # Net assets changes page
│   ├── budget-vs-actual/
│   │   └── page.tsx                    # Budget vs actual page
│   └── utils/
│       └── transform-statement-data.ts # Data transformation utilities
│
├── features/reports/
│   ├── cash-flow.tsx                   # Cash flow component
│   ├── revenue-expenditure.tsx         # Revenue & expenditure component
│   ├── balance-sheet.tsx               # Balance sheet component
│   ├── changes-in-net-assets.tsx       # Net assets changes component
│   └── budget-vs-actual.tsx            # Budget vs actual component
│
├── components/reports/
│   └── financial-statement-header.tsx  # Shared header component
│
└── hooks/mutations/financial-reports/
    └── use-generate-statement.ts       # API hook
```

---

## Common Patterns

### **Loading State**
```typescript
if (isPending || !statementData) {
  return <ReportSkeleton />;
}
```

### **Error State**
```typescript
if (isError) {
  return <div>Failed to load statement</div>;
}
```

### **Empty State**
```typescript
if (!initialData || initialData.length === 0) {
  return <div>No data available</div>;
}
```

### **Row Rendering**
```typescript
const renderRow = (row: Row, idx: number) => {
  const rowClass = `
    ${row.isSubtotal ? 'font-semibold' : ''} 
    ${row.isTotal ? 'font-bold border-t-2' : ''}
  `;
  return <tr key={idx} className={rowClass}>...</tr>;
};
```

---

## Best Practices

1. **Use Statement Codes**: Always use exact codes from `STATEMENT_CODES.md`
2. **Transform Data**: Always transform API data before passing to components
3. **Handle Nulls**: Check for null values before rendering
4. **Format Currency**: Use `formatCurrency()` for all monetary values
5. **Loading States**: Show skeleton loaders during data fetch
6. **Error Handling**: Display user-friendly error messages
7. **Type Safety**: Use TypeScript interfaces for all data structures

---

## Related Documentation

- `STATEMENT-CODES.md` - Statement code reference
- `MIGRATION-GUIDE.md` - Migration from static to dynamic data
- `DYNAMIC-DATA-IMPLEMENTATION.md` - Dynamic data implementation details
- `README.md` - General reports documentation

---

## Date
Documented: 2025-01-XX

## Author
Kiro AI Assistant
