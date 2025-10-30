# Design Document: Financial Statement Status Sidebar

## Overview

This design implements a status information sidebar for financial statement pages (Balance Sheet and Revenue & Expenditure). The sidebar displays report metadata, approval status, and provides quick actions for accountants to submit reports for approval. The solution integrates with the existing financial reports approval workflow infrastructure while providing a focused, minimal interface for statement viewing.

## Architecture

### Component Structure

```
┌─────────────────────────────────────────────────────────────┐
│           Financial Statement Page (Balance Sheet/          │
│                  Revenue & Expenditure)                      │
│  ┌────────────────────────────┬──────────────────────────┐  │
│  │                            │                          │  │
│  │   Financial Statement      │   Status Sidebar         │  │
│  │   (Table/Report)           │   - Status Badge         │  │
│  │                            │   - Created Date         │  │
│  │                            │   - Created By           │  │
│  │                            │   - Approved By (DAF)    │  │
│  │                            │   - Submit Button        │  │
│  │                            │                          │  │
│  └────────────────────────────┴──────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
┌──────────────────┐
│  Statement Page  │
│  (per project)   │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────┐
│  useFinancialReportMetadata  │ (Custom Hook)
│  - Fetches report by ID      │
│  - Extracts metadata         │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  FinancialReportStatusCard   │ (Component)
│  - Displays status badge     │
│  - Shows metadata            │
│  - Renders submit button     │
└────────┬─────────────────────┘
         │
         ▼ (on submit)
┌──────────────────────────────┐
│  submitForApproval API       │
│  - Updates report status     │
│  - Returns updated report    │
└──────────────────────────────┘
```

## Components and Interfaces

### 1. FinancialReportStatusCard Component

Main component that renders the status sidebar.

```typescript
interface FinancialReportStatusCardProps {
  reportId: number | null;
  projectType: 'HIV' | 'Malaria' | 'TB';
  statementType: 'revenue-expenditure' | 'assets-liabilities';
  onStatusChange?: (newStatus: string) => void;
}

export function FinancialReportStatusCard({
  reportId,
  projectType,
  statementType,
  onStatusChange
}: FinancialReportStatusCardProps) {
  // Component implementation
}
```

**Features:**
- Displays status badge with color coding
- Shows creation date and creator name
- Shows DAF approval information when available
- Renders submit/resubmit button based on status
- Handles loading and error states
- Provides success/error feedback via toast notifications

**Visual Design:**
- Card with border and shadow
- Sticky positioning to remain visible while scrolling
- Compact layout with clear visual hierarchy
- Responsive spacing and typography

### 2. ApprovalStatusBadge Component

Reusable badge component for displaying report status.

```typescript
interface ApprovalStatusBadgeProps {
  status: ReportStatus;
  className?: string;
}

type ReportStatus = 
  | 'draft'
  | 'pending_daf_approval'
  | 'rejected_by_daf'
  | 'approved_by_daf'
  | 'rejected_by_dg'
  | 'fully_approved';

export function ApprovalStatusBadge({ status, className }: ApprovalStatusBadgeProps) {
  // Component implementation
}
```

**Status Color Mapping:**
- `draft`: Gray (neutral)
- `pending_daf_approval`: Yellow/Amber (warning)
- `approved_by_daf`: Blue (info)
- `fully_approved`: Green (success)
- `rejected_by_daf`, `rejected_by_dg`: Red (destructive)

**Status Label Mapping:**
- `draft`: "Draft"
- `pending_daf_approval`: "Pending DAF Approval"
- `approved_by_daf`: "Approved by DAF"
- `fully_approved`: "Fully Approved"
- `rejected_by_daf`: "Rejected by DAF"
- `rejected_by_dg`: "Rejected by DG"

### 3. useFinancialReportMetadata Hook

Custom hook for fetching and managing report metadata.

```typescript
interface UseFinancialReportMetadataOptions {
  reportId: number | null;
  enabled?: boolean;
}

interface FinancialReportMetadata {
  id: number;
  status: ReportStatus;
  createdAt: string;
  createdBy: number | null;
  createdByName?: string;
  dafId: number | null;
  dafName?: string;
  dafApprovedAt: string | null;
  locked: boolean;
}

export function useFinancialReportMetadata({
  reportId,
  enabled = true
}: UseFinancialReportMetadataOptions) {
  // Hook implementation using React Query
  return {
    metadata: FinancialReportMetadata | null,
    isLoading: boolean,
    isError: boolean,
    error: Error | null,
    refetch: () => void
  };
}
```

