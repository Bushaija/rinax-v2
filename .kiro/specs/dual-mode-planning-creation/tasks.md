# Implementation Plan

- [x] 1. Create core file upload components





  - Create FileUploadArea component with drag-and-drop functionality
  - Implement file validation for Excel/CSV formats and size limits
  - Add visual feedback for drag states and file selection
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 1.1 Implement FileUploadArea component


  - Create component with drag-and-drop zone using HTML5 File API
  - Add file format validation (.xlsx, .xls, .csv) and size validation (10MB max)
  - Implement visual states for drag-over, drag-leave, and file-selected
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 1.2 Create TemplateDownload component


  - Implement template download functionality using /planning/template endpoint
  - Add support for both Excel and CSV format downloads
  - Handle download errors and loading states
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 1.3 Build UploadProgress component


  - Create progress indicator with percentage and stage tracking
  - Implement visual feedback for upload, parsing, validation, and saving stages
  - Add file name display and progress bar animation
  - _Requirements: 4.1_

- [x] 1.4 Develop ValidationResults component


  - Create component to display upload success/error states
  - Implement expandable error and warning lists with row numbers
  - Add action buttons for retry, view details, and navigation
  - _Requirements: 4.2, 4.3, 4.4, 4.5_

- [x] 2. Create FileUploadTab container component





  - Build main container that orchestrates file upload workflow
  - Integrate all file upload sub-components
  - Implement upload state management and error handling
  - _Requirements: 2.1, 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 2.1 Implement FileUploadTab component structure


  - Create container component with upload state management
  - Integrate FileUploadArea, TemplateDownload, UploadProgress, and ValidationResults
  - Handle file selection, upload initiation, and result processing
  - _Requirements: 2.1, 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 2.2 Add upload API integration


  - Create custom hook for file upload using /planning/upload endpoint
  - Implement Base64 file encoding for API transmission
  - Handle upload progress tracking and error states
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 2.3 Implement template download API integration


  - Create custom hook for template download using /planning/template endpoint
  - Handle template generation with facility and program type parameters
  - Implement file download with proper error handling
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
-

- [x] 3. Create PlanningCreationTabs main container





  - Build tabbed interface using existing UI components
  - Implement tab state management and context sharing
  - Handle tab switching with unsaved changes warnings
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 3.1 Implement PlanningCreationTabs component


  - Create main container using Radix UI Tabs components
  - Implement tab state management and active tab tracking
  - Add shared context provider for common props (projectId, facilityId, etc.)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 3.2 Add tab switching logic with change detection


  - Implement unsaved changes detection for manual entry tab
  - Add confirmation dialog when switching tabs with unsaved changes
  - Preserve tab state during user session
  - _Requirements: 6.3, 1.4_

- [x] 3.3 Integrate ManualEntryTab with existing EnhancedPlanningForm


  - Wrap existing EnhancedPlanningForm component in ManualEntryTab
  - Ensure all existing functionality works within tab structure
  - Maintain backward compatibility with existing props and behavior
  - _Requirements: 1.2, 6.1, 6.2, 6.4, 6.5_

- [x] 4. Update planning/new page to use tabbed interface





  - Modify existing page component to use new PlanningCreationTabs
  - Preserve all existing URL parameter handling and context
  - Maintain existing page header and navigation elements
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.2, 6.5_


- [x] 4.1 Refactor planning/new page component

  - Replace direct EnhancedPlanningForm usage with PlanningCreationTabs
  - Preserve all existing URL parameter extraction and validation
  - Maintain existing page header, breadcrumbs, and back navigation
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.2, 6.5_

- [x] 4.2 Add success handling and navigation


  - Implement success redirection to planning details page for both manual and upload modes
  - Add consistent success toast notifications
  - Handle error states with appropriate user feedback
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 5. Add TypeScript interfaces and types





  - Create comprehensive type definitions for all new components
  - Define upload request/response interfaces
  - Add validation result and error handling types
  - _Requirements: All requirements (type safety)_

- [x] 5.1 Create component prop interfaces


  - Define TypeScript interfaces for all new component props
  - Add upload state and validation result type definitions
  - Create shared context type definitions
  - _Requirements: All requirements (type safety)_

- [x] 5.2 Add API integration types


  - Define types for upload request and response payloads
  - Create template download request/response types
  - Add error handling and validation result types
  - _Requirements: 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 6. Implement error handling and user feedback

  - Add comprehensive error handling for all upload scenarios
  - Implement user-friendly error messages and recovery options
  - Add loading states and progress indicators throughout the workflow
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 6.1 Add client-side validation and error handling



  - Implement file format and size validation with user-friendly messages
  - Add network error handling with retry options
  - Handle access control errors with appropriate messaging
  - _Requirements: 2.5, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 6.2 Implement upload progress and feedback

  - Add real-time upload progress tracking
  - Implement stage-based progress indicators (upload → parse → validate → save)
  - Add loading states for all async operations
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 7. Add responsive design and accessibility features
  - Ensure all new components work on mobile and tablet devices
  - Implement keyboard navigation and screen reader support
  - Add proper ARIA labels and semantic HTML structure
  - _Requirements: 6.5 (accessibility and responsive design)_

- [ ] 7.1 Implement responsive design
  - Ensure tab interface works on mobile and tablet screens
  - Make file upload area touch-friendly for mobile devices
  - Optimize layout for different screen sizes
  - _Requirements: 6.5_

- [ ] 7.2 Add accessibility features
  - Implement keyboard navigation for tab switching and file upload
  - Add proper ARIA labels and roles for screen readers
  - Ensure color contrast meets accessibility standards
  - _Requirements: 6.5_

- [ ]* 8. Write comprehensive tests
  - Create unit tests for all new components
  - Add integration tests for tab navigation and upload workflow
  - Implement end-to-end tests for complete user scenarios
  - _Requirements: All requirements (quality assurance)_

- [ ]* 8.1 Write component unit tests
  - Test FileUploadArea drag-and-drop functionality and validation
  - Test TemplateDownload API integration and error handling
  - Test UploadProgress progress tracking and visual states
  - Test ValidationResults error display and user interactions
  - _Requirements: All requirements (quality assurance)_

- [ ]* 8.2 Add integration tests
  - Test tab switching with unsaved changes detection
  - Test complete file upload workflow from selection to success
  - Test error scenarios and recovery mechanisms
  - Test template download functionality
  - _Requirements: All requirements (quality assurance)_

- [ ]* 8.3 Implement end-to-end tests
  - Test complete user journey for manual entry mode
  - Test complete user journey for file upload mode
  - Test access control and facility restrictions
  - Test error handling and user feedback scenarios
  - _Requirements: All requirements (quality assurance)_