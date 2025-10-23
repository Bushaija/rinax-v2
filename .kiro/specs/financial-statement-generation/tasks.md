# Implementation Plan

- [-] 1. Set up core financial statement generation infrastructure



  - Create directory structure for statement generation components
  - Define TypeScript interfaces for templates, events, and statement responses
  - Set up base classes for Template Engine, Data Aggregation Engine, and Formula Engine
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 1.1 Create core interfaces and types


  - Write TypeScript interfaces for StatementTemplate, TemplateLine, EventEntry, and StatementLine
  - Define response schemas for FinancialStatementResponse and validation results
  - Create enum types for statement codes, event types, and formula operations
  - _Requirements: 1.1, 6.1, 6.2, 6.3_

- [x] 1.2 Implement Template Engine foundation


  - Create TemplateProcessor class with methods for loading and validating templates
  - Implement template loading from database with proper error handling
  - Add template caching mechanism to improve performance
  - _Requirements: 1.1, 1.2, 1.4, 7.3_

- [x] 1.3 Implement Data Aggregation Engine foundation


  - Create EventDataProcessor class for collecting and aggregating event data
  - Implement database queries for event data collection with proper joins
  - Add data source prioritization logic (execution over planning)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 1.4 Implement Formula Engine foundation



  - Create FormulaProcessor class with basic formula evaluation capabilities
  - Implement SUM and DIFF formula operations
  - Add dependency resolution for line item references
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ]* 1.5 Write unit tests for core engines
  - Create unit tests for TemplateProcessor template loading and validation
  - Write unit tests for EventDataProcessor data collection and aggregation
  - Add unit tests for FormulaProcessor formula evaluation and dependency resolution
  - _Requirements: 1.1, 2.1, 3.1_

- [x] 2. Implement statement generation API endpoint




  - Create POST /api/financial-reports/generate-statement route definition
  - Implement request validation and parameter parsing
  - Add response formatting and error handling
  - _Requirements: 1.1, 6.1, 6.2, 7.1, 7.2_

- [x] 2.1 Create route definition and validation schemas


  - Define Zod schemas for statement generation request and response
  - Create route definition with proper OpenAPI documentation
  - Add parameter validation for statement codes, periods, and facilities
  - _Requirements: 1.1, 1.4, 7.4_

- [x] 2.2 Implement main statement generation handler


  - Create generateStatement handler that orchestrates the three engines
  - Implement request processing flow from validation to response formatting
  - Add comprehensive error handling and logging
  - _Requirements: 1.1, 1.2, 7.1, 7.2, 7.3_

- [x] 2.3 Add response formatting and metadata


  - Implement StatementLine formatting with indentation and styling
  - Add statement metadata including generation time and performance metrics
  - Include validation results and warnings in response
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 8.3, 8.4_

- [ ]* 2.4 Write integration tests for API endpoint
  - Create integration tests for successful statement generation
  - Add tests for error scenarios and edge cases
  - Test all supported statement types with sample data
  - _Requirements: 1.1, 1.2, 1.3, 7.1, 7.2_

- [x] 3. Implement multi-period comparison functionality





  - Add previous period data collection logic
  - Implement variance calculations (absolute and percentage)
  - Handle missing previous period data gracefully
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 3.1 Extend EventDataProcessor for multi-period support


  - Modify event data collection to gather both current and previous periods
  - Implement period boundary logic for fiscal vs calendar years
  - Add period comparison calculations with proper null handling
  - _Requirements: 4.1, 4.2, 4.3, 4.5_

- [x] 3.2 Add variance calculation logic


  - Implement absolute and percentage variance calculations
  - Handle division by zero cases in percentage calculations
  - Add variance formatting and display logic
  - _Requirements: 4.3, 4.4_

- [x] 3.3 Update response structure for multi-period data


  - Modify StatementLine interface to include previous period values
  - Add variance information to statement line metadata
  - Update response formatting to handle period comparisons
  - _Requirements: 4.1, 4.4, 6.1, 6.2_

- [ ]* 3.4 Write tests for multi-period functionality
  - Create tests for period boundary handling and data collection
  - Add tests for variance calculations including edge cases
  - Test missing previous period data scenarios
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 4. Implement facility aggregation and filtering





  - Add facility-specific statement generation
  - Implement cross-facility aggregation logic
  - Handle missing facilities and data gracefully
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 4.1 Extend data collection for facility filtering


  - Modify EventDataProcessor to handle facility-specific queries
  - Implement aggregation logic for cross-facility data summation
  - Add facility metadata to statement responses
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 4.2 Add facility validation and error handling


  - Validate facility access permissions and existence
  - Handle cases where facilities have no data
  - Implement graceful degradation for missing facility data
  - _Requirements: 5.4, 5.5, 7.2_

- [x] 4.3 Update response structure for facility information


  - Add facility metadata to statement responses
  - Include aggregation information when multiple facilities are processed
  - Update error messages to include facility-specific information
  - _Requirements: 5.1, 5.2, 6.4_

- [ ]* 4.4 Write tests for facility aggregation
  - Create tests for single facility statement generation
  - Add tests for cross-facility aggregation logic
  - Test facility validation and error handling scenarios
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 5. Implement advanced formula processing





  - Add support for complex formulas and computed balances
  - Implement accounting equation validation
  - Add business rule validation framework
  - _Requirements: 3.1, 3.2, 3.3, 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 5.1 Extend FormulaProcessor for complex calculations


  - Add support for computed balance formulas (Assets = Liabilities + Equity)
  - Implement nested formula evaluation and dependency chains
  - Add formula validation and syntax checking
  - _Requirements: 3.2, 3.3, 3.4, 8.1, 8.2_

