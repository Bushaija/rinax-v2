# Design Document

## Overview

This design outlines the approach for removing unnecessary console.log statements from three API modules (planning, execution, and financial-reports) to improve API response performance. The solution will systematically identify and remove all console.log statements while preserving code functionality and readability.

## Architecture

### Affected Modules

1. **Planning Module** (`apps/server/src/api/routes/planning/`)
   - planning.handlers.ts (3 console.log statements)

2. **Execution Module** (`apps/server/src/api/routes/execution/`)
   - execution.handlers.ts (21 console.log statements)
   - execution.recalculations.ts (1 console.log statement)

3. **Financial Reports Module** (`apps/server/src/api/routes/financial-reports/`)
   - financial-reports.handlers.ts (50+ console.log statements)

### Removal Strategy

The removal will be performed using precise string replacement to:
- Remove single-line console.log statements
- Remove multi-line console.log statements (common in financial-reports.handlers.ts)
- Clean up any resulting empty lines or formatting issues
- Preserve all surrounding code logic

## Components and Interfaces

### File Processing Approach

Each file will be processed individually with the following pattern:

1. **Identify console.log patterns:**
   - Single line: `console.log('message');`
   - Single line with data: `console.log('message', data);`
   - Multi-line: `console.log('message', { ... });`
   - Template literals: `console.log(\`message ${variable}\`);`

2. **Remove statements:**
   - Use strReplace tool to remove each console.log statement
   - Include sufficient context (2-3 lines before/after) for unique identification
   - Handle multi-line statements by including the complete statement

3. **Verify removal:**
   - Use getDiagnostics to check for syntax errors
   - Ensure TypeScript compilation succeeds

## Data Models

No data model changes are required. This is a code cleanup operation that does not affect:
- Database schemas
- API request/response formats
- Type definitions
- Business logic

## Error Handling

### Potential Issues

1. **Syntax Errors After Removal**
   - Risk: Removing console.log might leave orphaned code
   - Mitigation: Use getDiagnostics after each file modification
   - Recovery: Review and fix any syntax errors immediately

2. **Multi-line Statement Handling**
   - Risk: Incomplete removal of multi-line console.log statements
   - Mitigation: Include complete statement in oldStr parameter
   - Recovery: Re-run removal with corrected context

3. **Unique Identification**
   - Risk: Multiple identical console.log statements
   - Mitigation: Include unique surrounding context for each removal
   - Recovery: Add more context lines to make each removal unique

## Testing Strategy

### Validation Steps

1. **Syntax Validation**
   - Run getDiagnostics on each modified file
   - Ensure zero TypeScript compilation errors

2. **Code Review**
   - Verify that no functional code was accidentally removed
   - Check that all console.log statements are removed
   - Confirm code readability is maintained

3. **Search Verification**
   - Run grepSearch after all removals to confirm no console.log statements remain
   - Target each module directory separately

### Success Criteria

- All console.log statements removed from target files
- Zero TypeScript compilation errors
- No functional code removed
- Code remains readable and well-formatted

## Implementation Order

The implementation will proceed in this order to minimize risk:

1. **Planning Module** (smallest, 3 logs)
   - planning.handlers.ts

2. **Execution Module** (medium, 22 logs)
   - execution.recalculations.ts (1 log)
   - execution.handlers.ts (21 logs)

3. **Financial Reports Module** (largest, 50+ logs)
   - financial-reports.handlers.ts (all logs)

This order allows us to:
- Start with the simplest case
- Build confidence with the approach
- Handle the most complex file last
- Validate the process incrementally
