# Task 7 Implementation Summary: Update Statement Display Formatting

## Overview

This document summarizes the implementation of Task 7 from the cash flow working capital changes specification, which focuses on ensuring proper display formatting for working capital lines in financial statements.

## Requirements Addressed

- **Requirement 8.1:** Negative adjustments formatted with parentheses or minus sign
- **Requirement 8.2:** Proper formatting for payables adjustments
- **Requirement 8.3:** Zero value handling according to `showZeroValues` option
- **Requirement 8.4:** PDF export formatting (prepared for future implementation)
- **Requirement 8.5:** CSV/Excel export formatting (prepared for future implementation)

## Implementation Details

### 1. Core Formatting Function

**File:** `apps/server/src/api/routes/financial-reports/financial-reports.handlers.ts`

Added `formatStatementValue()` function that:
- Rounds values to 2 decimal places
- Formats negative values with parentheses or minus sign
- Handles zero values with configurable display ("0" or "-")
- Returns both numeric and display values

```typescript
function formatStatementValue(
  value: number,
  options: {
    showZeroValues?: boolean;
    negativeFormat?: 'parentheses' | 'minus';
    isWorkingCapitalLine?: boolean;
  }
): {
  numericValue: number;
  displayValue: string;
  isNegative: boolean;
  isZero: boolean;
}
```

### 2. Enhanced Type Definitions

**File:** `apps/server/src/lib/statement-engine/types/core.types.ts`

Added `DisplayFormatting` interface to `StatementLine`:

```typescript
export interface DisplayFormatting {
  currentPeriodDisplay: string;      // Pre-formatted display value
  previousPeriodDisplay: string;     // Pre-formatted display value
  showZeroValues: boolean;           // Whether to show "0" or "-"
  negativeFormat: 'parentheses' | 'minus';
  isWorkingCapitalLine: boolean;     // Identifies working capital lines
}
```

### 3. Statement Line Building Enhancement

**File:** `apps/server/src/api/routes/financial-reports/financial-reports.handlers.ts`

Updated statement line building logic to:
- Identify working capital lines (CHANGES_RECEIVABLES, CHANGES_PAYABLES)
- Apply proper formatting to current and previous period values
- Include `displayFormatting` metadata in each statement line

```typescript
// Identify working capital lines
const isWorkingCapitalLine = statementCode === 'CASH_FLOW' && 
  (templateLine.lineCode === 'CHANGES_RECEIVABLES' || 
   templateLine.lineCode === 'CHANGES_PAYABLES');

// Format values with proper display
const currentFormatted = formatStatementValue(currentPeriodValue, {
  showZeroValues: true,
  negativeFormat: 'parentheses',
  isWorkingCapitalLine
});
```

### 4. Export Preparation Function

**File:** `apps/server/src/api/routes/financial-reports/financial-reports.handlers.ts`

Added `prepareStatementForExport()` function that:
- Prepares statement data for CSV/Excel export
- Uses minus sign format for negative values (better for spreadsheets)
- Includes working capital metadata in export
- Returns structured data with headers, rows, and metadata

### 5. Template Verification

**File:** `apps/server/src/db/seeds/data/statement-templates.ts`

Verified that working capital lines have correct indentation:
- `CHANGES_RECEIVABLES`: level 3 ✓
- `CHANGES_PAYABLES`: level 3 ✓

## Test Coverage

**File:** `apps/server/src/api/routes/financial-reports/statement-display-formatting.test.ts`

Created comprehensive tests covering:
- Negative value formatting with parentheses
- Negative value formatting with minus sign
- Positive value formatting
- Zero value handling (show/hide)
- Decimal precision and rounding
- Working capital line identification
- Edge cases (very small/large values)

## Documentation

**File:** `apps/server/src/api/routes/financial-reports/EXPORT_FORMATTING_GUIDE.md`

Created comprehensive guide covering:
- Display formatting requirements
- PDF export formatting guidelines
- CSV/Excel export formatting guidelines
- Format conversion table
- Testing checklist
- Helper function documentation
- Future enhancement suggestions

## Formatting Examples

### Parentheses Format (PDF, UI Display)
```
Changes in receivables    (10,000.00)    (8,000.00)
Changes in payables        (7,000.00)     5,000.00
```

### Minus Format (CSV/Excel Export)
```
CHANGES_RECEIVABLES,-10000.00,-8000.00
CHANGES_PAYABLES,-7000.00,5000.00
```

### Zero Value Handling
```
showZeroValues: true  → "0"
showZeroValues: false → "-"
```

## Integration Points

### Current Integration
1. Statement line building in `generateStatement` handler
2. Working capital calculation results
3. Statement metadata with working capital details

### Future Integration (When Export is Implemented)
1. PDF export endpoint can use `displayFormatting.currentPeriodDisplay`
2. CSV/Excel export can use `prepareStatementForExport()` function
3. Export metadata includes working capital calculation details

## Verification Checklist

- [x] Working capital lines have correct indentation (level 3)
- [x] Negative values can be formatted with parentheses
- [x] Negative values can be formatted with minus sign
- [x] Zero values handled according to `showZeroValues` option
- [x] Display formatting metadata added to statement lines
- [x] Export preparation function created
- [x] Type definitions updated
- [x] Tests created for formatting logic
- [x] Documentation created for export implementation

## Files Modified

1. `apps/server/src/api/routes/financial-reports/financial-reports.handlers.ts`
   - Added `formatStatementValue()` function
   - Added `prepareStatementForExport()` function
   - Enhanced statement line building with display formatting

2. `apps/server/src/lib/statement-engine/types/core.types.ts`
   - Added `DisplayFormatting` interface
   - Updated `StatementLine` interface

## Files Created

1. `apps/server/src/api/routes/financial-reports/statement-display-formatting.test.ts`
   - Comprehensive test suite for formatting logic

2. `apps/server/src/api/routes/financial-reports/EXPORT_FORMATTING_GUIDE.md`
   - Complete guide for implementing PDF/CSV/Excel export

3. `apps/server/src/api/routes/financial-reports/TASK_7_IMPLEMENTATION_SUMMARY.md`
   - This summary document

## Notes

- The indentation level (3) for working capital lines is already correctly defined in the template
- PDF and CSV/Excel export functionality doesn't exist yet in the codebase, so we've prepared helper functions and documentation for future implementation
- The formatting logic is flexible and can be configured via options (parentheses vs minus, show/hide zeros)
- All formatting is applied at the statement line level, making it easy for any export format to use

## Next Steps

When implementing PDF/CSV/Excel export:
1. Use `displayFormatting.currentPeriodDisplay` for pre-formatted values
2. Use `prepareStatementForExport()` for CSV/Excel data preparation
3. Follow the guidelines in `EXPORT_FORMATTING_GUIDE.md`
4. Include working capital metadata from `statement.metadata.workingCapital`
5. Apply proper indentation based on `formatting.indentLevel`

## Compliance

This implementation fully addresses:
- ✅ Task 7: Update statement display formatting
- ✅ Task 7.1: Update PDF export formatting (prepared)
- ✅ Task 7.2: Update CSV/Excel export formatting (prepared)
- ✅ Requirement 8.1: Negative value formatting for receivables
- ✅ Requirement 8.2: Negative value formatting for payables
- ✅ Requirement 8.3: Zero value handling
- ✅ Requirement 8.4: PDF export formatting (prepared)
- ✅ Requirement 8.5: CSV/Excel export formatting (prepared)
