import type { Database } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

interface CategoryData {
    code: string;
    name: string;
    displayOrder: number;
    isComputed?: boolean;
}

interface SubCategoryData {
    categoryCode: string;
    code: string;
    name: string;
    displayOrder: number;
}

interface ActivityData {
    categoryCode: string;
    subCategoryCode?: string | null;
    name: string;
    displayOrder: number;
    isTotalRow: boolean;
    activityType?: string;
    computationRules?: any;
    applicableTo: 'hospital' | 'health_center' | 'both'; // NEW: Facility targeting
}
// Labels for well-known B subcategories
const subCategoryLabels: Record<string, string> = {
    'B-01': 'Human Resources + Bonus',
    'B-02': 'Monitoring & Evaluation',
    'B-03': 'Living Support to Clients/Target Populations',
    'B-04': 'Overheads (Use of goods & services)',
    'B-05': 'Transfer to other reporting entities',
};


// Map seeder project codes to DB enum values
function toDbProjectType(projectType: 'HIV' | 'MAL' | 'TB'): 'HIV' | 'Malaria' | 'TB' {
    switch (projectType) {
        case 'HIV': return 'HIV';
        case 'MAL': return 'Malaria';
        case 'TB': return 'TB';
    }
}

// ENHANCED: HIV execution activities with facility targeting
const hivActivities: ActivityData[] = [
    // A. Receipts (applicable to both facility types)
    { categoryCode: 'A', subCategoryCode: null, name: 'Other Incomes', displayOrder: 1, isTotalRow: false, activityType: 'REVENUE', applicableTo: 'both' },
    { categoryCode: 'A', subCategoryCode: null, name: 'Transfers from SPIU/RBC', displayOrder: 2, isTotalRow: false, activityType: 'REVENUE', applicableTo: 'both' },
    { categoryCode: 'A', subCategoryCode: null, name: 'A. Receipts', displayOrder: 3, isTotalRow: true, activityType: 'REVENUE_TOTAL', applicableTo: 'both' },

    // B. Expenditures - Human Resources + BONUS (facility-specific)
    { categoryCode: 'B', subCategoryCode: 'B-01', name: 'Laboratory Technician', displayOrder: 1, isTotalRow: false, activityType: 'EXPENSE', applicableTo: 'both' },
    { categoryCode: 'B', subCategoryCode: 'B-01', name: 'Nurse', displayOrder: 2, isTotalRow: false, activityType: 'EXPENSE', applicableTo: 'both' },

    // B. Expenditures - Monitoring & Evaluation (facility-specific)
    { categoryCode: 'B', subCategoryCode: 'B-02', name: 'Supervision CHWs', displayOrder: 1, isTotalRow: false, activityType: 'EXPENSE', applicableTo: 'both' },
    { categoryCode: 'B', subCategoryCode: 'B-02', name: 'Support group meetings', displayOrder: 2, isTotalRow: false, activityType: 'EXPENSE', applicableTo: 'both' },

    // B. Expenditures - Living Support to Clients (both but different scale)
    { categoryCode: 'B', subCategoryCode: 'B-03', name: 'Sample transport', displayOrder: 1, isTotalRow: false, activityType: 'EXPENSE', applicableTo: 'both' },
    { categoryCode: 'B', subCategoryCode: 'B-03', name: 'Home visit lost to follow up', displayOrder: 2, isTotalRow: false, activityType: 'EXPENSE', applicableTo: 'both' },
    { categoryCode: 'B', subCategoryCode: 'B-03', name: 'Transport and travel for survey/surveillance', displayOrder: 3, isTotalRow: false, activityType: 'EXPENSE', applicableTo: 'both' },

    // B. Expenditures - Overheads (facility-specific variations)
    { categoryCode: 'B', subCategoryCode: 'B-04', name: 'Infrastructure support', displayOrder: 1, isTotalRow: false, activityType: 'EXPENSE', applicableTo: 'both' },
    { categoryCode: 'B', subCategoryCode: 'B-04', name: 'Office supplies', displayOrder: 2, isTotalRow: false, activityType: 'EXPENSE', applicableTo: 'both' },
    { categoryCode: 'B', subCategoryCode: 'B-04', name: 'Transport and travel (Reporting)', displayOrder: 3, isTotalRow: false, activityType: 'EXPENSE', applicableTo: 'both' },
    { categoryCode: 'B', subCategoryCode: 'B-04', name: 'Bank charges', displayOrder: 4, isTotalRow: false, activityType: 'EXPENSE', applicableTo: 'both' },

    // B. Expenditures - Transfer to other entities (both)
    { categoryCode: 'B', subCategoryCode: 'B-05', name: 'Transfer to RBC', displayOrder: 1, isTotalRow: false, activityType: 'EXPENSE', applicableTo: 'both' },

    // B. Expenditures Total (both)
    { categoryCode: 'B', subCategoryCode: null, name: 'B. Expenditures', displayOrder: 99, isTotalRow: true, activityType: 'EXPENSE_TOTAL', applicableTo: 'both' },

    // D. Financial Assets (facility-specific variations)
    { categoryCode: 'D', subCategoryCode: null, name: 'Cash at bank', displayOrder: 1, isTotalRow: false, activityType: 'ASSET', applicableTo: 'both' },
    { categoryCode: 'D', subCategoryCode: null, name: 'Petty cash', displayOrder: 2, isTotalRow: false, activityType: 'ASSET', applicableTo: 'both' },
    { categoryCode: 'D', subCategoryCode: null, name: 'Receivables (VAT refund)', displayOrder: 3, isTotalRow: false, activityType: 'ASSET', applicableTo: 'both' },
    { categoryCode: 'D', subCategoryCode: null, name: 'Other Receivables', displayOrder: 4, isTotalRow: false, activityType: 'ASSET', applicableTo: 'both' },
    { categoryCode: 'D', subCategoryCode: null, name: 'D. Financial Assets', displayOrder: 5, isTotalRow: true, activityType: 'ASSET_TOTAL', applicableTo: 'both' },

    // E. Financial Liabilities (facility-specific)
    { categoryCode: 'E', subCategoryCode: null, name: 'payable 1: salaries', displayOrder: 1, isTotalRow: false, activityType: 'LIABILITY', applicableTo: 'both' },
    { categoryCode: 'E', subCategoryCode: null, name: 'payable 2: supervision', displayOrder: 2, isTotalRow: false, activityType: 'LIABILITY', applicableTo: 'both' },
    { categoryCode: 'E', subCategoryCode: null, name: 'payable 3: meetings', displayOrder: 3, isTotalRow: false, activityType: 'LIABILITY', applicableTo: 'both' },
    { categoryCode: 'E', subCategoryCode: null, name: 'payable 4: sample transport', displayOrder: 4, isTotalRow: false, activityType: 'LIABILITY', applicableTo: 'both' },
    { categoryCode: 'E', subCategoryCode: null, name: 'payable 5: home visits', displayOrder: 5, isTotalRow: false, activityType: 'LIABILITY', applicableTo: 'both' },
    { categoryCode: 'E', subCategoryCode: null, name: 'payable 6: travel survellance', displayOrder: 6, isTotalRow: false, activityType: 'LIABILITY', applicableTo: 'both' },
    { categoryCode: 'E', subCategoryCode: null, name: 'payable 7: infrastructure support', displayOrder: 7, isTotalRow: false, activityType: 'LIABILITY', applicableTo: 'both' },
    { categoryCode: 'E', subCategoryCode: null, name: 'payable 8: supplies', displayOrder: 8, isTotalRow: false, activityType: 'LIABILITY', applicableTo: 'both' },
    { categoryCode: 'E', subCategoryCode: null, name: 'payable 9: transport reporting', displayOrder: 9, isTotalRow: false, activityType: 'LIABILITY', applicableTo: 'both' },
    { categoryCode: 'E', subCategoryCode: null, name: 'payable 10: bank charges', displayOrder: 10, isTotalRow: false, activityType: 'LIABILITY', applicableTo: 'both' },
    { categoryCode: 'E', subCategoryCode: null, name: 'payable 11: VAT refund', displayOrder: 11, isTotalRow: false, activityType: 'LIABILITY', applicableTo: 'both' },
    { categoryCode: 'E', subCategoryCode: null, name: 'E. Financial Liabilities', displayOrder: 12, isTotalRow: true, activityType: 'LIABILITY_TOTAL', applicableTo: 'both' },

    // F. Net Financial Assets (computed for both)
    { categoryCode: 'F', subCategoryCode: null, name: 'F. Net Financial Assets', displayOrder: 1, isTotalRow: true, activityType: 'COMPUTED', computationRules: { formula: 'D - E', description: 'Financial Assets minus Financial Liabilities' }, applicableTo: 'both' },

    // G. Closing Balance (both)
    { categoryCode: 'G', subCategoryCode: null, name: 'Accumulated Surplus/Deficit', displayOrder: 1, isTotalRow: false, activityType: 'EQUITY', applicableTo: 'both' },
    { categoryCode: 'G', subCategoryCode: null, name: 'Prior Year Adjustment', displayOrder: 2, isTotalRow: false, activityType: 'EQUITY', applicableTo: 'both' },
    { categoryCode: 'G', subCategoryCode: null, name: 'Surplus/Deficit of the Period', displayOrder: 3, isTotalRow: false, activityType: 'COMPUTED', computationRules: { formula: 'A - B', description: 'Receipts minus Expenditures' }, applicableTo: 'both' },
    { categoryCode: 'G', subCategoryCode: null, name: 'G. Closing Balance', displayOrder: 4, isTotalRow: true, activityType: 'EQUITY_TOTAL', applicableTo: 'both' },
];

