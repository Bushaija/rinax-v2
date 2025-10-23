# Database Entities Documentation

## Core Entities

### enhancedUsers
**Purpose:** Manages system users with enhanced permissions and access control.

**Key Fields:**
- `id` - Primary key
- `name`, `email` - User identity
- `role` - User role (accountant, admin, program_manager)
- `facilityId` - Associated facility
- `permissions` - Granular permission settings (JSON)
- `projectAccess` - Project-specific access rights (JSON)
- `configAccess` - Configuration management permissions (JSON)
- `isActive` - Account status flag

**Relations:** Links to facilities, accounts, sessions, projects, and various created/updated records.

---

### enhancedProjects
**Purpose:** Represents health program projects with enhanced metadata support.

**Key Fields:**
- `id` - Primary key
- `name`, `code` - Project identification
- `projectType` - Program type (HIV, Malaria, TB)
- `facilityId`, `reportingPeriodId`, `userId` - Related entities
- `metadata` - Project-specific configurations (JSON)
- `status` - Project status (default: ACTIVE)

**Relations:** Connected to facilities, reporting periods, users, form schemas, and financial reports.

---

## Schema-Driven Configuration

### formSchemas
**Purpose:** Defines dynamic form structures for different modules and contexts.

**Key Fields:**
- `id` - Primary key
- `name`, `version` - Schema identification
- `projectType`, `facilityType` - Context specificity
- `moduleType` - Target module (planning, execution, reporting)
- `schema` - Complete form definition (JSON)
- `isActive` - Schema status
- `createdBy` - Creator reference

**Relations:** Links to users (creator), form fields, and form data entries.

---

### formFields
**Purpose:** Individual field definitions within form schemas.

**Key Fields:**
- `id` - Primary key
- `schemaId` - Parent schema reference
- `fieldKey`, `label` - Field identification
- `fieldType` - Field type (text, number, currency, etc.)
- `parentFieldId` - Hierarchical field structure
- `categoryId` - Activity category association
- `fieldConfig` - Type-specific settings (JSON)
- `validationRules` - Field validation rules (JSON)
- `computationFormula` - Calculated field formula
- `isVisible`, `isEditable` - Field behavior flags

**Relations:** Links to schemas, parent fields, and activity categories.

---

### schemaActivityCategories
**Purpose:** Hierarchical categorization system for activities and form fields.

**Key Fields:**
- `id` - Primary key
- `projectType`, `facilityType` - Context specificity
- `code`, `name` - Category identification
- `parentCategoryId` - Hierarchical structure
- `isComputed` - Calculated category flag
- `computationFormula` - Calculation logic
- `displayOrder` - Ordering within parent
- `metadata` - Category-specific settings (JSON)

**Relations:** Self-referencing hierarchy, links to activities and form fields.

---

### dynamicActivities
**Purpose:** Configurable activities within categories.

**Key Fields:**
- `id` - Primary key
- `categoryId` - Parent category
- `projectType`, `facilityType` - Context specificity
- `code`, `name` - Activity identification
- `activityType` - Activity classification
- `isTotalRow`, `isAnnualOnly` - Special behavior flags
- `fieldMappings` - Form field associations (JSON)
- `computationRules` - Calculation logic (JSON)
- `validationRules` - Activity validation (JSON)

**Relations:** Links to categories and event mappings.

---

## Event and Statement Management

### configurableEventMappings
**Purpose:** Maps events to activities/categories with configurable transformation rules.

**Key Fields:**
- `id` - Primary key
- `eventId` - Source event reference
- `activityId`, `categoryId` - Target mapping
- `mappingType` - Transformation type (DIRECT, COMPUTED, AGGREGATED)
- `mappingFormula` - Custom transformation logic
- `mappingRatio` - Proportional mapping factor
- `effectiveFrom`, `effectiveTo` - Temporal validity
- `isActive` - Mapping status

**Relations:** Links to events, activities, and categories.

---

