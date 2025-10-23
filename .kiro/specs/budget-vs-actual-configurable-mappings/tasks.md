# Implementation Plan

- [ ] 1. Create database schema and migration for configurable event mappings

  - Create migration file for configurable_event_mappings table
  - Add proper indexes for efficient lookups
  - Add foreign key constraints to events table
  - Create initial seed data for TRANSFERS_PUBLIC line mapping
  - _Requirements: 1.1, 2.1, 2.2_

- [ ] 2. Implement ConfigurableEventMappingService
- [ ] 2.1 Create service interface and basic CRUD operations
  - Define ConfigurableEventMapping interface
  - Implement getMappingsForStatement method
  - Implement getMappingForLine method for specific lookups
  - Add validation for event codes and statement codes
  - _Requirements: 2.1, 2.2, 3.3_

- [ ] 2.2 Add date range and activation status handling
  - Implement effective date filtering logic
  - Add methods for activating/deactivating mappings
  - Create validation for date ranges and uniqueness constraints
  - _Requirements: 2.2, 3.3_

- [ ]* 2.3 Write unit tests for ConfigurableEventMappingService
  - Test CRUD operations with valid and invalid data
  - Test date range filtering and activation status
  - Test validation rules and error handling
  - _Requirements: 2.1, 2.2, 3.3_

- [ ] 3. Create BudgetVsActualProcessor for specialized logic
- [ ] 3.1 Implement event code resolution logic
  - Create processLine method to resolve budget vs actual event codes
  - Implement fallback logic when configurable mappings are missing
  - Add logging for mapping resolution decisions
  - _Requirements: 1.1, 1.2, 2.3, 3.1_

- [ ] 3.2 Add data collection methods for budget vs actual
  - Implement collectBudgetVsActualData method
  - Separate data collection for budget (planning) and actual (execution) events
  - Handle cases where budget or actual data is missing
  - _Requirements: 1.1, 1.3, 3.1_

- [ ]* 3.3 Write unit tests for BudgetVsActualProcessor
  - Test event code resolution with various mapping scenarios
  - Test data collection for budget and actual events
  - Test fallback behavior and error handling
  - _Requirements: 1.1, 1.2, 1.3, 2.3, 3.1_

- [ ] 4. Enhance TemplateEngine to support configurable mappings
- [ ] 4.1 Extend template loading to include configurable mappings
  - Modify loadTemplate method to accept configurable mappings
  - Create EnhancedTemplateLine interface with budget/actual event mappings
  - Implement logic to merge template defaults with configurable mappings
  - _Requirements: 2.1, 2.2, 3.1_

- [ ] 4.2 Add template line enhancement logic
  - Create method to enhance template lines with configurable mappings
  - Add flags to indicate which lines have configurable mappings
  - Maintain backward compatibility with existing template structure
  - _Requirements: 2.2, 3.1, 3.2_

- [ ]* 4.3 Write unit tests for enhanced TemplateEngine
  - Test template loading with and without configurable mappings
  - Test template line enhancement logic
  - Test backward compatibility with existing templates
  - _Requirements: 2.1, 2.2, 3.1, 3.2_

- [ ] 5. Update financial reports handler for budget vs actual processing
- [ ] 5.1 Modify generateStatement handler to use configurable mappings
  - Add logic to detect BUDGET_VS_ACTUAL statement type
  - Integrate ConfigurableEventMappingService into statement generation
  - Update data collection to use BudgetVsActualProcessor
  - _Requirements: 1.1, 1.2, 1.3, 3.1_

- [ ] 5.2 Implement separate budget and actual data processing
  - Modify event data collection to handle separate budget/actual event codes
  - Update statement line generation to use correct amounts per column
  - Ensure variance calculation uses Budget - Actual formula
  - _Requirements: 1.1, 1.3, 4.1, 4.2, 4.3, 4.4_

- [ ] 5.3 Add error handling and fallback logic
  - Implement graceful fallback when configurable mappings fail
  - Add appropriate logging for mapping resolution and data collection
  - Ensure non-budget-vs-actual statements continue working unchanged
  - _Requirements: 2.3, 3.1, 3.2, 3.3_

- [ ]* 5.4 Write integration tests for budget vs actual statement generation
  - Test end-to-end statement generation with configurable mappings
  - Test fallback behavior when mappings are missing or invalid
  - Test that other statement types remain unaffected
  - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.2, 3.3_

- [ ] 6. Create API endpoints for managing configurable mappings
- [ ] 6.1 Implement CRUD endpoints for configurable mappings
  - Create GET /api/configurable-mappings endpoint with filtering
  - Implement POST endpoint for creating new mappings
  - Add PUT endpoint for updating existing mappings
  - Create DELETE endpoint for deactivating mappings
  - _Requirements: 2.1, 2.2_

- [ ] 6.2 Add validation and error handling to API endpoints
  - Validate event codes exist in events table
  - Validate statement codes and line codes
  - Add proper HTTP status codes and error messages
  - Implement request/response schemas
  - _Requirements: 2.1, 2.2, 3.3_

- [ ]* 6.3 Write API endpoint tests
  - Test CRUD operations with valid and invalid data
  - Test filtering and query parameters
  - Test error handling and validation
  - _Requirements: 2.1, 2.2, 3.3_

- [ ] 7. Update budget vs actual template with initial configuration
- [ ] 7.1 Seed initial configurable mapping for TRANSFERS_PUBLIC line
  - Create seed data for TRANSFERS_PUBLIC budget mapping to GOODS_SERVICES_PLANNING
  - Create seed data for TRANSFERS_PUBLIC actual mapping to TRANSFERS_PUBLIC_ENTITIES
  - Add metadata explaining the business reason for these mappings
  - _Requirements: 1.1, 1.2_

- [ ] 7.2 Verify template integration with new mappings
  - Test that TRANSFERS_PUBLIC line uses correct event codes per column
  - Verify amounts are calculated correctly from respective event codes
  - Ensure variance calculation shows Budget - Actual correctly
  - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.2, 4.3, 4.4_

- [ ]* 7.3 Write end-to-end tests for the specific RBC use case
  - Test budget vs actual statement with TRANSFERS_PUBLIC line
  - Verify budget column shows GOODS_SERVICES_PLANNING amounts
  - Verify actual column shows TRANSFERS_PUBLIC_ENTITIES amounts
  - Test variance calculation and display
  - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.2, 4.3, 4.4_

- [ ] 8. Documentation and deployment preparation
- [ ] 8.1 Create database migration scripts
  - Write up migration for configurable_event_mappings table
  - Create rollback migration if needed
  - Add migration to deployment pipeline
  - _Requirements: 2.1_

- [ ] 8.2 Update API documentation
  - Document new configurable mappings endpoints
  - Update budget vs actual statement generation documentation
  - Add examples showing the RBC use case
  - _Requirements: 2.1, 2.2_