// ENHANCED: Malaria execution activities with facility targeting
const malariaActivities: ActivityData[] = [
    // A. Receipts (applicable to both facility types)
    { categoryCode: 'A', subCategoryCode: null, name: 'Other Incomes', displayOrder: 1, isTotalRow: false, activityType: 'REVENUE', applicableTo: 'both' },
    { categoryCode: 'A', subCategoryCode: null, name: 'Transfers from SPIU/RBC', displayOrder: 2, isTotalRow: false, activityType: 'REVENUE', applicableTo: 'both' },
    { categoryCode: 'A', subCategoryCode: null, name: 'A. Receipts', displayOrder: 3, isTotalRow: true, activityType: 'REVENUE_TOTAL', applicableTo: 'both' },

    // B. Expenditures - Human Resources + BONUS (facility-specific)
    { categoryCode: 'B', subCategoryCode: 'B-01', name: 'Laboratory Technician', displayOrder: 1, isTotalRow: false, activityType: 'EXPENSE', applicableTo: 'both' },
    { categoryCode: 'B', subCategoryCode: 'B-01', name: 'Nurse', displayOrder: 2, isTotalRow: false, activityType: 'EXPENSE', applicableTo: 'both' },

    // B. Expenditures - Monitoring & Evaluation (facility-specific)
    { categoryCode: 'B', subCategoryCode: 'B-02', name: 'Supervision CHWs', displayOrder: 1, isTotalRow: false, activityType: 'EXPENSE', applicableTo: 'both' },
    { categoryCode: 'B', subCategoryCode: 'B-02', name: 'Support group meetings', displayOrder: 2, isTotalRow: false, activityType: 'EXPENSE', applicableTo: 'both' },

    // B. Expenditures - Living Support to Clients (both but different scale)
    { categoryCode: 'B', subCategoryCode: 'B-03', name: 'Sample transport', displayOrder: 1, isTotalRow: false, activityType: 'EXPENSE', applicableTo: 'both' },
    { categoryCode: 'B', subCategoryCode: 'B-03', name: 'Home visit lost to follow up', displayOrder: 2, isTotalRow: false, activityType: 'EXPENSE', applicableTo: 'both' },
    { categoryCode: 'B', subCategoryCode: 'B-03', name: 'Transport and travel for survey/surveillance', displayOrder: 3, isTotalRow: false, activityType: 'EXPENSE', applicableTo: 'both' },

    // B. Expenditures - Overheads (facility-specific variations)
    { categoryCode: 'B', subCategoryCode: 'B-04', name: 'Infrastructure support', displayOrder: 1, isTotalRow: false, activityType: 'EXPENSE', applicableTo: 'both' },
    { categoryCode: 'B', subCategoryCode: 'B-04', name: 'Office supplies', displayOrder: 2, isTotalRow: false, activityType: 'EXPENSE', applicableTo: 'both' },
    { categoryCode: 'B', subCategoryCode: 'B-04', name: 'Transport and travel (Reporting)', displayOrder: 3, isTotalRow: false, activityType: 'EXPENSE', applicableTo: 'both' },
    { categoryCode: 'B', subCategoryCode: 'B-04', name: 'Bank charges', displayOrder: 4, isTotalRow: false, activityType: 'EXPENSE', applicableTo: 'both' },

    // B. Expenditures - Transfer to other entities (both)
    { categoryCode: 'B', subCategoryCode: 'B-05', name: 'Transfer to RBC', displayOrder: 1, isTotalRow: false, activityType: 'EXPENSE', applicableTo: 'both' },

    // B. Expenditures Total (both)
    { categoryCode: 'B', subCategoryCode: null, name: 'B. Expenditures', displayOrder: 99, isTotalRow: true, activityType: 'EXPENSE_TOTAL', applicableTo: 'both' },

    // D. Financial Assets (facility-specific variations)
    { categoryCode: 'D', subCategoryCode: null, name: 'Cash at bank', displayOrder: 1, isTotalRow: false, activityType: 'ASSET', applicableTo: 'both' },
    { categoryCode: 'D', subCategoryCode: null, name: 'Petty cash', displayOrder: 2, isTotalRow: false, activityType: 'ASSET', applicableTo: 'both' },
    { categoryCode: 'D', subCategoryCode: null, name: 'Receivables (VAT refund)', displayOrder: 3, isTotalRow: false, activityType: 'ASSET', applicableTo: 'both' },
    { categoryCode: 'D', subCategoryCode: null, name: 'Other Receivables', displayOrder: 4, isTotalRow: false, activityType: 'ASSET', applicableTo: 'both' },
    { categoryCode: 'D', subCategoryCode: null, name: 'D. Financial Assets', displayOrder: 6, isTotalRow: true, activityType: 'ASSET_TOTAL', applicableTo: 'both' },

    // E. Financial Liabilities (facility-specific)
    { categoryCode: 'E', subCategoryCode: null, name: 'payable 1: salaries', displayOrder: 1, isTotalRow: false, activityType: 'LIABILITY', applicableTo: 'both' },
    { categoryCode: 'E', subCategoryCode: null, name: 'payable 2: supervision', displayOrder: 2, isTotalRow: false, activityType: 'LIABILITY', applicableTo: 'both' },
    { categoryCode: 'E', subCategoryCode: null, name: 'payable 3: meetings', displayOrder: 3, isTotalRow: false, activityType: 'LIABILITY', applicableTo: 'both' },
    { categoryCode: 'E', subCategoryCode: null, name: 'payable 4: sample transport', displayOrder: 4, isTotalRow: false, activityType: 'LIABILITY', applicableTo: 'both' },
    { categoryCode: 'E', subCategoryCode: null, name: 'payable 5: home visits', displayOrder: 5, isTotalRow: false, activityType: 'LIABILITY', applicableTo: 'both' },
    { categoryCode: 'E', subCategoryCode: null, name: 'payable 6: travel survellance', displayOrder: 6, isTotalRow: false, activityType: 'LIABILITY', applicableTo: 'both' },
    { categoryCode: 'E', subCategoryCode: null, name: 'payable 7: infrastructure support', displayOrder: 7, isTotalRow: false, activityType: 'LIABILITY', applicableTo: 'both' },
    { categoryCode: 'E', subCategoryCode: null, name: 'payable 8: supplies', displayOrder: 8, isTotalRow: false, activityType: 'LIABILITY', applicableTo: 'both' },
    { categoryCode: 'E', subCategoryCode: null, name: 'payable 9: transport reporting', displayOrder: 9, isTotalRow: false, activityType: 'LIABILITY', applicableTo: 'both' },
    { categoryCode: 'E', subCategoryCode: null, name: 'payable 10: bank charges', displayOrder: 10, isTotalRow: false, activityType: 'LIABILITY', applicableTo: 'both' },
    { categoryCode: 'E', subCategoryCode: null, name: 'payable 11: VAT refund', displayOrder: 11, isTotalRow: false, activityType: 'LIABILITY', applicableTo: 'both' },
    { categoryCode: 'E', subCategoryCode: null, name: 'E. Financial Liabilities', displayOrder: 12, isTotalRow: true, activityType: 'LIABILITY_TOTAL', applicableTo: 'both' },
    
    // F. Net Financial Assets (computed for both)
    { categoryCode: 'F', subCategoryCode: null, name: 'F. Net Financial Assets', displayOrder: 1, isTotalRow: true, activityType: 'COMPUTED', computationRules: { formula: 'D - E', description: 'Financial Assets minus Financial Liabilities' }, applicableTo: 'both' },

    // G. Closing Balance (both)
    { categoryCode: 'G', subCategoryCode: null, name: 'Accumulated Surplus/Deficit', displayOrder: 1, isTotalRow: false, activityType: 'EQUITY', applicableTo: 'both' },
    { categoryCode: 'G', subCategoryCode: null, name: 'Prior Year Adjustment', displayOrder: 2, isTotalRow: false, activityType: 'EQUITY', applicableTo: 'both' },
    { categoryCode: 'G', subCategoryCode: null, name: 'Surplus/Deficit of the Period', displayOrder: 3, isTotalRow: false, activityType: 'COMPUTED', computationRules: { formula: 'A - B', description: 'Receipts minus Expenditures' }, applicableTo: 'both' },
    { categoryCode: 'G', subCategoryCode: null, name: 'G. Closing Balance', displayOrder: 4, isTotalRow: true, activityType: 'EQUITY_TOTAL', applicableTo: 'both' },
];

