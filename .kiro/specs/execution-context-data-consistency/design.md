# Design Document

## Overview

This design addresses the execution data context consistency issue by implementing a robust context resolution strategy that prioritizes database records over potentially incorrect form data context. The solution ensures that activity catalogs are loaded based on the actual project and facility type from the database, while maintaining backward compatibility and providing proper error handling.

## Architecture

### Current Problem
The current implementation uses form data context as the primary source for determining project and facility types:
```typescript
const contextProjectType = formData?.context?.projectType || (data as any)?.project?.projectType;
const contextFacilityType = formData?.context?.facilityType || (data as any)?.facility?.facilityType;
```

This approach fails when form data context is incorrect or outdated, leading to mismatched activity catalogs.

### Proposed Solution
Implement a context resolution hierarchy that prioritizes database records and includes validation and correction mechanisms.

## Components and Interfaces

### 1. Context Resolution Service

**Purpose**: Determine the correct project and facility type for execution records

**Interface**:
```typescript
interface ExecutionContext {
  projectType: string;
  facilityType: string;
  source: 'database' | 'form_data' | 'inferred';
  corrected: boolean;
}

interface ContextResolutionResult {
  context: ExecutionContext;
  warnings: string[];
}
```

**Resolution Logic**:
1. **Primary**: Use database project.projectType and facility.facilityType
2. **Secondary**: Use form data context if database values are missing
3. **Validation**: Check if form data context matches database values
4. **Correction**: Update context in response if mismatch detected

### 2. Activity Code Validation

**Purpose**: Ensure stored activities match the resolved context

**Interface**:
```typescript
interface ActivityValidationResult {
  isValid: boolean;
  expectedPrefix: string;
  actualPrefixes: string[];
  mismatches: string[];
}
```

**Validation Logic**:
- Extract prefixes from stored activity codes
- Compare against expected prefix pattern: `{PROJECT}_{MODULE}_{FACILITY}`
- Report mismatches for logging and potential data correction

### 3. Enhanced UI Builder

**Purpose**: Build UI response with corrected context and proper error handling

**Modifications**:
- Use resolved context instead of raw form data context
- Include context correction information in response
- Add validation warnings to response metadata

## Data Models

### Enhanced Response Structure
```typescript
interface ExecutionDetailsResponse {
  entry: ExecutionEntry;
  ui: {
    id: number;
    context: {
      quarter: string;
      projectType: string;
      facilityType: string;
      corrected?: boolean;
      source?: string;
    };
    // ... existing UI structure
  };
  metadata?: {
    contextWarnings?: string[];
    validationResults?: ActivityValidationResult;
  };
}
```

## Error Handling

### Context Mismatch Scenarios

1. **Form Data Context Missing**
   - Fallback to database values
   - Log info message
   - Mark context as sourced from database

2. **Form Data Context Conflicts with Database**
   - Use database values
   - Log warning with details
   - Mark context as corrected
   - Include warning in response metadata

3. **Activity Code Mismatches**
   - Log validation results
   - Continue with database context
   - Include validation warnings in response

### Error Response Strategy
- Never fail the request due to context issues
- Always provide best-effort response
- Include diagnostic information for debugging
- Log all context resolution decisions

## Testing Strategy

### Unit Tests
- Context resolution logic with various input combinations
- Activity code validation with different mismatch scenarios
- UI building with corrected context

### Integration Tests
- End-to-end execution retrieval with context mismatches
- Database fallback scenarios
- Response structure validation

### Test Cases
1. **Happy Path**: Form data context matches database
2. **Missing Context**: Form data context is null/undefined
3. **Conflicting Context**: Form data shows HIV but database shows Malaria
4. **Activity Mismatch**: Stored activities don't match resolved context
5. **Partial Context**: Only project type or facility type available

## Implementation Approach

### Phase 1: Context Resolution
1. Create context resolution utility function
2. Implement validation logic
3. Add comprehensive logging

### Phase 2: Handler Integration
1. Integrate context resolution into getOne handler
2. Update UI building logic
3. Add response metadata

### Phase 3: Validation and Monitoring
1. Add activity code validation
2. Implement monitoring for context mismatches
3. Create data quality reports