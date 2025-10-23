# Financial Statement Export Endpoint

## Overview
New endpoint to export generated financial statements to various formats (PDF, Excel, CSV) with customizable formatting options.

## Endpoint Details

**URL:** `POST /api/financial-reports/export-statement`

**Content-Type:** `application/json`

## Request Body

```typescript
{
  statementCode: 'REV_EXP' | 'ASSETS_LIAB' | 'CASH_FLOW' | 'NET_ASSETS_CHANGES' | 'BUDGET_VS_ACTUAL';
  reportingPeriodId: number;
  projectType: 'HIV' | 'Malaria' | 'TB';
  facilityId?: number;
  includeComparatives?: boolean; // default: true
  exportFormat?: 'pdf' | 'excel' | 'csv'; // default: 'pdf'
  exportOptions?: {
    includeMetadata?: boolean; // default: true
    includeFootnotes?: boolean; // default: true
    includeValidation?: boolean; // default: false
    pageOrientation?: 'portrait' | 'landscape'; // default: 'portrait'
    fontSize?: 'small' | 'medium' | 'large'; // default: 'medium'
    showZeroValues?: boolean; // default: true
    highlightNegatives?: boolean; // default: true
    includeCharts?: boolean; // default: false
  };
}
```

## Response

Returns a binary file download with appropriate Content-Type and Content-Disposition headers.

### Response Headers

**PDF Export:**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="REV_EXP_2024_1234567890.pdf"
```

**Excel Export:**
```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="REV_EXP_2024_1234567890.xlsx"
```

**CSV Export:**
```
Content-Type: text/csv
Content-Disposition: attachment; filename="REV_EXP_2024_1234567890.csv"
```

## Export Formats

### 1. PDF Export
- **Status:** ✅ Fully implemented
- **Library:** `pdfkit`
- **Features:**
  - ✅ Professional formatting with proper typography
  - ✅ Page headers with statement metadata
  - ✅ Page footers with page numbers
  - ✅ Configurable orientation (portrait/landscape)
  - ✅ Font size options (small/medium/large)
  - ✅ Negative value highlighting in red
  - ✅ Positive variance in green
  - ✅ Bold formatting for totals and subtotals
  - ✅ Indentation for hierarchical lines
  - ✅ Automatic page breaks
  - ✅ Optional footnotes section
  - ✅ Optional validation results section
  - ✅ Table layout with proper column alignment

### 2. Excel Export
- **Status:** Placeholder implementation
- **TODO:** Implement using `exceljs`
- **Features:**
  - Multiple worksheets
  - Cell formatting (bold, italic, colors)
  - Formulas preserved
  - Conditional formatting for negatives
  - Freeze panes for headers
  - Auto-column width

### 3. CSV Export
- **Status:** ✅ Fully implemented
- **Features:**
  - Simple comma-separated format
  - Optional metadata header
  - Configurable zero value display
  - Compatible with Excel, Google Sheets, etc.

## Example Requests

### Export to PDF
```bash
curl -X POST http://localhost:3000/api/financial-reports/export-statement \
  -H "Content-Type: application/json" \
  -d '{
    "statementCode": "REV_EXP",
    "reportingPeriodId": 5,
    "projectType": "HIV",
    "facilityId": 1,
    "exportFormat": "pdf",
    "exportOptions": {
      "pageOrientation": "landscape",
      "fontSize": "medium",
      "highlightNegatives": true
    }
  }' \
  --output statement.pdf
```

### Export to Excel
```bash
curl -X POST http://localhost:3000/api/financial-reports/export-statement \
  -H "Content-Type: application/json" \
  -d '{
    "statementCode": "ASSETS_LIAB",
    "reportingPeriodId": 5,
    "projectType": "Malaria",
    "exportFormat": "excel",
    "exportOptions": {
      "includeMetadata": true,
      "showZeroValues": false
    }
  }' \
  --output statement.xlsx