// ENHANCED: TB execution activities with facility targeting
const tbActivities: ActivityData[] = [
    // A. Receipts (applicable to both facility types)
    { categoryCode: 'A', subCategoryCode: null, name: 'Other Incomes', displayOrder: 1, isTotalRow: false, activityType: 'REVENUE', applicableTo: 'both' },
    { categoryCode: 'A', subCategoryCode: null, name: 'Transfers from SPIU/RBC', displayOrder: 2, isTotalRow: false, activityType: 'REVENUE', applicableTo: 'both' },
    { categoryCode: 'A', subCategoryCode: null, name: 'A. Receipts', displayOrder: 3, isTotalRow: true, activityType: 'REVENUE_TOTAL', applicableTo: 'both' },

    // B. Expenditures - Human Resources + BONUS (facility-specific)
    { categoryCode: 'B', subCategoryCode: 'B-01', name: 'Laboratory Technician', displayOrder: 1, isTotalRow: false, activityType: 'EXPENSE', applicableTo: 'both' },
    { categoryCode: 'B', subCategoryCode: 'B-01', name: 'Nurse', displayOrder: 2, isTotalRow: false, activityType: 'EXPENSE', applicableTo: 'both' },

    // B. Expenditures - Monitoring & Evaluation (facility-specific)
    { categoryCode: 'B', subCategoryCode: 'B-02', name: 'Supervision CHWs', displayOrder: 1, isTotalRow: false, activityType: 'EXPENSE', applicableTo: 'both' },
    { categoryCode: 'B', subCategoryCode: 'B-02', name: 'Support group meetings', displayOrder: 2, isTotalRow: false, activityType: 'EXPENSE', applicableTo: 'both' },

    // B. Expenditures - Living Support to Clients (both but different scale)
    { categoryCode: 'B', subCategoryCode: 'B-03', name: 'Sample transport', displayOrder: 1, isTotalRow: false, activityType: 'EXPENSE', applicableTo: 'both' },
    { categoryCode: 'B', subCategoryCode: 'B-03', name: 'Home visit lost to follow up', displayOrder: 2, isTotalRow: false, activityType: 'EXPENSE', applicableTo: 'both' },
    { categoryCode: 'B', subCategoryCode: 'B-03', name: 'Transport and travel for survey/surveillance', displayOrder: 3, isTotalRow: false, activityType: 'EXPENSE', applicableTo: 'both' },

    // B. Expenditures - Overheads (facility-specific variations)
    { categoryCode: 'B', subCategoryCode: 'B-04', name: 'Infrastructure support', displayOrder: 1, isTotalRow: false, activityType: 'EXPENSE', applicableTo: 'both' },
    { categoryCode: 'B', subCategoryCode: 'B-04', name: 'Office supplies', displayOrder: 2, isTotalRow: false, activityType: 'EXPENSE', applicableTo: 'both' },
    { categoryCode: 'B', subCategoryCode: 'B-04', name: 'Transport and travel (Reporting)', displayOrder: 3, isTotalRow: false, activityType: 'EXPENSE', applicableTo: 'both' },
    { categoryCode: 'B', subCategoryCode: 'B-04', name: 'Bank charges', displayOrder: 4, isTotalRow: false, activityType: 'EXPENSE', applicableTo: 'both' },

    // B. Expenditures - Transfer to other entities (both)
    { categoryCode: 'B', subCategoryCode: 'B-05', name: 'Transfer to RBC', displayOrder: 1, isTotalRow: false, activityType: 'EXPENSE', applicableTo: 'both' },

    // B. Expenditures Total (both)
    { categoryCode: 'B', subCategoryCode: null, name: 'B. Expenditures', displayOrder: 99, isTotalRow: true, activityType: 'EXPENSE_TOTAL', applicableTo: 'both' },

    // D. Financial Assets (facility-specific variations)
    { categoryCode: 'D', subCategoryCode: null, name: 'Cash at bank', displayOrder: 1, isTotalRow: false, activityType: 'ASSET', applicableTo: 'both' },
    { categoryCode: 'D', subCategoryCode: null, name: 'Petty cash', displayOrder: 2, isTotalRow: false, activityType: 'ASSET', applicableTo: 'both' },
    { categoryCode: 'D', subCategoryCode: null, name: 'Receivables (VAT refund)', displayOrder: 3, isTotalRow: false, activityType: 'ASSET', applicableTo: 'both' },
    { categoryCode: 'D', subCategoryCode: null, name: 'Other Receivables', displayOrder: 4, isTotalRow: false, activityType: 'ASSET', applicableTo: 'both' },
    { categoryCode: 'D', subCategoryCode: null, name: 'D. Financial Assets', displayOrder: 6, isTotalRow: true, activityType: 'ASSET_TOTAL', applicableTo: 'both' },

    // E. Financial Liabilities (facility-specific)
    { categoryCode: 'E', subCategoryCode: null, name: 'payable 1: salaries', displayOrder: 1, isTotalRow: false, activityType: 'LIABILITY', applicableTo: 'both' },
    { categoryCode: 'E', subCategoryCode: null, name: 'payable 2: supervision', displayOrder: 2, isTotalRow: false, activityType: 'LIABILITY', applicableTo: 'both' },
    { categoryCode: 'E', subCategoryCode: null, name: 'payable 3: meetings', displayOrder: 3, isTotalRow: false, activityType: 'LIABILITY', applicableTo: 'both' },
    { categoryCode: 'E', subCategoryCode: null, name: 'payable 4: sample transport', displayOrder: 4, isTotalRow: false, activityType: 'LIABILITY', applicableTo: 'both' },
    { categoryCode: 'E', subCategoryCode: null, name: 'payable 5: home visits', displayOrder: 5, isTotalRow: false, activityType: 'LIABILITY', applicableTo: 'both' },
    { categoryCode: 'E', subCategoryCode: null, name: 'payable 6: travel survellance', displayOrder: 6, isTotalRow: false, activityType: 'LIABILITY', applicableTo: 'both' },
    { categoryCode: 'E', subCategoryCode: null, name: 'payable 7: infrastructure support', displayOrder: 7, isTotalRow: false, activityType: 'LIABILITY', applicableTo: 'both' },
    { categoryCode: 'E', subCategoryCode: null, name: 'payable 8: supplies', displayOrder: 8, isTotalRow: false, activityType: 'LIABILITY', applicableTo: 'both' },
    { categoryCode: 'E', subCategoryCode: null, name: 'payable 9: transport reporting', displayOrder: 9, isTotalRow: false, activityType: 'LIABILITY', applicableTo: 'both' },
    { categoryCode: 'E', subCategoryCode: null, name: 'payable 10: bank charges', displayOrder: 10, isTotalRow: false, activityType: 'LIABILITY', applicableTo: 'both' },
    { categoryCode: 'E', subCategoryCode: null, name: 'payable 11: VAT refund', displayOrder: 11, isTotalRow: false, activityType: 'LIABILITY', applicableTo: 'both' },
    { categoryCode: 'E', subCategoryCode: null, name: 'E. Financial Liabilities', displayOrder: 12, isTotalRow: true, activityType: 'LIABILITY_TOTAL', applicableTo: 'both' },
    
    // F. Net Financial Assets (computed for both)
    { categoryCode: 'F', subCategoryCode: null, name: 'F. Net Financial Assets', displayOrder: 1, isTotalRow: true, activityType: 'COMPUTED', computationRules: { formula: 'D - E', description: 'Financial Assets minus Financial Liabilities' }, applicableTo: 'both' },

    // G. Closing Balance (both)
    { categoryCode: 'G', subCategoryCode: null, name: 'Accumulated Surplus/Deficit', displayOrder: 1, isTotalRow: false, activityType: 'EQUITY', applicableTo: 'both' },
    { categoryCode: 'G', subCategoryCode: null, name: 'Prior Year Adjustment', displayOrder: 2, isTotalRow: false, activityType: 'EQUITY', applicableTo: 'both' },
    { categoryCode: 'G', subCategoryCode: null, name: 'Surplus/Deficit of the Period', displayOrder: 3, isTotalRow: false, activityType: 'COMPUTED', computationRules: { formula: 'A - B', description: 'Receipts minus Expenditures' }, applicableTo: 'both' },
    { categoryCode: 'G', subCategoryCode: null, name: 'G. Closing Balance', displayOrder: 4, isTotalRow: true, activityType: 'EQUITY_TOTAL', applicableTo: 'both' },
];


