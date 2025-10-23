# Requirements Document

## Introduction

This feature enables configurable event mappings for Budget vs Actual financial statements, allowing different event codes to be used for budget columns versus actual columns within the same line item. This addresses the specific need where RBC (Rwanda Biomedical Centre) wants to compare their total budgeted program activities (from planning module) against actual transfers received from public entities.

## Requirements

### Requirement 1

**User Story:** As a financial analyst at RBC, I want to configure budget vs actual statements so that the budget column shows planned program activities while the actual column shows transfers received, so that I can compare budgeted allocations against actual funding received.

#### Acceptance Criteria

1. WHEN generating a budget vs actual statement THEN the system SHALL allow different event codes for budget and actual columns on the same line item
2. WHEN configuring the "Transfers from public entities" line THEN the system SHALL use GOODS_SERVICES_PLANNING for the budget column AND TRANSFERS_PUBLIC_ENTITIES for the actual column
3. WHEN displaying the statement THEN the system SHALL show the correct amounts from each respective event code in their designated columns

### Requirement 2

**User Story:** As a system administrator, I want to configure event mappings for budget vs actual statements through a flexible mapping system, so that I can customize which events are used for budget versus actual columns without code changes.

#### Acceptance Criteria

1. WHEN configuring budget vs actual mappings THEN the system SHALL support specifying separate event codes for budget and actual columns
2. WHEN a line item has configurable mappings THEN the system SHALL prioritize the configured mappings over default template mappings
3. WHEN no configurable mapping exists THEN the system SHALL fall back to the default template event codes for both columns

### Requirement 3

**User Story:** As a developer, I want the configurable mapping system to integrate seamlessly with existing statement generation logic, so that budget vs actual statements work correctly without breaking other statement types.

#### Acceptance Criteria

1. WHEN generating non-budget-vs-actual statements THEN the system SHALL continue using existing event mapping logic unchanged
2. WHEN generating budget vs actual statements THEN the system SHALL apply configurable mappings only to that statement type
3. WHEN configurable mappings are missing or invalid THEN the system SHALL gracefully fall back to default behavior and log appropriate warnings

### Requirement 4

**User Story:** As a financial analyst, I want to see clear variance calculations between budget and actual amounts, so that I can quickly identify discrepancies between planned and actual funding.

#### Acceptance Criteria

1. WHEN displaying budget vs actual statements THEN the system SHALL calculate variance as (Budget - Actual)
2. WHEN variance is positive THEN the system SHALL indicate under-spending or under-receipt of funds
3. WHEN variance is negative THEN the system SHALL indicate over-spending or over-receipt of funds
4. WHEN either budget or actual amount is zero THEN the system SHALL still display the variance calculation