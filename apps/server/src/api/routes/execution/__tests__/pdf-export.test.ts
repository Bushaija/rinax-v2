import { describe, it, expect } from 'vitest';
import { generatePDFReport, generateDOCXReport, generateEnhancedPDFReport, generateEnhancedDOCXReport } from '../execution.handlers';
import type { CompiledExecutionResponse } from '../execution.types';

// Mock data for testing
const mockCompiledData: CompiledExecutionResponse = {
  data: {
    facilities: [
      {
        id: 1,
        name: 'Test Hospital',
        facilityType: 'hospital',
        projectType: 'HIV',
        hasData: true
      },
      {
        id: 2,
        name: 'Test Health Center',
        facilityType: 'health_center',
        projectType: 'HIV',
        hasData: true
      }
    ],
    activities: [
      {
        code: 'A_001',
        name: 'Test Activity A1',
        category: 'A',
        displayOrder: 1,
        level: 1,
        isSection: false,
        isSubcategory: false,
        isComputed: false,
        total: 1000,
        values: {
          '1': 600,
          '2': 400
        },
        items: []
      },
      {
        code: 'B_001',
        name: 'Test Activity B1',
        category: 'B',
        displayOrder: 2,
        level: 1,
        isSection: false,
        isSubcategory: false,
        isComputed: false,
        total: 800,
        values: {
          '1': 500,
          '2': 300
        },
        items: []
      }
    ],
    sections: [
      {
        code: 'A',
        name: 'Receipts',
        total: 1000,
        isComputed: false
      },
      {
        code: 'B',
        name: 'Expenditures',
        total: 800,
        isComputed: false
      }
    ],
    totals: {
      byFacility: {
        '1': 1100,
        '2': 700
      },
      grandTotal: 1800
    }
  },
  meta: {
    filters: {
      projectType: 'HIV',
      facilityType: 'hospital'
    },
    aggregationDate: new Date().toISOString(),
    facilityCount: 2,
    reportingPeriod: '2024'
  }
};