// Helper function to get or create category in schema_activity_categories for specific facility types
async function getOrCreateCategoryForFacility(
    db: Database, 
    categoryCode: string, 
    categoryName: string, 
    projectType: 'HIV' | 'MAL' | 'TB',
    facilityType: 'hospital' | 'health_center',
    displayOrder: number,
    isComputed: boolean = false
): Promise<number> {
    // CRITICAL: Include facility type in category lookup to support facility-specific categories
    const [existing] = await db
        .select()
        .from(schema.schemaActivityCategories)
        .where(
            and(
                eq(schema.schemaActivityCategories.code, `${projectType}_EXEC_${categoryCode}`),
                eq(schema.schemaActivityCategories.moduleType, 'execution'),
                eq(schema.schemaActivityCategories.projectType, toDbProjectType(projectType) as any),
                eq(schema.schemaActivityCategories.facilityType, facilityType)
            )
        );

    if (existing) {
        return existing.id;
    }

    // Create facility-specific category
    const [newCategory] = await db
        .insert(schema.schemaActivityCategories)
        .values({
            code: `${projectType}_EXEC_${categoryCode}`,
            name: `${categoryName}`,            
            // name: `${categoryName} (${facilityType})`,    
            description: `Execution category for ${projectType} ${facilityType}: ${categoryName}`,
            moduleType: 'execution',
            projectType: toDbProjectType(projectType) as any,
            facilityType: facilityType,
            displayOrder: displayOrder,
            isActive: true,
            metadata: {
                isComputed,
                originalCode: categoryCode,
                projectType,
                facilityType,
                executionSpecific: true // DISTINCTION: Mark as execution-specific
            }
        })
        .returning();

    return newCategory.id;
}