**Implementation Details:**
- Uses `getFinancialReportById` fetcher
- Leverages React Query for caching and automatic refetching
- Extracts only necessary metadata fields
- Handles loading and error states
- Provides refetch function for manual updates

### 4. useSubmitForApproval Hook

Custom hook for submitting reports for approval.

```typescript
interface UseSubmitForApprovalOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

export function useSubmitForApproval(options?: UseSubmitForApprovalOptions) {
  // Hook implementation using React Query mutation
  return {
    submit: (reportId: number) => Promise<void>,
    isSubmitting: boolean,
    isSuccess: boolean,
    isError: boolean,
    error: Error | null
  };
}
```

**Implementation Details:**
- Uses `submitForApproval` fetcher
- Leverages React Query mutation
- Provides loading, success, and error states
- Calls onSuccess/onError callbacks
- Invalidates relevant queries on success

## Data Models

### Report Metadata Structure

```typescript
interface FinancialReport {
  id: number;
  reportCode: string;
  title: string;
  projectId: number;
  facilityId: number;
  reportingPeriodId: number;
  status: ReportStatus;
  createdBy: number | null;
  createdAt: string;
  submittedBy: number | null;
  submittedAt: string | null;
  dafId: number | null;
  dafApprovedAt: string | null;
  dafComment: string | null;
  locked: boolean;
  // ... other fields
}

// User information (joined from users table)
interface UserInfo {
  id: number;
  name: string;
  email: string;
}
```

### Component State

```typescript
interface StatusCardState {
  metadata: FinancialReportMetadata | null;
  isLoading: boolean;
  isSubmitting: boolean;
  showSuccessMessage: boolean;
  error: string | null;
}
```

## Integration Points

### 1. Page Integration

Update both Balance Sheet and Revenue & Expenditure pages to include the status sidebar:

```typescript
// In TabContent component
const TabContent = ({ tabValue, periodId }: { tabValue: string; periodId: number }) => {
  const [statementData, setStatementData] = useState<any>(null);
  const [reportId, setReportId] = useState<number | null>(null);
  
  // ... existing code ...
  
  return (
    <div className="flex gap-4">
      <div className="flex-1">
        <RevenueExpenditureStatement 
          initialData={transformedData} 
          {...periodLabels} 
        />
      </div>
      <div className="w-80">
        <FinancialReportStatusCard
          reportId={reportId}
          projectType={projectTypeMapping[tabValue]}
          statementType="revenue-expenditure"
        />
      </div>
    </div>
  );
}
```

### 2. API Integration

The component will use existing API endpoints:

- **GET /financial-reports/:id** - Fetch report metadata
- **POST /financial-reports/:id/submit** - Submit for approval

### 3. Report ID Resolution

The report ID needs to be obtained from the statement generation response:

```typescript
// Update generateStatement success handler
onSuccess: (data) => {
  setStatementData(data.statement);
  setReportId(data.reportId); // Extract report ID from response
}
```

## UI/UX Design

### Status Card Layout

```
┌─────────────────────────────────┐
│  Status Card                    │
├─────────────────────────────────┤
│                                 │
│  [Status Badge]                 │
│                                 │
│  Created: Jan 15, 2025          │
│  Created by: John Doe           │
│                                 │
│  ─────────────────────────      │
│                                 │
│  Approved by: Jane Smith        │
│  Approved: Jan 20, 2025         │
│                                 │
│  ─────────────────────────      │
│                                 │
│  [Submit for Approval Button]   │
│                                 │
└─────────────────────────────────┘
```

### Styling Guidelines

**Card Container:**
- Background: White
- Border: 1px solid gray-200
- Border radius: 8px
- Padding: 16px
- Shadow: Small shadow for depth
- Position: Sticky (top: 20px)

**Status Badge:**
- Padding: 4px 12px
- Border radius: 16px (pill shape)
- Font size: Small
- Font weight: Medium
- Text transform: Capitalize

