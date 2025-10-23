# Design Document

## Overview

This design addresses the validation service robustness issues by implementing defensive programming practices and comprehensive error handling. The core problem is that the `applyCustomValidations` method assumes `validationRules` is always an iterable array, but it can be undefined, null, or a different data type, causing runtime errors.

The solution involves adding type guards, error boundaries, and comprehensive logging while maintaining backward compatibility with existing validation logic.

## Architecture

### Current Architecture Issues
- No type checking for `validationRules` before iteration
- Lack of error boundaries around validation processing
- Insufficient logging for debugging validation failures
- No graceful degradation when validation rules are malformed

### Proposed Architecture Improvements
- **Defensive Type Checking**: Add runtime type validation for all validation rule properties
- **Error Boundaries**: Wrap validation operations in try-catch blocks with meaningful error messages
- **Logging Layer**: Implement structured logging for validation operations
- **Graceful Degradation**: Continue processing when individual validation rules fail

## Components and Interfaces

### Enhanced ValidationService Class

#### Modified Methods

**`applyCustomValidations(field, value, allData)`**
- Add type guards for `validationRules` property
- Implement error boundaries for individual rule processing
- Add structured logging for debugging
- Return partial results when some rules fail

**`validateFormData(schemaId, data, context)`**
- Add error boundary around the entire validation process
- Implement fallback behavior for schema loading failures
- Add request context to error logging

#### New Helper Methods

**`sanitizeValidationRules(rules: unknown): ValidationRule[]`**
- Validates and sanitizes validation rules input
- Converts various input formats to standard array format
- Filters out invalid rules with logging

**`logValidationError(context: ValidationErrorContext): void`**
- Structured logging for validation errors
- Includes field information, rule details, and request context

### Data Models

#### ValidationRule Interface
```typescript
interface ValidationRule {
  type: 'custom' | 'required' | 'format';
  formula?: string;
  message?: string;
  enabled?: boolean;
}
```

#### ValidationErrorContext Interface
```typescript
interface ValidationErrorContext {
  fieldKey: string;
  fieldLabel: string;
  ruleType: string;
  error: Error;
  requestId?: string;
  schemaId?: number;
}
```

#### Enhanced ValidationResult Interface
```typescript
interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  processedRules: number;
  skippedRules: number;
}
```

## Error Handling

### Error Categories
1. **Type Errors**: When validation rules are not in expected format
2. **Formula Errors**: When custom validation formulas fail to execute
3. **Schema Errors**: When form schema is malformed or missing
4. **Runtime Errors**: Unexpected errors during validation processing

### Error Handling Strategy
- **Graceful Degradation**: Continue processing when individual rules fail
- **Structured Logging**: Log all errors with context for debugging
- **User-Friendly Messages**: Return meaningful error messages to users
- **Developer Information**: Include technical details in logs for debugging

### Error Response Format
```typescript
{
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    code: string;
    severity: 'error' | 'warning';
  }>;
  metadata: {
    processedRules: number;
    skippedRules: number;
    processingTime: number;
  }
}
```

## Testing Strategy

### Unit Tests
- Test type guard functions with various input types
- Test error boundary behavior with malformed data
- Test logging functionality with different error scenarios
- Test backward compatibility with existing validation rules

### Integration Tests
- Test end-to-end validation with malformed schema data
- Test validation service with various HTTP request scenarios
- Test performance impact of additional error checking

### Error Scenario Tests
- Test with `validationRules` as undefined, null, string, object, and array
- Test with malformed validation rule objects
- Test with invalid formula syntax in custom rules
- Test with missing schema or field data

### Performance Tests
- Measure impact of additional type checking on validation performance
- Test with large datasets containing mixed validation rule formats
- Verify memory usage doesn't increase significantly with error handling