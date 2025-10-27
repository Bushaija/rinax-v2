# Design Document: Multi-Level Approval Workflow for Financial Reports

## Overview

This design implements a 3-tier approval workflow (Accountant → DAF → DG) for financial reports in the Budget Management System. The solution extends the existing financial_reports module with new database fields, status transitions, role-based endpoints, workflow logging, and PDF generation capabilities. The design follows patterns established in the planning module's approval workflow while adapting them for the financial reports domain.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer (React)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Accountant  │  │     DAF      │  │      DG      │      │
│  │     UI       │  │   Queue UI   │  │   Queue UI   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Layer (Hono)                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Financial Reports Routes & Handlers                 │   │
│  │  - Submit, DAF Approve/Reject, DG Approve/Reject     │   │
│  │  - Role-based middleware                             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Service Layer                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Workflow Service                                    │   │
│  │  - State transitions, validation, locking            │   │
│  │  - Workflow logging, notifications                   │   │
│  │  - PDF generation                                    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Database Layer (PostgreSQL)                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  financial_reports (extended)                        │   │
│  │  financial_report_workflow_logs (new)                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Workflow State Machine

```
draft ──────────────────────────────────────────┐
  │                                              │
  │ submit                                       │
  ▼                                              │
pending_daf_approval                             │
  │                                              │
  ├─── DAF approve ──► approved_by_daf          │
  │                         │                    │
  │                         │ DG approve         │
  │                         ▼                    │
  │                    fully_approved            │
  │                                              │
  ├─── DAF reject ──► rejected_by_daf ──────────┤
  │                                              │
  └──────────────────────────────────────────────┘
                                                 │
approved_by_daf                                  │
  │                                              │
  └─── DG reject ──► rejected_by_dg ────────────┘
```

## Components and Interfaces

### 1. Database Schema Extensions

#### Extended financial_reports Table

```typescript
// New columns to add
{
  dafId: integer | null,              // DAF approver user ID
  dafApprovedAt: timestamp | null,    // DAF approval timestamp
  dafComment: text | null,            // DAF approval/rejection comment
  dgId: integer | null,               // DG approver user ID
  dgApprovedAt: timestamp | null,     // DG approval timestamp
  dgComment: text | null,             // DG approval/rejection comment
  finalPdfUrl: text | null,           // URL to generated PDF
  locked: boolean (default: false)    // Edit lock flag
}
```

#### New financial_report_workflow_logs Table

```typescript
{
  id: serial (primary key),
  reportId: integer (foreign key → financial_reports.id),
  action: varchar(50),                // 'submitted', 'daf_approved', 'daf_rejected', etc.
  actorId: integer (foreign key → users.id),
  comment: text | null,
  timestamp: timestamp (default: CURRENT_TIMESTAMP)
}
```

#### Updated report_status Enum

```typescript
// Extend existing enum
reportStatus = [
  'draft',
  'pending_daf_approval',
  'rejected_by_daf',
  'approved_by_daf',
  'rejected_by_dg',
  'fully_approved'
]
```

### 2. API Endpoints

#### POST /financial-reports/:id/submit
- **Role**: Accountant
- **Preconditions**: status = 'draft' OR status LIKE 'rejected_%'
- **Actions**:
  - Update status → 'pending_daf_approval'
  - Set locked → true
  - Record submittedBy, submittedAt
  - Create workflow log
  - Notify DAF users
- **Response**: Updated report object

#### POST /financial-reports/:id/daf-approve
- **Role**: DAF
- **Preconditions**: status = 'pending_daf_approval'
- **Request Body**: `{ comment?: string }`
- **Actions**:
  - Update status → 'approved_by_daf'
  - Set dafId, dafApprovedAt, dafComment
  - Keep locked → true
  - Create workflow log
  - Notify DG users
- **Response**: Updated report object

#### POST /financial-reports/:id/daf-reject
- **Role**: DAF
- **Preconditions**: status = 'pending_daf_approval'
- **Request Body**: `{ comment: string }` (required)
- **Actions**:
  - Update status → 'rejected_by_daf'
  - Set dafId, dafApprovedAt, dafComment
  - Set locked → false
  - Create workflow log
  - Notify report creator