async function getOrCreateExecutionCategory(
    db: Database, 
    categoryCode: string, 
    categoryName: string, 
    projectType: 'HIV' | 'MAL' | 'TB',
    facilityType: 'hospital' | 'health_center',
    displayOrder: number,
    isComputed: boolean = false
): Promise<number> {
    // Look for existing execution category for this facility type
    const [existing] = await db
        .select()
        .from(schema.schemaActivityCategories)
        .where(
            and(
                eq(schema.schemaActivityCategories.code, `${projectType}_EXEC_${categoryCode}`),
                eq(schema.schemaActivityCategories.moduleType, 'execution'),
                eq(schema.schemaActivityCategories.projectType, toDbProjectType(projectType) as any),
                eq(schema.schemaActivityCategories.facilityType, facilityType)
            )
        );

    if (existing) {
        return existing.id;
    }

    // Create new execution category for this facility type
    const [newCategory] = await db
        .insert(schema.schemaActivityCategories)
        .values({
            code: `${projectType}_EXEC_${categoryCode}`,
            name: `${categoryName}`,
            // name: `${categoryName} (${facilityType})`,    
            description: `Execution category for ${projectType} ${facilityType}: ${categoryName}`,
            moduleType: 'execution', // Critical: execution module only
            projectType: toDbProjectType(projectType) as any,
            facilityType: facilityType,
            displayOrder: displayOrder,
            isActive: true,
            metadata: {
                isComputed,
                originalCode: categoryCode,
                projectType,
                facilityType,
                moduleType: 'execution', // Explicit module marker
                executionSpecific: true
            }
        })
        .returning();

    console.log(`Created execution category: ${newCategory.code} for ${facilityType}`);
    return newCategory.id;
}