- [x] 5.2 Implement validation framework


  - Create ValidationEngine for accounting equation checks
  - Add business rule validation with configurable rules
  - Implement balance validation for different statement types
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 5.3 Add validation results to response structure


  - Include validation results in statement response
  - Add specific error messages and warnings for validation failures
  - Implement validation result formatting for UI display
  - _Requirements: 8.3, 8.4, 8.5, 6.3_

- [ ]* 5.4 Write tests for advanced formula processing
  - Create tests for complex formula evaluation and validation
  - Add tests for accounting equation validation across statement types
  - Test business rule validation with various scenarios
  - _Requirements: 3.1, 3.2, 3.3, 8.1, 8.2_

- [x] 6. Implement statement-specific logic for all five statement types





  - Add Revenue & Expenditure statement processing
  - Implement Balance Sheet with accounting equation validation
  - Add Cash Flow statement with flow categorization
  - Implement Net Assets Changes statement
  - Add Budget vs Actual with variance analysis
  - _Requirements: 1.2, 2.1, 2.2, 8.1, 8.2_

- [x] 6.1 Implement Revenue & Expenditure statement logic


  - Create REV_EXP template processor with revenue/expense categorization
  - Add surplus/deficit calculation logic
  - Implement revenue and expense validation rules
  - _Requirements: 1.2, 2.1, 8.5_

- [x] 6.2 Implement Balance Sheet statement logic


  - Create BAL_SHEET template processor with asset/liability/equity sections
  - Add accounting equation validation (Assets = Liabilities + Equity)
  - Implement balance sheet specific formatting and totals
  - _Requirements: 1.2, 8.1, 8.2_

- [x] 6.3 Implement Cash Flow statement logic


  - Create CASH_FLOW template processor with operating/investing/financing sections
  - Add cash flow balance validation
  - Implement cash flow specific calculations and formatting
  - _Requirements: 1.2, 8.2_

- [x] 6.4 Implement Net Assets Changes statement logic


  - Create NET_ASSETS template processor for net asset change tracking
  - Add net asset calculation and validation logic
  - Implement period-over-period net asset change analysis
  - _Requirements: 1.2, 4.1, 4.3_

- [x] 6.5 Implement Budget vs Actual statement logic


  - Create BUDGET_VS_ACTUAL template processor using both planning and execution data
  - Add variance calculation logic for budget vs actual analysis
  - Implement dual data source processing and reconciliation
  - _Requirements: 1.2, 2.1, 2.2, 4.3_

- [ ]* 6.6 Write comprehensive tests for all statement types
  - Create integration tests for each of the five statement types
  - Add tests for statement-specific validation and calculations
  - Test edge cases and error scenarios for each statement type
  - _Requirements: 1.2, 8.1, 8.2, 8.3_

- [ ] 7. Add performance optimizations and caching
  - Implement template caching to reduce database queries
  - Add event data batching for improved query performance
  - Implement response caching for frequently requested statements
  - _Requirements: 7.1, 7.5_

- [ ] 7.1 Implement template caching system
  - Add Redis-based caching for loaded templates
  - Implement cache invalidation when templates are updated
  - Add cache warming for frequently used templates
  - _Requirements: 7.1, 7.5_

- [ ] 7.2 Optimize event data queries
  - Implement batch loading for event data across multiple periods
  - Add database query optimization with proper indexing recommendations
  - Implement query result caching for repeated data requests
  - _Requirements: 7.1, 7.5_

- [ ] 7.3 Add performance monitoring and metrics
  - Implement performance tracking for statement generation
  - Add metrics for template loading, data collection, and formula processing
  - Include performance data in statement response metadata
  - _Requirements: 7.1, 6.3_

- [ ]* 7.4 Write performance tests
  - Create performance tests for large dataset processing
  - Add tests for concurrent statement generation
  - Test caching effectiveness and cache invalidation
  - _Requirements: 7.1, 7.5_

- [ ] 8. Integrate with existing financial reports system
  - Update existing financial-reports handlers to use new statement generation
  - Add backward compatibility for existing API consumers
  - Implement migration path from old to new system
  - _Requirements: 1.1, 1.5, 7.2_

- [ ] 8.1 Update financial-reports service integration
  - Modify existing generateReport method to use new statement generation engine
  - Add new generateStatement method as primary interface
  - Maintain backward compatibility with existing report generation
  - _Requirements: 1.1, 1.5_

- [ ] 8.2 Add new route to existing financial-reports router
  - Add generateStatement route to financial-reports.routes.ts
  - Update financial-reports.index.ts to include new route
  - Add proper route documentation and examples
  - _Requirements: 1.1, 6.1_

- [ ] 8.3 Update response schemas and types
  - Add new statement generation schemas to financial-reports.types.ts
  - Update existing schemas to support new statement structure
  - Ensure type compatibility across the system
  - _Requirements: 6.1, 6.2, 6.3_

- [ ]* 8.4 Write integration tests for system integration
  - Create tests for integration with existing financial reports system
  - Add tests for backward compatibility and migration scenarios
  - Test new routes and response formats
  - _Requirements: 1.1, 1.5, 7.2_