```

### Export to CSV
```bash
curl -X POST http://localhost:3000/api/financial-reports/export-statement \
  -H "Content-Type: application/json" \
  -d '{
    "statementCode": "BUDGET_VS_ACTUAL",
    "reportingPeriodId": 5,
    "projectType": "TB",
    "facilityId": 2,
    "exportFormat": "csv",
    "exportOptions": {
      "includeMetadata": true,
      "showZeroValues": true
    }
  }' \
  --output statement.csv
```

## CSV Format Example

```csv
Statement,Revenue and Expenditure Statement
Statement Code,REV_EXP
Reporting Period,2024
Generated At,2025-01-10T10:30:00.000Z
Facility,District Hospital

Description,Current Period,Previous Period,Variance (Absolute),Variance (%)
"1. REVENUES",0,0,,
"Tax revenue",1000,900,100,11.11
"Grants",2000,1800,200,11.11
"TOTAL REVENUE",3000,2700,300,11.11
"2. EXPENSES",0,0,,
"Compensation of employees",1500,1400,100,7.14
"Goods and services",800,750,50,6.67
"TOTAL EXPENSES",2300,2150,150,6.98
"3. SURPLUS / (DEFICIT) FOR THE PERIOD",700,550,150,27.27

Totals
TOTAL_REVENUE,3000
TOTAL_EXPENSES,2300
SURPLUS_DEFICIT,700
```

## Error Responses

### 400 Bad Request
```json
{
  "message": "Invalid export parameters",
  "errors": ["Invalid statement code"]
}
```

### 404 Not Found
```json
{
  "message": "Statement data not found",
  "details": "No project found for project type: InvalidType"
}
```

### 500 Internal Server Error
```json
{
  "message": "Export failed",
  "error": "Error details here"
}
```

## Implementation Status

| Format | Status | Library | Priority |
|--------|--------|---------|----------|
| CSV | ✅ Complete | Native | High |
| PDF | ✅ Complete | pdfkit | High |
| Excel | 🚧 Placeholder | exceljs | Medium |

## Next Steps

### 1. Implement Excel Export
```bash
npm install exceljs
```

**Features to implement:**
- Multi-sheet workbooks (one per statement type)
- Cell styling (bold headers, colored totals)
- Formulas for calculated fields
- Conditional formatting for negative values
- Charts and graphs (optional)

### 3. Enhanced Features
- [ ] Add watermarks for draft statements
- [ ] Include digital signatures for approved statements
- [ ] Add comparison charts (current vs previous period)
- [ ] Support batch export (multiple statements in one file)
- [ ] Add email delivery option
- [ ] Implement caching for frequently exported statements

## Testing

```typescript
// Test CSV export
const response = await fetch('/api/financial-reports/export-statement', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    statementCode: 'REV_EXP',
    reportingPeriodId: 5,
    projectType: 'HIV',
    exportFormat: 'csv'
  })
});

const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'statement.csv';
a.click();
```

## Security Considerations

- ✅ Validate all input parameters
- ✅ Sanitize file names to prevent path traversal
- ⚠️ TODO: Add rate limiting for export requests
- ⚠️ TODO: Implement access control (user permissions)
- ⚠️ TODO: Add audit logging for exports
- ⚠️ TODO: Virus scan for uploaded templates (if applicable)

## Performance Considerations

- Export generation is synchronous (blocks request)
- Large statements may take time to generate
- Consider implementing:
  - Async job queue for large exports
  - Caching for frequently requested exports
  - Streaming for large CSV files
  - Progress indicators for long-running exports

## Related Endpoints

- `POST /api/financial-reports/generate-statement` - Generate statement data
- `GET /api/financial-reports` - List all reports
- `GET /api/financial-reports/{id}` - Get specific report

## Changelog

### v1.1.0 (2025-01-10)
- ✅ PDF export fully implemented with pdfkit
- ✅ Professional table layout with proper formatting
- ✅ Configurable page orientation and font sizes
- ✅ Color-coded negative values and variances
- ✅ Automatic page breaks and pagination
- ✅ Optional footnotes and validation sections

### v1.0.0 (2025-01-10)
- ✅ Initial implementation
- ✅ CSV export fully functional
- ✅ Dynamic fiscal year support
- ✅ Customizable export options