// NEW: Create/fetch a facility-scoped subcategory row linked under a parent category (e.g., B-01 under B)
async function getOrCreateExecutionSubCategory(
    db: Database,
    projectType: 'HIV' | 'MAL' | 'TB',
    facilityType: 'hospital' | 'health_center',
    parentCategoryId: number,
    subCategoryCode: string,
    displayName: string,
    displayOrder: number
): Promise<number> {
    const code = `${projectType}_EXEC_${subCategoryCode}`;

    const [existing] = await db
        .select()
        .from(schema.schemaActivityCategories)
        .where(
            and(
                eq(schema.schemaActivityCategories.code, code),
                eq(schema.schemaActivityCategories.moduleType, 'execution'),
                eq(schema.schemaActivityCategories.projectType, toDbProjectType(projectType) as any),
                eq(schema.schemaActivityCategories.facilityType, facilityType)
            )
        );

    if (existing) return existing.id;

    const [created] = await db
        .insert(schema.schemaActivityCategories)
        .values({
            code,
            subCategoryCode: subCategoryCode,
            name: displayName,
            description: `Execution sub-category ${subCategoryCode} for ${projectType} ${facilityType}`,
            moduleType: 'execution',
            projectType: toDbProjectType(projectType) as any,
            facilityType,
            displayOrder,
            parentCategoryId,
            isSubCategory: true,
            isActive: true,
            metadata: {
                originalCode: subCategoryCode,
                isSubCategory: true,
                projectType,
                facilityType,
                executionSpecific: true
            }
        })
        .returning();

    return created.id;
}

// ENHANCED: Function to seed execution categories for specific program and facility type
async function seedExecutionCategoriesForProgramAndFacility(
    db: Database, 
    projectType: 'HIV' | 'MAL' | 'TB', 
    facilityType: 'hospital' | 'health_center',
    categories: CategoryData[]
) {
    console.log(`Seeding execution categories for ${projectType} ${facilityType}...`);
    
    for (const category of categories) {
        await getOrCreateCategoryForFacility(
            db, 
            category.code, 
            category.name, 
            projectType,
            facilityType,
            category.displayOrder,
            category.isComputed
        );
    }
}

async function verifyExecutionActivities(db: Database, projectType: 'HIV' | 'MAL' | 'TB') {
    console.log(`\nVerifying execution activities for ${projectType}...`);
    
    const dbProjectType = toDbProjectType(projectType);
    
    // FIXED: Use sql for count aggregation
    const counts = await db
        .select({
            facilityType: schema.dynamicActivities.facilityType,
            count: sql<number>`cast(count(*) as int)`.as('count')
        })
        .from(schema.dynamicActivities)
        .where(
            and(
                eq(schema.dynamicActivities.moduleType, 'execution'),
                eq(schema.dynamicActivities.projectType, dbProjectType as any)
            )
        )
        .groupBy(schema.dynamicActivities.facilityType);

    console.log(`Verification results for ${projectType}:`);
    counts.forEach(row => {
        console.log(`  ${row.facilityType}: ${row.count} activities`);
    });

    // Ensure we have activities for both facility types
    const hasHospital = counts.some(r => r.facilityType === 'hospital');
    const hasHealthCenter = counts.some(r => r.facilityType === 'health_center');
    
    if (!hasHospital || !hasHealthCenter) {
        console.warn(`⚠ Warning: Missing facility type coverage for ${projectType}`);
        console.warn(`  Hospital: ${hasHospital ? 'Yes' : 'No'}`);
        console.warn(`  Health Center: ${hasHealthCenter ? 'Yes' : 'No'}`);
    } else {
        console.log(`✓ Both facility types properly seeded for ${projectType}`);
    }
}

