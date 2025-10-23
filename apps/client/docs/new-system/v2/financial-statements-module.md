# API Endpoints Documentation

## Financial Reports Management

### Core Financial Report Operations

**GET /financial-reports**
- **Purpose:** Retrieve paginated list of financial reports with filtering options
- **Query Parameters:** projectId, facilityId, reportingPeriodId, fiscalYear, status, createdBy, date range, pagination
- **Response:** Reports list with pagination metadata and summary statistics

**GET /financial-reports/{id}**
- **Purpose:** Fetch detailed financial report with full relational data
- **Response:** Complete report with project, facility, reporting period, and user relationships

**POST /financial-reports**
- **Purpose:** Create new financial report
- **Body:** Report data including projectId, facilityId, reportingPeriodId, reportData
- **Response:** Created report with generated ID

**PUT /financial-reports/{id}**
- **Purpose:** Update existing financial report
- **Body:** Updated report data with audit trail fields
- **Response:** Updated report record

**DELETE /financial-reports/{id}**
- **Purpose:** Remove financial report
- **Response:** 204 No Content on success

---

### Advanced Financial Report Operations

**POST /financial-reports/generate**
- **Purpose:** Generate new financial report from template or data
- **Body:** Generation parameters (project, period, template settings)
- **Response:** Generated report with validation results

**POST /financial-reports/{id}/calculate-totals**
- **Purpose:** Recalculate report totals and computed values
- **Body:** Calculation options (recalculateAll flag)
- **Response:** Updated totals and calculation results

**POST /financial-reports/{id}/validate**
- **Purpose:** Validate report data against business rules
- **Body:** Validation type and options
- **Response:** Validation results with errors and warnings

**GET /financial-reports/{id}/export/{format}**
- **Purpose:** Export report in specified format (pdf, excel, csv)
- **Query Parameters:** includeComparatives, template
- **Response:** Binary file download

**POST /financial-reports/{id}/duplicate**
- **Purpose:** Create copy of existing report
- **Body:** Duplication parameters (title, fiscalYear, reportingPeriodId, resetStatus)
- **Response:** Duplicated report record

**GET /financial-reports/{id}/versions**
- **Purpose:** Retrieve all versions of a report
- **Response:** Array of related report versions

---

## Event Mappings Management

### Core Event Mapping Operations

**GET /event-mappings**
- **Purpose:** List configurable event mappings with filtering
- **Query Parameters:** eventId, activityId, categoryId, projectType, facilityType, mappingType, isActive, pagination
- **Response:** Paginated mappings with related event, activity, and category data

**GET /event-mappings/{id}**
- **Purpose:** Retrieve specific event mapping with full relationships
- **Response:** Mapping with complete event, activity, and category details

**POST /event-mappings**
- **Purpose:** Create new event-to-activity/category mapping
- **Body:** Mapping configuration including eventId, activityId/categoryId, mappingType, formula
- **Response:** Created mapping with validation

**PUT /event-mappings/{id}**
- **Purpose:** Update existing event mapping
- **Body:** Updated mapping data with formula validation
- **Response:** Updated mapping record

**DELETE /event-mappings/{id}**
- **Purpose:** Remove event mapping
- **Response:** 204 No Content on success

---

### Advanced Event Mapping Operations

**POST /event-mappings/bulk-update**
- **Purpose:** Create or update multiple mappings in single operation
- **Body:** Array of mappings with projectType/facilityType context
- **Response:** Operation results with created/updated counts and errors

**POST /event-mappings/validate**
- **Purpose:** Validate mapping formula and test with sample data
- **Body:** Mapping formula and optional test data
- **Response:** Validation results with calculated test result

**GET /event-mappings/templates/{projectType}/{facilityType}**
- **Purpose:** Get mapping template for specific project and facility type
- **Response:** Existing mappings, unmapped events, and AI-recommended mappings

---

## Statement Templates Management

### Core Statement Template Operations

**GET /statement-templates**
- **Purpose:** Retrieve statement templates with optional hierarchical structure
- **Query Parameters:** statementCode, isActive, level, parentLineId, includeHierarchy, pagination
- **Response:** Templates list with optional hierarchical organization

**POST /statement-templates**
- **Purpose:** Create new statement line template
- **Body:** Template data including statementCode, lineItem, displayOrder, calculation formulas
- **Response:** Created template with validation results

**GET /statement-templates/{id}**
- **Purpose:** Fetch specific template with optional child hierarchy
- **Query Parameters:** includeChildren
- **Response:** Template with optional hierarchical children

**PUT /statement-templates/{id}**
- **Purpose:** Update complete statement template
- **Body:** Full template data with validation
- **Response:** Updated template record

**PATCH /statement-templates/{id}**
- **Purpose:** Partial update of statement template fields
- **Body:** Fields to update
- **Response:** Updated template

**DELETE /statement-templates/{id}**
- **Purpose:** Remove statement template (checks for dependencies)
- **Response:** 204 No Content or 409 Conflict if has children

---

### Statement Structure Operations

**GET /statement-templates/statement/{statementCode}**
- **Purpose:** Retrieve complete statement structure for specific code
- **Query Parameters:** includeHierarchy
- **Response:** Statement metadata with all line templates

