# Compiled Report Export Guide

## Overview
The compiled report page includes export functionality that allows users to download aggregated financial reports in PDF or DOCX format.

## Features

### Export Formats
- **PDF**: Portable Document Format - ideal for viewing and printing
- **DOCX**: Microsoft Word format - ideal for editing and customization

### Export Button Location
The export buttons are located in the report header, at the top-right corner of the page:
- "Export PDF" button with file icon
- "Export DOCX" button with download icon

### Automatic Features
1. **Filename Generation**: Automatically generates descriptive filenames
   - Format: `{project}-compiled-report-{date}.{format}`
   - Example: `hiv-compiled-report-2025-10-05.pdf`

2. **Project Context**: Exports include the currently selected project type
   - HIV, Malaria, or TB

3. **Toast Notifications**: 
   - Success: Shows filename and confirms download
   - Error: Shows error message if export fails

4. **Loading State**: Buttons are disabled during export to prevent duplicate requests

## Usage

### Exporting a Report

1. **Select Project Type**: Choose HIV, Malaria, or TB from the tabs
2. **Wait for Data**: Ensure the report has loaded completely
3. **Click Export Button**: 
   - Click "Export PDF" for PDF format
   - Click "Export DOCX" for DOCX format
4. **Wait for Download**: The file will download automatically
5. **Check Notification**: A toast notification will confirm success

### Filename Convention

Exported files follow this naming pattern:
```
{project-type}-compiled-report-{YYYY-MM-DD}.{extension}
```

Examples:
- `hiv-compiled-report-2025-10-05.pdf`
- `malaria-compiled-report-2025-10-05.docx`
- `tb-compiled-report-2025-10-05.pdf`

## Technical Details

### API Endpoint
```
GET /api/execution/compiled/export
```

### Query Parameters
- `projectType`: Required - 'HIV' | 'Malaria' | 'TB'
- `format`: Required - 'pdf' | 'docx'
- `filename`: Optional - Custom filename (auto-generated if not provided)
- `facilityType`: Optional - Filter by facility type
- `reportingPeriodId`: Optional - Filter by reporting period
- `year`: Optional - Filter by year
- `quarter`: Optional - Filter by quarter

### Response
- Content-Type: `application/pdf` or `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Content-Disposition: `attachment; filename="{filename}"`
- Binary file data

### Error Handling

The export functionality handles several error scenarios:

1. **Network Errors**: Shows "Failed to export" message
2. **Server Errors**: Displays server error message
3. **No Data**: Backend returns appropriate error if no data exists
4. **Invalid Parameters**: Validation errors are displayed

## Code Example

### Basic Export
```typescript
import useExportCompiledExecution from '@/hooks/mutations/executions/use-export-compiled-execution'

function MyComponent() {
  const { mutate: exportReport, isPending } = useExportCompiledExecution()

  const handleExport = () => {
    exportReport({
      query: {
        projectType: 'HIV',
        format: 'pdf'
      }
    })
  }

  return (
    <button onClick={handleExport} disabled={isPending}>
      {isPending ? 'Exporting...' : 'Export PDF'}
    </button>
  )
}
```

### Export with Custom Filename
```typescript
const handleExport = () => {
  const filename = 'my-custom-report.pdf'
  
  exportReport({
    query: {
      projectType: 'HIV',
      format: 'pdf',
      filename
    },
    filename
  })
}
```

### Export with Filters
```typescript
const handleExport = () => {
  exportReport({
    query: {
      projectType: 'Malaria',
      facilityType: 'hospital',
      year: 2025,
      quarter: 'Q1',
      format: 'pdf'
    }
  })
}
```

### Export with Callbacks
```typescript
const handleExport = () => {
  exportReport(
    {
      query: {
        projectType: 'TB',
        format: 'docx'
      }
    },
    {
      onSuccess: (result) => {
        console.log('Export successful:', result.filename)
        toast({ title: 'Success', description: 'Report downloaded' })
      },
      onError: (error) => {
        console.error('Export failed:', error)
        toast({ 
          title: 'Error', 
          description: error.message,
          variant: 'destructive'
        })
      }
    }
  )
}
```

## Best Practices

1. **Wait for Data**: Ensure the report data has loaded before exporting
2. **User Feedback**: Always show loading state and notifications
3. **Error Handling**: Provide clear error messages to users
4. **Filename Clarity**: Use descriptive filenames that include project type and date
5. **Prevent Duplicates**: Disable export buttons during export operation

## Troubleshooting

### Export Button Not Working
- Check that data has loaded successfully
- Verify network connection
- Check browser console for errors
- Ensure backend server is running

### File Not Downloading
- Check browser download settings
- Verify popup blocker is not blocking download
- Check browser console for errors
- Try a different browser

### Wrong Data in Export
- Verify correct project type is selected
- Check that filters are applied correctly
- Refresh the page and try again

### Export Takes Too Long
- Large datasets may take longer to process
- Check network speed
- Consider adding pagination or date range filters
- Contact system administrator if issue persists

## Support

For issues or questions about the export functionality:
1. Check this guide first
2. Review the MIGRATION-NOTES.md file
3. Check the API documentation
4. Contact the development team