- **Response**: Updated report object

#### POST /financial-reports/:id/dg-approve
- **Role**: DG
- **Preconditions**: status = 'approved_by_daf'
- **Request Body**: `{ comment?: string }`
- **Actions**:
  - Update status → 'fully_approved'
  - Set dgId, dgApprovedAt, dgComment
  - Set locked → true (permanent)
  - Generate PDF snapshot
  - Set finalPdfUrl
  - Create workflow log
  - Notify relevant users
- **Response**: Updated report object with PDF URL

#### POST /financial-reports/:id/dg-reject
- **Role**: DG
- **Preconditions**: status = 'approved_by_daf'
- **Request Body**: `{ comment: string }` (required)
- **Actions**:
  - Update status → 'rejected_by_dg'
  - Set dgId, dgApprovedAt, dgComment
  - Set locked → false
  - Create workflow log
  - Notify report creator
- **Response**: Updated report object

#### GET /financial-reports/:id/workflow-logs
- **Role**: Any authenticated user with report access
- **Response**: Array of workflow log entries ordered by timestamp

### 3. Service Layer

#### WorkflowService

```typescript
class FinancialReportWorkflowService {
  // State transition validation
  canSubmit(report: FinancialReport, userId: number): boolean
  canDafApprove(report: FinancialReport, userId: number): boolean
  canDafReject(report: FinancialReport, userId: number): boolean
  canDgApprove(report: FinancialReport, userId: number): boolean
  canDgReject(report: FinancialReport, userId: number): boolean
  
  // Workflow actions
  submitForApproval(reportId: number, userId: number): Promise<FinancialReport>
  dafApprove(reportId: number, userId: number, comment?: string): Promise<FinancialReport>
  dafReject(reportId: number, userId: number, comment: string): Promise<FinancialReport>
  dgApprove(reportId: number, userId: number, comment?: string): Promise<FinancialReport>
  dgReject(reportId: number, userId: number, comment: string): Promise<FinancialReport>
  
  // Workflow logging
  logAction(reportId: number, action: string, actorId: number, comment?: string): Promise<void>
  getWorkflowLogs(reportId: number): Promise<WorkflowLog[]>
  
  // Locking
  lockReport(reportId: number): Promise<void>
  unlockReport(reportId: number): Promise<void>
  isLocked(reportId: number): Promise<boolean>
  
  // PDF generation
  generatePdf(reportId: number): Promise<string> // Returns PDF URL
}
```

#### NotificationService

```typescript
interface NotificationService {
  notifyDafUsers(reportId: number, reportTitle: string): Promise<void>
  notifyDgUsers(reportId: number, reportTitle: string): Promise<void>
  notifyReportCreator(reportId: number, status: string, comment?: string): Promise<void>
}
```

#### PdfGenerationService

```typescript
interface PdfGenerationService {
  generateFinancialReportPdf(report: FinancialReport): Promise<Buffer>
  savePdf(buffer: Buffer, filename: string): Promise<string> // Returns URL
  includApprovalMetadata(pdf: PDFDocument, report: FinancialReport): void
}
```

### 4. Client Components

#### Accountant Interface

**Components:**
- `FinancialReportsTable` - List view with status indicators
- `ReportEditForm` - Edit form (disabled when locked)
- `SubmitButton` - Submit for approval action
- `RejectionAlert` - Display rejection comments

**Features:**
- Filter reports by status (draft, rejected)
- Visual indicators for locked reports
- Prominent display of rejection reasons
- Submit button only for draft/rejected reports

#### DAF Queue Interface

**Components:**
- `DafApprovalQueue` - List of pending_daf_approval reports
- `DafReviewCard` - Individual report review interface
- `ApprovalActionsCard` - Approve/Reject buttons with comment input
- `WorkflowTimeline` - Visual timeline of approval history

**Features:**
- Dedicated queue view filtered to pending_daf_approval
- Mandatory comment field for rejections
- Preview of report data
- Approval history display