**GET /statement-templates/codes**
- **Purpose:** List all available statement codes
- **Response:** Array of statement codes with names and descriptions

---

### Advanced Statement Template Operations

**POST /statement-templates/validate**
- **Purpose:** Validate template data against business rules
- **Body:** Template data for validation
- **Response:** Validation results with errors and warnings

**POST /statement-templates/bulk**
- **Purpose:** Create multiple templates in single operation
- **Body:** Array of templates with optional validation-only flag
- **Response:** Created templates with any errors

**PATCH /statement-templates/bulk**
- **Purpose:** Update multiple templates simultaneously
- **Body:** Array of template updates with IDs
- **Response:** Updated templates with error details

**PATCH /statement-templates/reorder**
- **Purpose:** Reorder templates within statement structure
- **Body:** Array of templates with new displayOrder, level, and parentLineId
- **Response:** Updated templates with confirmation

**POST /statement-templates/{id}/duplicate**
- **Purpose:** Duplicate template to new statement code
- **Body:** New statement code, name, and includeChildren flag
- **Response:** Original and duplicated template records

---

## Statements Workflow Management

### Report Workflow Operations

**POST /statements/{id}/submit**
- **Purpose:** Submit financial report for approval workflow
- **Body:** Submission details (comments, validation options)
- **Response:** Updated report status with workflow action results
- **Authorization:** Report creator or authorized user

**POST /statements/{id}/approve**
- **Purpose:** Approve submitted financial report
- **Body:** Approval details and comments
- **Response:** Approved report with workflow history
- **Authorization:** Users with 'approve_reports' permission or admin role

**POST /statements/{id}/reject**
- **Purpose:** Reject submitted report with reasons
- **Body:** Rejection details and required comments
- **Response:** Rejected report status with feedback
- **Authorization:** Users with approval permissions

**POST /statements/{id}/request-changes**
- **Purpose:** Request changes to submitted report
- **Body:** Change request details and specific feedback
- **Response:** Report returned to draft status with change requests
- **Authorization:** Reviewers and approvers

**POST /statements/{id}/recall**
- **Purpose:** Recall submitted report back to draft status
- **Body:** Recall reason and justification
- **Response:** Report status changed to draft
- **Authorization:** Original submitter (with restrictions based on current status)

**GET /statements/{id}/workflow-history**
- **Purpose:** Retrieve complete workflow history for report
- **Query Parameters:** page, limit for pagination
- **Response:** Chronological list of all workflow actions and status changes

---

### Bulk Operations and Queue Management

**POST /statements/bulk-approval**
- **Purpose:** Approve multiple reports in single operation
- **Body:** Array of report IDs with approval details
- **Response:** Bulk operation results with success/failure details per report
- **Authorization:** Users with 'bulk_approve_reports' permission

**GET /statements/approval-queue**
- **Purpose:** Retrieve reports pending approval
- **Query Parameters:** Filtering by facility, project, date range, priority
- **Response:** Paginated list of reports awaiting approval action
- **Authorization:** Filtered by user's facility unless admin role

---

### Notification Management

**GET /statements/notification-preferences**
- **Purpose:** Retrieve user's workflow notification settings
- **Response:** Current notification preferences for workflow events

**PUT /statements/notification-preferences**
- **Purpose:** Update user's notification preferences
- **Body:** Notification settings for different workflow events
- **Response:** Updated notification preferences

---

## Key Differences: Statements vs Statement-Templates

### Statement-Templates (`/statement-templates/*`)
- **Purpose:** **Configuration Management** - Define the structure and rules for financial statements
- **Scope:** Template definitions, line items, hierarchies, calculation formulas
- **Users:** System administrators, configuration managers
- **Operations:** Create/modify statement structures, manage hierarchies, set calculation rules
- **Data:** Static template definitions that define HOW statements should be structured

### Statements (`/statements/*`) 
- **Purpose:** **Workflow Management** - Handle the approval process for actual financial reports
- **Scope:** Report submission, approval, rejection, status tracking
- **Users:** Accountants, managers, approvers in operational roles
- **Operations:** Submit reports, approve/reject, track workflow status, manage approval queues
- **Data:** Dynamic workflow actions on actual report instances

### Relationship
- **Templates** define the blueprint (structure, calculations, validations)
- **Statements** manage the lifecycle of reports created from those templates
- Templates are configured once and reused; Statements handle each report's approval journey
- Templates focus on "what should a statement look like"; Statements focus on "is this specific statement approved"

---

## Common Response Patterns

### Success Responses
- **200 OK:** Successful retrieval or update
- **201 Created:** Successful resource creation
- **204 No Content:** Successful deletion

### Error Responses
- **400 Bad Request:** Invalid input data or validation errors
- **404 Not Found:** Resource not found
- **409 Conflict:** Resource conflicts (e.g., cannot delete due to dependencies)
- **500 Internal Server Error:** Server processing errors

### Pagination Format
```json
{
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

### Validation Error Format
```json
{
  "validationErrors": [
    {
      "field": "lineCode",
      "message": "Line code already exists"
    }
  ]
}
```