# Enhanced PDF/DOCX Financial Report Export

## Overview

The compiled execution endpoint now generates professional financial reports in PDF or DOCX format, specifically designed for hospital and health center financial reporting. The reports follow a standardized format suitable for printing in landscape orientation.

## Endpoint

```
GET /execution/compiled/export
```

## Query Parameters

All parameters from the compiled endpoint are supported, plus:

- `format` (optional): Export format - `pdf` or `docx` (default: `pdf`)
- `filename` (optional): Custom filename for the download (default: auto-generated with date)

### Example Requests

```bash
# Export semester report for HIV program
GET /execution/compiled/export?projectType=HIV&facilityType=hospital&year=2025&quarter=Q4&format=pdf

# Export annual report as DOCX
GET /execution/compiled/export?projectType=Malaria&year=2024&format=docx&filename=malaria-annual-report-2024.docx

# Export quarterly data for TB program
GET /execution/compiled/export?projectType=TB&quarter=Q2&year=2025&format=pdf
```

## Enhanced Report Format with Real Database Data

### 1. Header Section
- **Hospital Name**: Automatically identifies the main hospital facility from database
- **Program Name**: Retrieved from real project names in database (e.g., "HIV National Strategic Plan Budget Support")
- **Reporting Period**: Auto-calculated based on Rwanda's fiscal year (July-June) and current date
- **Main Title**: "SEMESTER FINANCIAL REPORT AS AT [DATE]" with real fiscal quarter dates

### 2. Financial Table with Full Hierarchical Structure
- **Dynamic Columns**: Adapts to number of facilities (up to 10+ facilities)
- **Landscape Orientation**: Optimized for horizontal printing
- **Complete Hierarchy**: Shows all sections, subcategories, and individual activities
- **Column Structure**:
  - Activity Details (left-aligned with proper indentation)
  - Individual facility columns (right-aligned numbers)
  - Total column (bold, right-aligned)
  - Comment column (formulas and detailed explanations)

### 3. Complete Hierarchical Structure
- **Section Headers**: A-G sections in bold (e.g., "A. Receipts")
- **Subcategories**: Indented with proper numbering (e.g., "  B-01. Human Resources + Bonus")
- **Individual Activities**: Double-indented under subcategories (e.g., "    Laboratory Technician")
- **Proper Nesting**: All sub-activities displayed under their parent sections/subcategories
- **Computed Sections**: Include formulas (C = A - B, F = D - E)
- **Enhanced Comments**: Detailed explanations for each activity type

### 4. Footer Section with Real User Data
- **Prepared By**: Real user name and title from database (e.g., "Jane Uwimana, Accountant")
- **Current Date**: Automatically populated with current date
- **Verified/Approved By**: Left blank as per system requirements
- **System Footer**: "Budget Management System (v1.0)" (centered)

## Sample Output Structure with Real Data

```
Butaro District Hospital
HIV National Strategic Plan Budget Support
October - December 2025

                    SEMESTER FINANCIAL REPORT AS AT 31/12/2025

| Activity Details                                       | Butaro Hospital | Rusasa HC | Ruhombo HC | **Total** | Comment                                                                |
| :----------------------------------------------------- | --------------: | --------: | ---------: | --------: | :--------------------------------------------------------------------- |
| **A. Receipts**                                        |      **12,450** | **9,200** |  **6,100** |**27,750** |                                                                        |
|    Other Incomes                                       |           6,225 |     4,600 |      3,050 |    13,875 | Includes facility-generated revenues like pharmacy sales               |
|    Transfers from SPIU/RBC                             |           6,225 |     4,600 |      3,050 |    13,875 | Quarterly operational funding received on schedule                     |
| **B. Expenditures**                                    |      **48,500** |**36,200**| **24,100** |**108,800**|                                                                        |
| **B-01. Human Resources + Bonus**                      |       **8,450** | **6,200** |  **4,100** | **18,750**|                                                                        |
|    Laboratory Technician                               |           4,225 |     3,100 |      2,050 |     9,375 | Overtime payments for increased testing volumes                        |
|    Nurse                                               |           4,225 |     3,100 |      2,050 |     9,375 | Coverage for maternity leave and night shifts                          |
| **C. Surplus / Deficit**                               |     **-36,050** |**-27,000**|**-18,000** |**-81,050**| **C = A - B**                                                          |

Prepared by: Jane Uwimana, Accountant    Date: 04/10/2025    Signature: ______________________
Verified by: ________________________    Date: ____________    Signature: ______________________
Approved by: ________________________    Date: ____________    Signature: ______________________

                                Budget Management System (v1.0)
```

## Implementation Features

### PDF Generation with Professional Table Styling
- **Landscape Orientation**: Optimized for wide tables
- **Professional Color Scheme**: 
  - Headers: Dark Gray (#4A4A4A) background, White text
  - Main Categories (A-G): Dark Gray (#4A4A4A) background, White text
  - Sub-Categories (B-01, etc.): Light Gray (#D3D3D3) background, Dark text
  - Activities: White background, Black text with 25px indentation
- **Bordered Cells**: Light Gray (#CCCCCC) borders on all cells
- **Dynamic Column Sizing**: Adjusts based on facility count
- **Multi-page Support**: Handles large datasets gracefully

### DOCX Generation with Enhanced Styling
- **Landscape Layout**: Matches PDF format
- **Professional Table Design**: Same color scheme as PDF
- **Rich Text Formatting**: Bold sections, proper indentation
- **Cell Shading**: Background colors for different row types
- **Signature Section**: Formatted table for approvals

### Smart Data Handling
- **Hospital Detection**: Automatically identifies main hospital
- **Program Mapping**: Maps project types to program names
- **Period Formatting**: Intelligent date range formatting
- **Formula Display**: Shows computation formulas for derived values

## Response Headers

- `Content-Type`: `application/pdf` or `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- `Content-Disposition`: `attachment; filename="[filename]"`
- `Content-Length`: File size in bytes

## Error Handling

- Graceful handling of missing hospital facilities
- Default values for missing program information
- Proper error messages for generation failures
- Fallback formatting for edge cases

## Testing

## Fiscal Year Calculation

The system automatically calculates fiscal quarters based on Rwanda's fiscal year (July-June):

- **Q1**: July, August, September → Report period: "July - September [Year]" → As at: 30/09/[Year]
- **Q2**: October, November, December → Report period: "October - December [Year]" → As at: 31/12/[Year]  
- **Q3**: January, February, March → Report period: "January - March [Year+1]" → As at: 31/03/[Year+1]
- **Q4**: April, May, June → Report period: "April - June [Year+1]" → As at: 30/06/[Year+1]

The system automatically determines the current fiscal quarter based on today's date, or uses explicitly provided quarter/year parameters.

## Real Database Integration

### Project Information
- Retrieves actual project names from the `projects` table
- Maps project types to full program names (e.g., "HIV National Strategic Plan")
- Uses real facility names and types from the `facilities` table

### User Context
- Gets current user information from the `users` table
- Populates "Prepared by" field with real user name and title
- Uses current date for report generation timestamp

Enhanced test suite includes:
- Financial report format validation with real data structure
- Multi-facility layout testing with database facilities
- Computation formula verification with actual calculations
- Signature section formatting with real user information
- Landscape orientation testing with dynamic column sizing
- Fiscal year calculation testing for all quarters

## Performance Optimizations

- Efficient column width calculations
- Memory-optimized table generation
- Streaming support for large datasets
- Compressed output formats

## Future Enhancements

- Custom logo integration
- Multi-language support
- Advanced styling options
- Digital signature integration
- Automated email delivery