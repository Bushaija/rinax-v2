# Design Document

## Overview

The dual-mode planning creation feature enhances the existing `/planning/new` page by introducing a tabbed interface that allows users to choose between manual data entry and file upload. This design leverages the existing `EnhancedPlanningForm` component and the established `/planning/upload` API endpoint while maintaining consistency with the current user experience.

## Architecture

### Component Structure

```
/planning/new (Enhanced Page)
├── PlanningCreationTabs (New Container Component)
│   ├── TabsList (Manual Entry | File Upload)
│   ├── ManualEntryTab
│   │   └── EnhancedPlanningForm (Existing Component)
│   └── FileUploadTab (New Component)
│       ├── FileUploadArea (New Component)
│       ├── TemplateDownload (New Component)
│       ├── UploadProgress (New Component)
│       └── ValidationResults (New Component)
└── Shared Page Header (Existing)
```

### Data Flow

1. **Page Load**: Extract URL parameters (projectId, facilityId, program, etc.)
2. **Tab Selection**: User chooses between manual entry or file upload
3. **Manual Entry Path**: Uses existing `EnhancedPlanningForm` workflow
4. **File Upload Path**: 
   - Template download → File selection → Upload → Validation → Success/Error handling
5. **Success Handling**: Both paths redirect to planning details page

## Components and Interfaces

### 1. PlanningCreationTabs Component

**Purpose**: Main container component that manages tab state and shared context

```typescript
interface PlanningCreationTabsProps {
  projectId: number;
  facilityId: number;
  reportingPeriodId: number;
  facilityName?: string;
  program: 'HIV' | 'TB' | 'Malaria';
  facilityType: 'hospital' | 'health_center';
  projectType?: 'HIV' | 'TB' | 'Malaria';
}

interface TabState {
  activeTab: 'manual' | 'upload';
  hasUnsavedChanges: boolean;
  uploadProgress?: UploadProgress;
}
```

**Key Features**:
- Manages active tab state
- Handles tab switching with unsaved changes warning
- Provides shared context to child components
- Maintains URL parameter consistency

### 2. FileUploadTab Component

**Purpose**: Container for all file upload functionality

```typescript
interface FileUploadTabProps {
  projectId: number;
  facilityId: number;
  reportingPeriodId: number;
  projectType: 'HIV' | 'TB' | 'Malaria';
  facilityType: 'hospital' | 'health_center';
  onUploadSuccess: (planningId: number) => void;
}

interface UploadState {
  selectedFile: File | null;
  isUploading: boolean;
  uploadProgress: number;
  validationResults: ValidationResults | null;
  error: string | null;
}
```

### 3. FileUploadArea Component

**Purpose**: Drag-and-drop file selection interface

```typescript
interface FileUploadAreaProps {
  onFileSelect: (file: File) => void;
  acceptedFormats: string[];
  maxFileSize: number;
  disabled?: boolean;
}

interface FileValidation {
  isValid: boolean;
  errors: string[];
  fileInfo: {
    name: string;
    size: number;
    type: string;
  };
}
```

**Features**:
- Drag-and-drop functionality
- File format validation (.xlsx, .xls, .csv)
- File size validation (max 10MB)
- Visual feedback for drag states
- Error handling for invalid files

### 4. TemplateDownload Component

**Purpose**: Template generation and download functionality

```typescript
interface TemplateDownloadProps {
  projectType: 'HIV' | 'TB' | 'Malaria';
  facilityType: 'hospital' | 'health_center';
  disabled?: boolean;
}

interface TemplateRequest {
  projectType: string;
  facilityType: string;
  format: 'xlsx' | 'csv';
}
```

**Features**:
- Calls `/planning/template` endpoint
- Generates facility-specific templates
- Supports both Excel and CSV formats
- Handles download errors gracefully

### 5. UploadProgress Component

**Purpose**: Visual feedback during file processing

```typescript
interface UploadProgressProps {
  isUploading: boolean;
  progress: number;
  stage: 'uploading' | 'parsing' | 'validating' | 'saving';
  fileName: string;
}
```

**Features**:
- Progress bar with percentage
- Stage indicators (upload → parse → validate → save)
- File name display
- Cancellation support (if feasible)

### 6. ValidationResults Component

**Purpose**: Display upload results, errors, and warnings