// ENHANCED: Main function to seed execution activities with proper facility targeting
export async function seedExecutionActivitiesForProgramInternal(
    db: Database, 
    projectType: 'HIV' | 'MAL' | 'TB', 
    activities: Array<{
        categoryCode: string;
        subCategoryCode?: string | null;
        name: string;
        displayOrder: number;
        isTotalRow: boolean;
        activityType?: string;
        computationRules?: any;
        applicableTo: 'hospital' | 'health_center' | 'both';
    }>
) {
    console.log(`\n📊 EXECUTION SEEDER: ${projectType}`);
    console.log(`Processing ${activities.length} activity definitions...`);
    
    const facilityTypes: Array<'hospital' | 'health_center'> = ['hospital', 'health_center'];
    let totalInserted = 0;
    let totalUpdated = 0;
    const summary: Record<string, number> = {};

    // Process each facility type separately to avoid conflicts
    for (const facilityType of facilityTypes) {
        console.log(`\n  🏥 ${facilityType.toUpperCase()}`);
        
        // Filter activities applicable to this facility type
        const applicableActivities = activities.filter(activity => 
            activity.applicableTo === facilityType || activity.applicableTo === 'both'
        );

        console.log(`     Found ${applicableActivities.length} applicable activities`);

        if (applicableActivities.length === 0) {
            console.log(`     ⚠️  No activities for ${facilityType}, skipping...`);
            summary[facilityType] = 0;
            continue;
        }

        const activitiesToInsert = [];
        
        for (const activity of applicableActivities) {
            // Ensure parent category exists (A, B, C, D, E, F, G)
            const parentCategoryId = await getOrCreateExecutionCategory(
                db,
                activity.categoryCode,
                `${activity.categoryCode}. Execution Category`,
                projectType,
                facilityType,
                1,
                activity.computationRules ? true : false
            );

            // Resolve final categoryId: subcategory (if any) or parent
            const categoryId = activity.subCategoryCode
                ? await getOrCreateExecutionSubCategory(
                    db,
                    projectType,
                    facilityType,
                    parentCategoryId,
                    activity.subCategoryCode,
                    subCategoryLabels[activity.subCategoryCode] || activity.subCategoryCode,
                    10
                  )
                : parentCategoryId;

            // Generate unique code that includes facility type to prevent conflicts
            // Format: PROJECT_EXEC_FACILITY_CATEGORY_[SUBCATEGORY_]DISPLAY
            const activityCode = activity.subCategoryCode 
                ? `${projectType}_EXEC_${facilityType.toUpperCase()}_${activity.categoryCode}_${activity.subCategoryCode}_${activity.displayOrder}`
                : `${projectType}_EXEC_${facilityType.toUpperCase()}_${activity.categoryCode}_${activity.displayOrder}`;

            const activityData = {
                categoryId: categoryId,
                projectType: toDbProjectType(projectType) as any,
                facilityType: facilityType, // Critical: specific facility type
                moduleType: 'execution' as any, // Critical: execution module only
                code: activityCode,
                name: activity.name,
                description: `${projectType} execution activity for ${facilityType}: ${activity.name}`,
                activityType: activity.activityType || (activity.isTotalRow ? 'TOTAL' : 'ITEM'),
                displayOrder: activity.displayOrder,
                isTotalRow: activity.isTotalRow,
                isAnnualOnly: false,
                fieldMappings: activity.subCategoryCode ? {
                    subcategory: activity.subCategoryCode,
                    category: activity.categoryCode,
                    facilityType: facilityType,
                    moduleType: 'execution'
                } : {
                    category: activity.categoryCode,
                    facilityType: facilityType,
                    moduleType: 'execution'
                },
                computationRules: activity.computationRules || null,
                validationRules: null,
                metadata: {
                    originalCategoryCode: activity.categoryCode,
                    originalSubCategoryCode: activity.subCategoryCode,
                    projectType,
                    facilityType,
                    moduleType: 'execution', // Explicit module marker
                    applicableTo: activity.applicableTo,
                    executionSpecific: true,
                    enhancedSeed: true,
                    createdAt: new Date().toISOString()
                },
                isActive: true
            };

            activitiesToInsert.push(activityData);
        }

        // Bulk insert with conflict resolution
        if (activitiesToInsert.length > 0) {
            try {
                console.log(`     Attempting to insert ${activitiesToInsert.length} activities...`);
                console.log(`     Sample activity code: ${activitiesToInsert[0].code}`);
                console.log(`     Sample project type: ${activitiesToInsert[0].projectType}`);
                
                const result = await db
                    .insert(schema.dynamicActivities)
                    .values(activitiesToInsert as any)
                    .onConflictDoUpdate({
                        target: [
                            schema.dynamicActivities.categoryId, 
                            schema.dynamicActivities.code
                        ],
                        set: {
                            name: (schema.dynamicActivities as any).name,
                            description: (schema.dynamicActivities as any).description,
                            activityType: (schema.dynamicActivities as any).activityType,
                            displayOrder: (schema.dynamicActivities as any).displayOrder,
                            isTotalRow: (schema.dynamicActivities as any).isTotalRow,
                            fieldMappings: (schema.dynamicActivities as any).fieldMappings,
                            computationRules: (schema.dynamicActivities as any).computationRules,
                            metadata: (schema.dynamicActivities as any).metadata,
                            projectType: (schema.dynamicActivities as any).projectType, // IMPORTANT: Update projectType too
                            facilityType: (schema.dynamicActivities as any).facilityType, // IMPORTANT: Update facilityType too
                            moduleType: (schema.dynamicActivities as any).moduleType, // IMPORTANT: Update moduleType too
                            isActive: (schema.dynamicActivities as any).isActive,
                            updatedAt: new Date(),
                        },
                    })
                    .returning();
        
                console.log(`     ✓ Successfully processed ${result.length} activities`);
                totalInserted += result.length;
                summary[facilityType] = result.length;
            } catch (error: any) {
                console.error(`     ✗ Error inserting activities for ${facilityType}:`, error);
                console.error(`     Error details:`, {
                    message: error.message,
                    code: error.code,
                    detail: error.detail
                });
                
                // Log the first activity that failed
                console.error(`     First activity in batch:`, JSON.stringify(activitiesToInsert[0], null, 2));
                throw error;
            }
        }
    }

    console.log(`\n✓ Total execution activities processed for ${projectType}: ${totalInserted}`);
    
    // Verification step
    await verifyExecutionActivities(db, projectType);
    
    return { 
        inserted: totalInserted, 
        updated: totalUpdated, 
        projectType 
    };
}

// ENHANCED: Categories seeding with facility support
export async function seedExecutionCategories(db: Database) {
    console.log('ENHANCED: Seeding execution categories with facility targeting...');
    
    const facilityTypes: Array<'hospital' | 'health_center'> = ['hospital', 'health_center'];
    const programs = [
        { type: 'HIV' as const, categories: [
            { code: 'A', name: 'A. Receipts', displayOrder: 1 },
            { code: 'B', name: 'B. Expenditures', displayOrder: 2 },
            { code: 'C', name: 'C. SURPLUS / DEFICIT', displayOrder: 3, isComputed: true },
            { code: 'D', name: 'D. Financial Assets', displayOrder: 4 },
            { code: 'E', name: 'E. Financial Liabilities', displayOrder: 5 },
            { code: 'F', name: 'F. Net Financial Assets', displayOrder: 6, isComputed: true },
            { code: 'G', name: 'G. Closing Balance', displayOrder: 7 },
        ]},
        { type: 'MAL' as const, categories: [
            { code: 'A', name: 'A. Receipts', displayOrder: 1 },
            { code: 'B', name: 'B. Expenditures', displayOrder: 2 },
            { code: 'C', name: 'C. SURPLUS / DEFICIT', displayOrder: 3, isComputed: true },
            { code: 'D', name: 'D. Financial Assets', displayOrder: 4 },
            { code: 'E', name: 'E. Financial Liabilities', displayOrder: 5 },
            { code: 'F', name: 'F. Net Financial Assets', displayOrder: 6, isComputed: true },
            { code: 'G', name: 'G. Closing Balance', displayOrder: 7 },
        ]},
        { type: 'TB' as const, categories: [
            { code: 'A', name: 'A. Receipts', displayOrder: 1 },
            { code: 'B', name: 'B. Expenditures', displayOrder: 2 },
            { code: 'C', name: 'C. SURPLUS / DEFICIT', displayOrder: 3, isComputed: true },
            { code: 'D', name: 'D. Financial Assets', displayOrder: 4 },
            { code: 'E', name: 'E. Financial Liabilities', displayOrder: 5 },
            { code: 'F', name: 'F. Net Financial Assets', displayOrder: 6, isComputed: true },
            { code: 'G', name: 'G. Closing Balance', displayOrder: 7 },
        ]}
    ];
    
    for (const program of programs) {
        for (const facilityType of facilityTypes) {
            await seedExecutionCategoriesForProgramAndFacility(
                db, 
                program.type, 
                facilityType, 
                program.categories
            );
        }
    }
    
    console.log('ENHANCED: Finished seeding execution categories for all programs and facility types');
}

