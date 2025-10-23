/**
 * Planning Types Index
 * Central export point for all planning-related TypeScript types and interfaces
 */

// Component types
export * from './component-types';

// API types  
export * from './api-types';

// Re-export commonly used types for convenience
export type {
  // Core component props
  PlanningCreationTabsProps,
  FileUploadTabProps,
  FileUploadAreaProps,
  TemplateDownloadProps,
  UploadProgressProps,
  ValidationResultsProps,
  ManualEntryTabProps,

  // State management
  TabState,
  UploadState,
  TabMode,
  UploadStage,

  // API integration
  UploadPlanningRequest,
  UploadPlanningResponse,
  DownloadTemplateRequest,
  UploadMutationResult,
  DownloadMutationResult,

  // Validation and results
  ValidationIssue,
  DataQuality,
  UploadStats,
  UploadResults,
  FileValidation,

  // Error handling
  ApiError,
  ValidationError,
  UploadError,
  NetworkError,
  AccessError,

  // Utility types
  ProjectType,
  FacilityType,
  FileFormat,
  ApprovalStatus,
} from './component-types';

export type {
  // Additional API types
  ProcessingInfo,
  PlanningRecord,
  TemplateMetadata,
  FileProcessingResult,
  ProgressEvent,
  ProgressTracker,
  ApiResponse,
  PaginatedResponse,
} from './api-types';

// Re-export constants
export {
  DEFAULT_ACCEPTED_FORMATS,
  DEFAULT_MAX_FILE_SIZE,
  STAGE_ORDER,
  API_ENDPOINTS,
  FILE_CONSTRAINTS,
  UPLOAD_STAGES,
  ERROR_CODES,
} from './component-types';

// Re-export type guards
export {
  isValidTabMode,
  isValidUploadStage,
  hasValidationIssues,
  isUploadSuccessful,
  isApiError,
  isValidationError,
  isUploadError,
  isNetworkError,
  isAccessError,
  isProjectType,
  isFacilityType,
  isFileFormat,
  isApprovalStatus,
} from './component-types';