```typescript
interface ValidationResultsProps {
  results: UploadResults;
  onRetry: () => void;
  onViewDetails: (planningId: number) => void;
}

interface UploadResults {
  success: boolean;
  planningId?: number;
  stats: {
    rowsParsed: number;
    validRows: number;
    invalidRows: number;
    activitiesProcessed: number;
    totalBudget: number;
    warnings: ValidationIssue[];
    errors: ValidationIssue[];
    dataQuality: DataQuality;
  };
}

interface ValidationIssue {
  id: number;
  row: number | null;
  type: 'warning' | 'error';
  message: string;
  category: string;
}
```

**Features**:
- Success/error state visualization
- Detailed statistics display
- Expandable error/warning lists
- Action buttons (retry, view details, back to list)

## Data Models

### Upload Request Model

```typescript
interface PlanningUploadRequest {
  projectId: number;
  facilityId: number;
  reportingPeriodId: number;
  projectType: 'HIV' | 'Malaria' | 'TB';
  facilityType: 'hospital' | 'health_center';
  fileName: string;
  fileData: string; // Base64 encoded
}
```

### Upload Response Model

```typescript
interface PlanningUploadResponse {
  success: boolean;
  message: string;
  planningId?: number;
  stats: UploadStats;
  record: PlanningRecord | null;
  processing: ProcessingInfo;
}
```

## Error Handling

### Client-Side Error Handling

1. **File Validation Errors**:
   - Invalid file format → Show format requirements
   - File too large → Show size limit
   - File corrupted → Show file selection error

2. **Upload Errors**:
   - Network errors → Show retry option
   - Server errors → Show error message with support contact
   - Validation errors → Show detailed error list with row numbers

3. **Access Control Errors**:
   - Facility access denied → Show permission error
   - Duplicate planning → Show existing planning link

### Server-Side Error Handling

The existing `/planning/upload` endpoint already handles:
- User authentication and authorization
- Facility access validation
- File parsing errors
- Data validation errors
- Duplicate planning detection

## Testing Strategy

### Unit Tests

1. **Component Tests**:
   - PlanningCreationTabs tab switching logic
   - FileUploadArea drag-and-drop functionality
   - ValidationResults error display
   - TemplateDownload API integration

2. **Hook Tests**:
   - File upload mutation hook
   - Template download hook
   - Upload progress tracking

### Integration Tests

1. **Tab Navigation**:
   - Switching between tabs preserves context
   - Unsaved changes warning works correctly
   - URL parameters maintained across tabs

2. **File Upload Flow**:
   - End-to-end upload process
   - Error handling scenarios
   - Success redirection

3. **Template Download**:
   - Template generation with correct parameters
   - File download functionality
   - Error handling for template failures

### User Acceptance Tests

1. **Manual Entry Compatibility**:
   - Existing manual entry workflow unchanged
   - All existing features work in new tab structure

2. **File Upload Workflow**:
   - Complete upload process from file selection to success
   - Error scenarios handled gracefully
   - Template download works for all facility/program combinations

3. **Access Control**:
   - Facility restrictions enforced consistently
   - User permissions respected in both modes

## Implementation Considerations

### Performance

1. **File Processing**:
   - Large file handling (up to 10MB)
   - Progress feedback during processing
   - Memory management for file data

2. **Component Optimization**:
   - Lazy loading of upload components
   - Memoization of expensive calculations
   - Efficient re-rendering strategies

### Accessibility

1. **Keyboard Navigation**:
   - Tab navigation between modes
   - Keyboard-accessible file upload
   - Screen reader support for progress indicators

2. **Visual Indicators**:
   - High contrast for drag-and-drop states
   - Clear error messaging
   - Progress indicators with text alternatives

### Browser Compatibility

1. **File API Support**:
   - Modern browsers with File API
   - Graceful degradation for older browsers
   - Drag-and-drop polyfills if needed

2. **Upload Limitations**:
   - Browser file size limits
   - Network timeout handling
   - Connection interruption recovery

### Security Considerations

1. **File Validation**:
   - Client-side format validation
   - Server-side content validation
   - Malicious file detection

2. **Data Handling**:
   - Secure file transmission (Base64 encoding)
   - Temporary file cleanup
   - User data privacy

## Migration Strategy

### Phase 1: Core Implementation
- Create new tab structure
- Implement file upload components
- Integrate with existing API

### Phase 2: Enhancement
- Add advanced validation feedback
- Implement template customization
- Add upload history tracking

### Phase 3: Optimization
- Performance improvements
- Advanced error recovery
- User experience enhancements

The design maintains backward compatibility with existing functionality while providing a seamless path for users to adopt the new file upload capability.