describe('PDF Export Functionality', () => {
  it('should generate PDF report without errors', async () => {
    const buffer = await generatePDFReport(mockCompiledData);
    
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    
    // Check PDF header (PDF files start with %PDF)
    const pdfHeader = buffer.toString('ascii', 0, 4);
    expect(pdfHeader).toBe('%PDF');
  });

  it('should generate DOCX report without errors', async () => {
    const buffer = await generateDOCXReport(mockCompiledData);
    
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    
    // DOCX files are ZIP archives, so they start with PK
    const docxHeader = buffer.toString('ascii', 0, 2);
    expect(docxHeader).toBe('PK');
  });

  it('should handle empty data gracefully', async () => {
    const emptyData: CompiledExecutionResponse = {
      ...mockCompiledData,
      data: {
        facilities: [],
        activities: [],
        sections: [],
        totals: {
          byFacility: {},
          grandTotal: 0
        }
      }
    };

    const pdfBuffer = await generatePDFReport(emptyData);
    const docxBuffer = await generateDOCXReport(emptyData);
    
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(docxBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(0);
    expect(docxBuffer.length).toBeGreaterThan(0);
  });

  it('should generate enhanced financial report format', async () => {
    const enhancedData: CompiledExecutionResponse = {
      ...mockCompiledData,
      data: {
        ...mockCompiledData.data,
        facilities: [
          {
            id: 1,
            name: 'Butaro District Hospital',
            facilityType: 'hospital',
            projectType: 'HIV',
            hasData: true
          },
          {
            id: 2,
            name: 'Rusasa Health Center',
            facilityType: 'health_center',
            projectType: 'HIV',
            hasData: true
          },
          {
            id: 3,
            name: 'Ruhombo Health Center',
            facilityType: 'health_center',
            projectType: 'HIV',
            hasData: true
          }
        ],
        activities: [
          {
            code: 'A',
            name: 'Receipts',
            category: 'A',
            displayOrder: 1,
            level: 0,
            isSection: true,
            isSubcategory: false,
            isComputed: false,
            total: 18,
            values: { '1': 8, '2': 6, '3': 4 },
            items: []
          },
          {
            code: 'C',
            name: 'Surplus / Deficit',
            category: 'C',
            displayOrder: 3,
            level: 0,
            isSection: true,
            isSubcategory: false,
            isComputed: true,
            computationFormula: 'C = A - B',
            total: -90,
            values: { '1': -40, '2': -30, '3': -20 },
            items: []
          }
        ]
      },
      meta: {
        ...mockCompiledData.meta,
        filters: {
          projectType: 'HIV',
          quarter: 'Q4',
          year: 2025
        }
      }
    };

    const pdfBuffer = await generatePDFReport(enhancedData);
    const docxBuffer = await generateDOCXReport(enhancedData);
    
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(docxBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(0);
    expect(docxBuffer.length).toBeGreaterThan(0);
    
    // Verify it's a valid PDF/DOCX
    expect(pdfBuffer.toString('ascii', 0, 4)).toBe('%PDF');
    expect(docxBuffer.toString('ascii', 0, 2)).toBe('PK');
  });

  it('should generate enhanced reports with real database structure', async () => {
    const enhancedDataWithReportInfo = {
      ...mockCompiledData,
      reportInfo: {
        hospitalName: 'Butaro District Hospital',
        programName: 'HIV National Strategic Plan Budget Support',
        reportingPeriod: 'October - December 2025',
        reportDate: '31/12/2025',
        fiscalQuarter: 'Q2-FY2025',
        preparedBy: {
          name: 'Jane Uwimana',
          title: 'Accountant',
          date: '04/10/2025'
        }
      }
    };

    const pdfBuffer = await generateEnhancedPDFReport(enhancedDataWithReportInfo);
    const docxBuffer = await generateEnhancedDOCXReport(enhancedDataWithReportInfo);
    
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(docxBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(0);
    expect(docxBuffer.length).toBeGreaterThan(0);
    
    // Verify it's a valid PDF/DOCX
    expect(pdfBuffer.toString('ascii', 0, 4)).toBe('%PDF');
    expect(docxBuffer.toString('ascii', 0, 2)).toBe('PK');
  });

  it('should handle hierarchical activities with sub-items', async () => {
    const hierarchicalData: any = {
      ...mockCompiledData,
      data: {
        ...mockCompiledData.data,
        activities: [
          {
            code: 'A',
            name: 'Receipts',
            category: 'A',
            displayOrder: 1,
            level: 0,
            isSection: true,
            isSubcategory: false,
            isComputed: false,
            total: 27750,
            values: { '1': 12450, '2': 9200, '3': 6100 },
            items: [
              {
                code: 'A_001',
                name: 'Other Incomes',
                category: 'A',
                displayOrder: 1,
                level: 2,
                isSection: false,
                isSubcategory: false,
                isComputed: false,
                total: 13875,
                values: { '1': 6225, '2': 4600, '3': 3050 },
                items: []
              },
              {
                code: 'A_002',
                name: 'Transfers from SPIU/RBC',
                category: 'A',
                displayOrder: 2,
                level: 2,
                isSection: false,
                isSubcategory: false,
                isComputed: false,
                total: 13875,
                values: { '1': 6225, '2': 4600, '3': 3050 },
                items: []
              }
            ]
          },
          {
            code: 'B',
            name: 'Expenditures',
            category: 'B',
            displayOrder: 2,
            level: 0,
            isSection: true,
            isSubcategory: false,
            isComputed: false,
            total: 108800,
            values: { '1': 48500, '2': 36200, '3': 24100 },
            items: [
              {
                code: 'B-01',
                name: 'Human Resources + Bonus',
                category: 'B',
                subcategory: 'B-01',
                displayOrder: 1,
                level: 1,
                isSection: false,
                isSubcategory: true,
                isComputed: false,
                total: 18750,
                values: { '1': 8450, '2': 6200, '3': 4100 },
                items: [
                  {
                    code: 'B_001',
                    name: 'Laboratory Technician',
                    category: 'B',
                    subcategory: 'B-01',
                    displayOrder: 1,
                    level: 2,
                    isSection: false,
                    isSubcategory: false,
                    isComputed: false,
                    total: 9375,
                    values: { '1': 4225, '2': 3100, '3': 2050 },
                    items: []
                  },
                  {
                    code: 'B_002',
                    name: 'Nurse',
                    category: 'B',
                    subcategory: 'B-01',
                    displayOrder: 2,
                    level: 2,
                    isSection: false,
                    isSubcategory: false,
                    isComputed: false,
                    total: 9375,
                    values: { '1': 4225, '2': 3100, '3': 2050 },
                    items: []
                  }
                ]
              }
            ]
          }
        ]
      }
    };

    const pdfBuffer = await generatePDFReport(hierarchicalData);
    const docxBuffer = await generateDOCXReport(hierarchicalData);
    
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(docxBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(0);
    expect(docxBuffer.length).toBeGreaterThan(0);
    
    // Verify it's a valid PDF/DOCX
    expect(pdfBuffer.toString('ascii', 0, 4)).toBe('%PDF');
    expect(docxBuffer.toString('ascii', 0, 2)).toBe('PK');
  });
});