#### DG Queue Interface

**Components:**
- `DgApprovalQueue` - List of approved_by_daf reports
- `DgReviewCard` - Individual report review interface
- `FinalApprovalActionsCard` - Final Approve/Reject buttons
- `WorkflowTimeline` - Complete approval history including DAF actions

**Features:**
- Dedicated queue view filtered to approved_by_daf
- Display DAF approval details
- Mandatory comment field for rejections
- Complete workflow history
- PDF download link after approval

#### Shared Components

**ApprovalStatusBadge**
```typescript
interface ApprovalStatusBadgeProps {
  status: ReportStatus;
}
// Visual badge with color coding for each status
```

**WorkflowTimeline**
```typescript
interface WorkflowTimelineProps {
  logs: WorkflowLog[];
}
// Chronological display of all workflow actions
```

**ApprovalCommentDialog**
```typescript
interface ApprovalCommentDialogProps {
  action: 'approve' | 'reject';
  required: boolean;
  onSubmit: (comment?: string) => void;
}
```

## Data Models

### TypeScript Interfaces

```typescript
// Extended FinancialReport type
interface FinancialReport {
  // Existing fields...
  id: number;
  reportCode: string;
  title: string;
  projectId: number;
  facilityId: number;
  reportingPeriodId: number;
  version: string;
  fiscalYear: string;
  status: ReportStatus;
  reportData: Record<string, any>;
  metadata: Record<string, any> | null;
  computedTotals: Record<string, any> | null;
  validationResults: Record<string, any> | null;
  createdBy: number | null;
  createdAt: string;
  updatedBy: number | null;
  updatedAt: string;
  submittedBy: number | null;
  submittedAt: string | null;
  approvedBy: number | null;
  approvedAt: string | null;
  
  // New approval workflow fields
  dafId: number | null;
  dafApprovedAt: string | null;
  dafComment: string | null;
  dgId: number | null;
  dgApprovedAt: string | null;
  dgComment: string | null;
  finalPdfUrl: string | null;
  locked: boolean;
}

type ReportStatus = 
  | 'draft'
  | 'pending_daf_approval'
  | 'rejected_by_daf'
  | 'approved_by_daf'
  | 'rejected_by_dg'
  | 'fully_approved';

interface WorkflowLog {
  id: number;
  reportId: number;
  action: WorkflowAction;
  actorId: number;
  actor?: {
    id: number;
    name: string;
    email: string;
  };
  comment: string | null;
  timestamp: string;
}

type WorkflowAction =
  | 'submitted'
  | 'daf_approved'
  | 'daf_rejected'
  | 'dg_approved'
  | 'dg_rejected';

// API Request/Response types
interface SubmitForApprovalRequest {
  // No body needed, uses route param
}

interface ApprovalActionRequest {
  comment?: string;
}

interface RejectionActionRequest {
  comment: string; // Required
}

interface ApprovalActionResponse {
  report: FinancialReport;
  message: string;
}
```

## Error Handling

### Validation Errors

```typescript
// Status validation
if (report.status !== 'draft' && !report.status.startsWith('rejected_')) {
  throw new ValidationError('Report must be in draft or rejected state to submit');
}

// Role validation
if (!user.roles.includes('daf')) {
  throw new AuthorizationError('Only DAF users can approve at this stage');
}

// Lock validation
if (report.locked && action === 'edit') {
  throw new ValidationError('Cannot edit locked report');
}

// Comment validation
if (action === 'reject' && !comment) {
  throw new ValidationError('Rejection comment is required');
}
```

### Error Response Format

```typescript
interface ErrorResponse {
  error: string;
  message: string;
  details?: string;
  statusCode: number;
}
```

### Client Error Handling

```typescript
// Use existing approval error handler pattern from planning module
const { handleApprovalError } = useApprovalErrorHandler();

try {
  await submitForApproval(reportId);
} catch (error) {
  handleApprovalError(error, 'submit');
}
```

## Testing Strategy

### Unit Tests

