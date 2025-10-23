# Implementation Plan

- [x] 1. Create compiled execution route definition and types





  - Define OpenAPI route specification for GET /execution/compiled endpoint
  - Create TypeScript interfaces for request query parameters and response structure
  - Add Zod schemas for validation of query parameters and response data
  - _Requirements: 1.1, 2.1, 2.2, 2.3, 2.4, 6.2, 6.3_

- [x] 2. Implement core aggregation service functions
  - [x] 2.1 Create value extraction utilities


    - Write function to extract quarterly values from execution form data
    - Implement activity code matching logic for consistent data retrieval
    - Add handling for missing or malformed activity data
    - _Requirements: 1.2, 1.5, 3.4_

  - [x] 2.2 Build aggregation engine

    - Implement function to sum quarterly values across multiple facilities
    - Create logic to aggregate data by activity code while maintaining facility breakdown
    - Add computed value calculations (C=A-B, F=D-E) for aggregated data
    - _Requirements: 1.2, 4.1, 4.2, 4.3_

  - [x] 2.3 Create hierarchical structure builder

    - Implement function to organize activities into sections A-G with subcategories
    - Add logic to maintain display order and hierarchy levels
    - Create section and subcategory total calculations
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Implement compiled execution handler





  - [x] 3.1 Add query parameter validation and filtering


    - Validate project type, facility type, and reporting period parameters
    - Build database query conditions based on provided filters
    - Implement default values and optional parameter handling
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.4_

  - [x] 3.2 Create database query logic

    - Write optimized query to fetch execution data with facility and project joins
    - Implement activity catalog loading with proper filtering
    - Add error handling for database connection and query failures
    - _Requirements: 1.1, 5.1, 5.2, 5.3_

  - [x] 3.3 Build response formatting

    - Structure aggregated data into facilities-as-columns format
    - Create activity rows with proper hierarchy and computed value indicators
    - Add metadata about filters, facility count, and aggregation parameters
    - _Requirements: 6.1, 6.2, 6.4, 6.5_

- [x] 4. Add compiled route to execution router




  - Register the new compiled endpoint in the execution router
  - Ensure proper route ordering and middleware application
  - Add route to OpenAPI documentation generation
  - _Requirements: 5.2, 5.3_

- [x] 5. Implement error handling and edge cases
  - [x] 5.1 Add comprehensive error handling
    - Handle cases where no execution data exists for given filters
    - Implement proper HTTP status codes for different error scenarios
    - Add logging for system errors and performance monitoring
    - _Requirements: 5.2, 5.3, 5.5_

  - [x] 5.2 Handle data inconsistencies
    - Manage facilities with missing activities by treating as zero values
    - Handle different activity catalog versions across facilities
    - Add validation for unbalanced financial data while still including in aggregation
    - _Requirements: 1.5, 4.4_
- [x] 6. Add PDF/DOCX export functionality
  - [x] 6.1 Create export route definition
    - Define OpenAPI route specification for GET /execution/compiled/export endpoint
    - Add query parameters for format selection (pdf/docx) and filename customization
    - Create proper response schemas for binary file downloads
    - _Requirements: 6.1, 6.2_

  - [x] 6.2 Implement PDF generation
    - Install and configure pdfkit library for PDF generation
    - Create generatePDFReport function with proper document structure
    - Include report metadata, facilities list, activities table, and section summaries
    - Handle multi-page documents and table overflow gracefully
    - _Requirements: 6.3, 6.4_

  - [x] 6.3 Implement DOCX generation
    - Install and configure docx library for Word document generation
    - Create generateDOCXReport function with structured document layout
    - Include proper table formatting and rich text elements
    - Optimize for document size and readability
    - _Requirements: 6.3, 6.4_

  - [x] 6.4 Add export handler implementation
    - Create compiledExport handler that reuses compiled data logic
    - Implement proper binary response handling with correct headers
    - Add comprehensive error handling for generation failures
    - Support both PDF and DOCX format selection
    - _Requirements: 6.1, 6.2, 6.5_

  - [x] 6.5 Create tests and documentation
    - Write unit tests for PDF and DOCX generation functions
    - Test error handling and edge cases (empty data, invalid formats)
    - Create comprehensive documentation with usage examples
    - Verify file format integrity and download functionality
    - _Requirements: 6.5_

- [x] 7. Create frontend fetchers and hooks for compiled execution endpoints
  - [x] 7.1 Create fetcher for compiled execution data
    - Create get-compiled-execution.ts fetcher in apps/client/fetchers/execution/
    - Implement type-safe query parameter handling using compiledExecutionQuerySchema
    - Add proper error handling and response type inference
    - _Requirements: 6.1, 6.2_

  - [x] 7.2 Create custom hook for compiled execution data
    - Create use-get-compiled-execution.ts hook in apps/client/hooks/queries/executions/
    - Implement React Query integration with proper cache keys
    - Add loading, error, and success states
    - Support query parameter reactivity for filter changes
    - _Requirements: 6.1, 6.2_

  - [x] 7.3 Create fetcher for compiled execution export
    - Create export-compiled-execution.ts fetcher in apps/client/fetchers/execution/
    - Implement binary file download handling for PDF/DOCX formats
    - Add proper content-type and filename handling
    - _Requirements: 6.1, 6.3_

  - [x] 7.4 Create custom hook for compiled execution export
    - Create use-export-compiled-execution.ts hook in apps/client/hooks/mutations/executions/
    - Implement mutation hook for triggering exports
    - Add download progress tracking and error handling
    - Support format selection (PDF/DOCX) and filename customization
    - _Requirements: 6.1, 6.3_