**Text Elements:**
- Labels: Gray-600, font-size: small, font-weight: medium
- Values: Gray-900, font-size: small
- Line height: Comfortable spacing

**Submit Button:**
- Full width
- Primary color
- Disabled state when not applicable
- Loading spinner when submitting

### Responsive Behavior

- Desktop (>1024px): Sidebar visible, width: 320px
- Tablet (768-1024px): Sidebar below statement
- Mobile (<768px): Sidebar below statement, full width

## Error Handling

### Loading States

```typescript
if (isLoading) {
  return (
    <Card>
      <CardContent>
        <Skeleton className="h-6 w-24 mb-4" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
      </CardContent>
    </Card>
  );
}
```

### Error States

```typescript
if (isError) {
  return (
    <Card>
      <CardContent>
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load report status. Please try again.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
```

### No Report State

```typescript
if (!reportId) {
  return (
    <Card>
      <CardContent>
        <p className="text-sm text-gray-500">
          No report data available for this project.
        </p>
      </CardContent>
    </Card>
  );
}
```

### Submit Error Handling

```typescript
const handleSubmit = async () => {
  try {
    await submit(reportId);
    toast({
      title: "Success",
      description: "Report submitted for approval",
    });
    refetch(); // Refresh metadata
  } catch (error) {
    toast({
      title: "Error",
      description: error.message || "Failed to submit report",
      variant: "destructive",
    });
  }
};
```

## Testing Strategy

### Component Tests

1. **FinancialReportStatusCard**
   - Renders correctly with different statuses
   - Shows/hides submit button based on status
   - Displays metadata correctly
   - Handles loading state
   - Handles error state
   - Handles no report state

2. **ApprovalStatusBadge**
   - Renders correct color for each status
   - Displays correct label for each status
   - Applies custom className

### Integration Tests

1. **Status Display**
   - Fetches and displays report metadata
   - Updates when project tab changes
   - Shows correct approval information

2. **Submit Action**
   - Submits report successfully
   - Updates status after submission
   - Shows success message
   - Handles submission errors
   - Disables button during submission

### User Flow Tests

1. **Draft Report Flow**
   - View draft report
   - See "Draft" status badge
   - Click "Submit for Approval"
   - See status change to "Pending DAF Approval"
   - Submit button disappears

2. **Rejected Report Flow**
   - View rejected report
   - See "Rejected" status badge
   - See rejection information
   - Click "Resubmit for Approval"
   - See status change

## Implementation Notes

### Date Formatting

Use a consistent date formatting utility:

```typescript
import { format } from 'date-fns';

const formatDate = (dateString: string) => {
  return format(new Date(dateString), 'MMM dd, yyyy');
};
```

### Status Button Logic

```typescript
const canSubmit = (status: ReportStatus) => {
  return status === 'draft' || 
         status === 'rejected_by_daf' || 
         status === 'rejected_by_dg';
};

const getButtonText = (status: ReportStatus) => {
  if (status === 'draft') return 'Submit for Approval';
  if (status === 'rejected_by_daf' || status === 'rejected_by_dg') {
    return 'Resubmit for Approval';
  }
  return null;
};
```

### Query Keys

```typescript
const queryKeys = {
  financialReport: (id: number) => ['financial-report', id],
  financialReportMetadata: (id: number) => ['financial-report-metadata', id],
};
```

### Performance Considerations

1. **Memoization**: Memoize expensive computations
2. **Query Caching**: Leverage React Query's caching
3. **Conditional Fetching**: Only fetch when reportId is available
4. **Optimistic Updates**: Update UI optimistically on submit

## Security Considerations

1. **Authorization**: Verify user has permission to view report
2. **Role Checks**: Only show submit button to accountants
3. **Input Validation**: Validate reportId before API calls
4. **Error Messages**: Don't expose sensitive information in errors

## Accessibility

1. **Semantic HTML**: Use proper heading hierarchy
2. **ARIA Labels**: Add labels for screen readers
3. **Keyboard Navigation**: Ensure button is keyboard accessible
4. **Focus Management**: Manage focus on status changes
5. **Color Contrast**: Ensure badge colors meet WCAG standards