### enhancedStatementTemplates
**Purpose:** Hierarchical financial statement line item templates.

**Key Fields:**
- `id` - Primary key
- `statementCode`, `statementName` - Statement identification
- `lineItem`, `lineCode` - Line item details
- `parentLineId` - Hierarchical structure
- `level`, `displayOrder` - Template organization
- `isTotalLine`, `isSubtotalLine` - Line type flags
- `eventMappings` - Event associations (JSON)
- `calculationFormula` - Line calculation logic
- `displayConditions` - Conditional visibility (JSON)
- `formatRules` - Value formatting (JSON)

**Relations:** Self-referencing hierarchy for statement structure.

---

## Data Storage and Reporting

### schemaFormDataEntries
**Purpose:** Stores form data entries using schema-driven structure.

**Key Fields:**
- `id` - Primary key
- `schemaId` - Form schema reference
- `entityId`, `entityType` - Data entity identification
- `projectId`, `facilityId`, `reportingPeriodId` - Context
- `formData` - All form field values (JSON)
- `computedValues` - Auto-calculated values (JSON)
- `validationState` - Validation results (JSON)
- `metadata` - Entry-specific data (JSON)

**Relations:** Links to schemas, projects, facilities, reporting periods, and users.

---

### enhancedFinancialReports
**Purpose:** Generated financial reports with audit trail.

**Key Fields:**
- `id` - Primary key
- `reportCode`, `title` - Report identification
- `projectId`, `facilityId`, `reportingPeriodId` - Context
- `fiscalYear`, `version` - Report versioning
- `status` - Report status (draft, submitted, approved, rejected)
- `reportData` - Complete report data (JSON)
- `computedTotals` - Auto-calculated totals (JSON)
- `validationResults` - Report validation status (JSON)
- `createdBy`, `updatedBy`, `submittedBy`, `approvedBy` - Audit trail

**Relations:** Links to projects, facilities, reporting periods, and users (multiple roles).

---

## System Configuration

### systemConfigurations
**Purpose:** Global and scoped system configuration settings.

**Key Fields:**
- `id` - Primary key
- `configKey` - Configuration identifier
- `configValue` - Configuration data (JSON)
- `configType` - Configuration category
- `scope` - Configuration scope (GLOBAL, PROJECT, FACILITY)
- `scopeId` - Scope-specific identifier
- `isActive` - Configuration status

**Relations:** Can reference projects or facilities for scoped configurations.

---

### configurationAuditLog
**Purpose:** Audit trail for configuration changes.

**Key Fields:**
- `id` - Primary key
- `tableName`, `recordId` - Changed record identification
- `operation` - Change type (CREATE, UPDATE, DELETE)
- `oldValues`, `newValues` - Change details (JSON)
- `changedBy` - User who made the change
- `changeReason` - Change justification
- `changedAt` - Change timestamp

**Relations:** Links to users for change tracking.

---

## Legacy Reference Tables

### facilities
**Purpose:** Health facilities (hospitals, health centers).

**Key Fields:**
- `id` - Primary key
- `name` - Facility name
- `facilityType` - Type (hospital, health_center)
- `districtId` - Geographic location

### reportingPeriods
**Purpose:** Time periods for reporting cycles.

**Key Fields:**
- `id` - Primary key
- `year` - Reporting year
- `periodType` - Period classification (ANNUAL)
- `startDate`, `endDate` - Period boundaries
- `status` - Period status

### events
**Purpose:** Financial event definitions for mapping.

**Key Fields:**
- `id` - Primary key
- `noteNumber`, `code` - Event identification
- `description` - Event description
- `eventType` - Event classification (REVENUE, EXPENSE, etc.)
- `statementCodes` - Associated statements (array)
- `isCurrent` - Active status

### districts, provinces
**Purpose:** Geographic hierarchy for facility organization.

**Key Fields:**
- Standard geographic identifiers with hierarchical relationships

### account, session, verification
**Purpose:** Authentication and session management.

**Key Fields:**
- Standard authentication fields for user access control