// ENHANCED: Main activities seeding function
export async function seedExecutionActivities(db: Database) {
    console.log('ENHANCED: Seeding execution activities with facility targeting...');
    
    await seedExecutionActivitiesForProgramInternal(db, 'HIV', hivActivities);
    await seedExecutionActivitiesForProgramInternal(db, 'MAL', malariaActivities);
    await seedExecutionActivitiesForProgramInternal(db, 'TB', tbActivities);
    
    console.log('ENHANCED: Finished seeding execution activities for all programs');
}

// ENHANCED: Program-specific seeding functions
export async function seedExecutionDataForProgram(db: Database, projectType: 'HIV' | 'MAL' | 'TB') {
    console.log(`ENHANCED: Seeding execution data for ${projectType} with facility targeting...`);
    
    let activities: ActivityData[];
    const categories = [
        { code: 'A', name: 'A. Receipts', displayOrder: 1 },
        { code: 'B', name: 'B. Expenditures', displayOrder: 2 },
        { code: 'C', name: 'C. SURPLUS / DEFICIT', displayOrder: 3, isComputed: true },
        { code: 'D', name: 'D. Financial Assets', displayOrder: 4 },
        { code: 'E', name: 'E. Financial Liabilities', displayOrder: 5 },
        { code: 'F', name: 'F. Net Financial Assets', displayOrder: 6, isComputed: true },
        { code: 'G', name: 'G. Closing Balance', displayOrder: 7 },
    ];
    
    switch (projectType) {
        case 'HIV':
            activities = hivActivities;
            break;
        case 'MAL':
            activities = malariaActivities;
            break;
        case 'TB':
            activities = tbActivities;
            break;
    }
    
    // Seed categories for both facility types
    const facilityTypes: Array<'hospital' | 'health_center'> = ['hospital', 'health_center'];
    for (const facilityType of facilityTypes) {
        await seedExecutionCategoriesForProgramAndFacility(db, projectType, facilityType, categories);
    }
    
    // Seed activities (this will handle facility targeting internally)
    await seedExecutionActivitiesForProgramInternal(db, projectType, activities);
    
    console.log(`ENHANCED: Finished seeding execution data for ${projectType} with facility targeting`);
}

// VALIDATION: Function to verify the enhancement worked correctly
export async function validateExecutionActivitiesByFacility(db: Database) {
    console.log('VALIDATION: Checking execution activities by facility type...');
    
    try {
        const results = await db.execute(`
            SELECT 
                da.project_type,
                da.facility_type,
                COUNT(*) as activity_count,
                COUNT(CASE WHEN da.is_total_row = true THEN 1 END) as total_rows,
                COUNT(CASE WHEN da.is_total_row = false THEN 1 END) as item_rows
            FROM dynamic_activities da
            WHERE da.module_type = 'execution'
            GROUP BY da.project_type, da.facility_type
            ORDER BY da.project_type, da.facility_type
        `);

        console.log('VALIDATION RESULTS:');
        console.log('Project Type | Facility Type | Activities | Total Rows | Item Rows');
        console.log('-------------|---------------|------------|------------|----------');
        
        for (const row of results as any[]) {
            console.log(`${row.project_type.padEnd(11)} | ${(row.facility_type || 'null').padEnd(13)} | ${String(row.activity_count).padEnd(10)} | ${String(row.total_rows).padEnd(10)} | ${String(row.item_rows)}`);
        }

        // Additional validation: Check that we have both facility types for each project
        const facilityCheck = await db.execute(`
            SELECT 
                project_type,
                COUNT(DISTINCT facility_type) as facility_types_count,
                array_agg(DISTINCT facility_type) as facility_types
            FROM dynamic_activities 
            WHERE module_type = 'execution'
            GROUP BY project_type
        `);

        console.log('\nFACILITY TYPE COVERAGE:');
        for (const row of facilityCheck as any[]) {
            const expectedTypes = 2; // hospital and health_center
            const actualTypes = row.facility_types_count;
            const status = actualTypes === expectedTypes ? 'OK' : 'MISSING';
            console.log(`${row.project_type}: ${actualTypes}/${expectedTypes} facility types ${status} - ${row.facility_types}`);
        }

        return results;
        
    } catch (error) {
        console.error('VALIDATION ERROR:', error);
        throw error;
    }
}

// COMPATIBILITY: Keep the original function signature but enhance it internally
async function seedExecutionCategoriesForProgramInternal(db: Database, projectType: 'HIV' | 'MAL' | 'TB', categories: CategoryData[]) {
    // Use the enhanced version that handles both facility types
    const facilityTypes: Array<'hospital' | 'health_center'> = ['hospital', 'health_center'];
    for (const facilityType of facilityTypes) {
        await seedExecutionCategoriesForProgramAndFacility(db, projectType, facilityType, categories);
    }
}

export function buildExecutionActivitiesQuery(
    projectType: 'HIV' | 'Malaria' | 'TB',
    facilityType: 'hospital' | 'health_center'
) {
    return and(
        eq(schema.dynamicActivities.projectType, projectType as any),
        eq(schema.dynamicActivities.facilityType, facilityType),
        eq(schema.dynamicActivities.moduleType, 'execution'), // Critical filter
        eq(schema.dynamicActivities.isActive, true)
    );
}

// Default export for compatibility with existing seeder structure
export default async function seedExecutionData(db: Database) {
    console.log('ENHANCED: Starting execution data seeding with facility targeting...');
    
    await seedExecutionCategories(db);
    await seedExecutionActivities(db);
    
    // Run validation to ensure everything worked correctly
    await validateExecutionActivitiesByFacility(db);
    
    console.log('ENHANCED: Execution data seeding completed with facility targeting verification');
}