1. **Workflow Service Tests**
   - State transition validation logic
   - Permission checking for each role
   - Lock/unlock operations
   - Workflow log creation

2. **API Handler Tests**
   - Each endpoint with valid inputs
   - Authorization checks
   - Invalid state transitions
   - Missing required fields

3. **PDF Generation Tests**
   - PDF creation with report data
   - Approval metadata inclusion
   - File storage and URL generation

### Integration Tests

1. **Complete Workflow Tests**
   - Draft → Submit → DAF Approve → DG Approve → Fully Approved
   - Draft → Submit → DAF Reject → Edit → Resubmit
   - Draft → Submit → DAF Approve → DG Reject → Edit → Resubmit

2. **Role-Based Access Tests**
   - Accountant cannot approve
   - DAF cannot act on DG-stage reports
   - DG cannot act on DAF-stage reports

3. **Locking Tests**
   - Locked reports cannot be edited
   - Rejected reports are unlocked
   - Fully approved reports remain locked

### Client Component Tests

1. **UI State Tests**
   - Correct buttons shown for each role and status
   - Locked reports disable edit controls
   - Rejection comments display correctly

2. **Action Tests**
   - Submit action updates status
   - Approve/Reject actions call correct endpoints
   - Comment validation for rejections

## Implementation Notes

### Database Migration

```sql
-- Add new columns to financial_reports
ALTER TABLE financial_reports
ADD COLUMN daf_id INTEGER REFERENCES users(id),
ADD COLUMN daf_approved_at TIMESTAMP,
ADD COLUMN daf_comment TEXT,
ADD COLUMN dg_id INTEGER REFERENCES users(id),
ADD COLUMN dg_approved_at TIMESTAMP,
ADD COLUMN dg_comment TEXT,
ADD COLUMN final_pdf_url TEXT,
ADD COLUMN locked BOOLEAN DEFAULT FALSE;

-- Update report_status enum
ALTER TYPE report_status ADD VALUE 'pending_daf_approval';
ALTER TYPE report_status ADD VALUE 'rejected_by_daf';
ALTER TYPE report_status ADD VALUE 'approved_by_daf';
ALTER TYPE report_status ADD VALUE 'rejected_by_dg';
ALTER TYPE report_status ADD VALUE 'fully_approved';

-- Create workflow logs table
CREATE TABLE financial_report_workflow_logs (
  id SERIAL PRIMARY KEY,
  report_id INTEGER NOT NULL REFERENCES financial_reports(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  actor_id INTEGER NOT NULL REFERENCES users(id),
  comment TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workflow_logs_report_id ON financial_report_workflow_logs(report_id);
CREATE INDEX idx_workflow_logs_timestamp ON financial_report_workflow_logs(timestamp);
```

### Role Configuration

Ensure user_role enum includes necessary roles:
- 'accountant' (existing)
- Add 'daf' if not present
- Add 'dg' if not present

### PDF Generation Library

Use existing pdfkit library (already in dependencies) for PDF generation:
```typescript
import PDFDocument from 'pdfkit';
```

### File Storage

Store generated PDFs in `public/reports/pdfs/` directory with naming convention:
```
financial-report-{reportId}-{timestamp}.pdf
```

### Notification Integration

Leverage existing notification patterns from planning module, adapting for financial reports context.

## Security Considerations

1. **Role-Based Access Control**: Enforce strict role checks at API layer
2. **Report Locking**: Prevent concurrent modifications during approval
3. **Audit Trail**: Immutable workflow logs for compliance
4. **PDF Integrity**: Generate PDFs server-side to prevent tampering
5. **Comment Sanitization**: Sanitize user comments to prevent XSS
6. **Authorization**: Verify user has access to facility/project before allowing actions

## Performance Considerations

1. **Workflow Logs**: Index on report_id and timestamp for fast retrieval
2. **PDF Generation**: Generate asynchronously to avoid blocking requests
3. **Notification Batching**: Batch notifications to multiple users
4. **Query Optimization**: Use joins to fetch related data efficiently
5. **Caching**: Cache user role information to reduce database queries
