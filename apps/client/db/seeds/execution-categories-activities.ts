import type { Database } from "@/db";
import { seedCategories } from "./categories";
import { seedSubCategories } from "./sub-categories";
import { seedActivities } from "./activities";

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
}

// HIV execution categories (top-level only for now)
const hivCategories: CategoryData[] = [
    { code: 'A', name: 'A. Receipts', displayOrder: 1 },
    { code: 'B', name: 'B. Expenditures', displayOrder: 2 },
    { code: 'C', name: 'C. SURPLUS / DEFICIT', displayOrder: 3, isComputed: true },
    { code: 'D', name: 'D. Financial Assets', displayOrder: 4 },
    { code: 'E', name: 'E. Financial Liabilities', displayOrder: 5 },
    { code: 'F', name: 'F. Net Financial Assets', displayOrder: 6, isComputed: true },
    { code: 'G', name: 'G. Closing Balance', displayOrder: 7 },
];

// Malaria execution categories (top-level only for now)
const malariaCategories: CategoryData[] = [
    { code: 'A', name: 'A. Receipts', displayOrder: 1 },
    { code: 'B', name: 'B. Expenditures', displayOrder: 2 },
    { code: 'C', name: 'C. SURPLUS / DEFICIT', displayOrder: 3, isComputed: true },
    { code: 'D', name: 'D. Financial Assets', displayOrder: 4 },
    { code: 'E', name: 'E. Financial Liabilities', displayOrder: 5 },
    { code: 'F', name: 'F. Net Financial Assets', displayOrder: 6, isComputed: true },
    { code: 'G', name: 'G. Closing Balance', displayOrder: 7 },
];

// TB execution categories (top-level only for now)
const tbCategories: CategoryData[] = [
    { code: 'A', name: 'A. Receipts', displayOrder: 1 },
    { code: 'B', name: 'B. Expenditures', displayOrder: 2 },
    { code: 'C', name: 'C. SURPLUS / DEFICIT', displayOrder: 3, isComputed: true },
    { code: 'D', name: 'D. Financial Assets', displayOrder: 4 },
    { code: 'E', name: 'E. Financial Liabilities', displayOrder: 5 },
    { code: 'F', name: 'F. Net Financial Assets', displayOrder: 6, isComputed: true },
    { code: 'G', name: 'G. Closing Balance', displayOrder: 7 },
];

// HIV sub-categories mirror HIV structure for B.*
const hivSubCategories: SubCategoryData[] = [
    { categoryCode: 'B', code: 'B-01', name: 'Human Resources + BONUS', displayOrder: 1 },
    { categoryCode: 'B', code: 'B-02', name: 'Monitoring & Evaluation', displayOrder: 2 },
    { categoryCode: 'B', code: 'B-03', name: 'Living Support to Clients/Target Populations', displayOrder: 3 },
    { categoryCode: 'B', code: 'B-04', name: 'Overheads (22 - Use of goods & services)', displayOrder: 4 },
    { categoryCode: 'B', code: 'B-05', name: 'Transfer to other reporting entities', displayOrder: 5 },
];

// Malaria/TB sub-categories mirror HIV structure for B.*
const malariaSubCategories: SubCategoryData[] = [
    { categoryCode: 'B', code: 'B-01', name: 'Human Resources + BONUS', displayOrder: 1 },
    { categoryCode: 'B', code: 'B-02', name: 'Monitoring & Evaluation', displayOrder: 2 },
    { categoryCode: 'B', code: 'B-03', name: 'Living Support to Clients/Target Populations', displayOrder: 3 },
    { categoryCode: 'B', code: 'B-04', name: 'Overheads (22 - Use of goods & services)', displayOrder: 4 },
    { categoryCode: 'B', code: 'B-05', name: 'Transfer to other reporting entities', displayOrder: 5 },
];
const tbSubCategories: SubCategoryData[] = [
    { categoryCode: 'B', code: 'B-01', name: 'Human Resources + BONUS', displayOrder: 1 },
    { categoryCode: 'B', code: 'B-02', name: 'Monitoring & Evaluation', displayOrder: 2 },
    { categoryCode: 'B', code: 'B-03', name: 'Living Support to Clients/Target Populations', displayOrder: 3 },
    { categoryCode: 'B', code: 'B-04', name: 'Overheads (22 - Use of goods & services)', displayOrder: 4 },
    { categoryCode: 'B', code: 'B-05', name: 'Transfer to other reporting entities', displayOrder: 5 },
];

// HIV execution activities
const hivActivities: ActivityData[] = [
    // A. Receipts
    { categoryCode: 'A', subCategoryCode: null, name: 'Other Incomes', displayOrder: 1, isTotalRow: false, activityType: 'REVENUE' },
    { categoryCode: 'A', subCategoryCode: null, name: 'Transfers from SPIU/RBC', displayOrder: 2, isTotalRow: false, activityType: 'REVENUE' },
    { categoryCode: 'A', subCategoryCode: null, name: 'A. Receipts', displayOrder: 3, isTotalRow: true, activityType: 'REVENUE_TOTAL' },

    // B. Expenditures - Human Resources + BONUS
    { categoryCode: 'B', subCategoryCode: 'B-01', name: 'Laboratory Technician', displayOrder: 1, isTotalRow: false, activityType: 'EXPENSE' },
    { categoryCode: 'B', subCategoryCode: 'B-01', name: 'Nurse', displayOrder: 2, isTotalRow: false, activityType: 'EXPENSE' },

    // B. Expenditures - Monitoring & Evaluation
    { categoryCode: 'B', subCategoryCode: 'B-02', name: 'Supervision CHWs', displayOrder: 1, isTotalRow: false, activityType: 'EXPENSE' },
    { categoryCode: 'B', subCategoryCode: 'B-02', name: 'Support group meetings', displayOrder: 2, isTotalRow: false, activityType: 'EXPENSE' },

    // B. Expenditures - Living Support to Clients
    { categoryCode: 'B', subCategoryCode: 'B-03', name: 'Sample transport', displayOrder: 1, isTotalRow: false, activityType: 'EXPENSE' },
    { categoryCode: 'B', subCategoryCode: 'B-03', name: 'Home visit lost to follow up', displayOrder: 2, isTotalRow: false, activityType: 'EXPENSE' },
    { categoryCode: 'B', subCategoryCode: 'B-03', name: 'Transport and travel for survey/surveillance', displayOrder: 3, isTotalRow: false, activityType: 'EXPENSE' },

    // B. Expenditures - Overheads
    { categoryCode: 'B', subCategoryCode: 'B-04', name: 'Infrastructure support', displayOrder: 1, isTotalRow: false, activityType: 'EXPENSE' },
    { categoryCode: 'B', subCategoryCode: 'B-04', name: 'Office supplies', displayOrder: 2, isTotalRow: false, activityType: 'EXPENSE' },
    { categoryCode: 'B', subCategoryCode: 'B-04', name: 'Transport and travel (Reporting)', displayOrder: 3, isTotalRow: false, activityType: 'EXPENSE' },
    { categoryCode: 'B', subCategoryCode: 'B-04', name: 'Bank charges', displayOrder: 4, isTotalRow: false, activityType: 'EXPENSE' },

    // B. Expenditures - Transfer to other entities
    { categoryCode: 'B', subCategoryCode: 'B-05', name: 'Transfer to RBC', displayOrder: 1, isTotalRow: false, activityType: 'EXPENSE' },

    // B. Expenditures Total (no subcategory)
    { categoryCode: 'B', subCategoryCode: null, name: 'B. Expenditures', displayOrder: 99, isTotalRow: true, activityType: 'EXPENSE_TOTAL' },

    // D. Financial Assets
    { categoryCode: 'D', subCategoryCode: null, name: 'Cash at bank', displayOrder: 1, isTotalRow: false, activityType: 'ASSET' },
    { categoryCode: 'D', subCategoryCode: null, name: 'Petty cash', displayOrder: 2, isTotalRow: false, activityType: 'ASSET' },
    { categoryCode: 'D', subCategoryCode: null, name: 'Receivables (VAT refund)', displayOrder: 3, isTotalRow: false, activityType: 'ASSET' },
    { categoryCode: 'D', subCategoryCode: null, name: 'Other Receivables', displayOrder: 4, isTotalRow: false, activityType: 'ASSET' },
    { categoryCode: 'D', subCategoryCode: null, name: 'D. Financial Assets', displayOrder: 5, isTotalRow: true, activityType: 'ASSET_TOTAL' },

    // E. Financial Liabilities
    { categoryCode: 'E', subCategoryCode: null, name: 'Salaries on borrowed funds (BONUS)', displayOrder: 1, isTotalRow: false, activityType: 'LIABILITY' },
    { categoryCode: 'E', subCategoryCode: null, name: 'Payable - Maintenance & Repairs', displayOrder: 2, isTotalRow: false, activityType: 'LIABILITY' },
    { categoryCode: 'E', subCategoryCode: null, name: 'Payable - Office suppliers', displayOrder: 3, isTotalRow: false, activityType: 'LIABILITY' },
    { categoryCode: 'E', subCategoryCode: null, name: 'Payable - Transportation fees', displayOrder: 4, isTotalRow: false, activityType: 'LIABILITY' },
    { categoryCode: 'E', subCategoryCode: null, name: 'VAT refund to RBC', displayOrder: 5, isTotalRow: false, activityType: 'LIABILITY' },
    { categoryCode: 'E', subCategoryCode: null, name: 'E. Financial Liabilities', displayOrder: 6, isTotalRow: true, activityType: 'LIABILITY_TOTAL' },

    // F. Net Financial Assets (represented as a single total row like HIV)
    { categoryCode: 'F', subCategoryCode: null, name: 'F. Net Financial Assets', displayOrder: 1, isTotalRow: true, activityType: 'COMPUTED', computationRules: { formula: 'D - E', description: 'Financial Assets minus Financial Liabilities' } },

    // G. Closing Balance
    { categoryCode: 'G', subCategoryCode: null, name: 'Accumulated Surplus/Deficit', displayOrder: 1, isTotalRow: false, activityType: 'EQUITY' },
    { categoryCode: 'G', subCategoryCode: null, name: 'Prior Year Adjustment', displayOrder: 2, isTotalRow: false, activityType: 'EQUITY' },
    { categoryCode: 'G', subCategoryCode: null, name: 'Surplus/Deficit of the Period', displayOrder: 3, isTotalRow: false, activityType: 'COMPUTED', computationRules: { formula: 'A - B', description: 'Receipts minus Expenditures' } },
    { categoryCode: 'G', subCategoryCode: null, name: 'G. Closing Balance', displayOrder: 4, isTotalRow: true, activityType: 'EQUITY_TOTAL' },
];

// Malaria execution activities (mirrors HIV structure)
const malariaActivities: ActivityData[] = [
    // A. Receipts
    { categoryCode: 'A', subCategoryCode: null, name: 'Other Incomes', displayOrder: 1, isTotalRow: false, activityType: 'REVENUE' },
    { categoryCode: 'A', subCategoryCode: null, name: 'Transfers from SPIU/RBC', displayOrder: 2, isTotalRow: false, activityType: 'REVENUE' },
    { categoryCode: 'A', subCategoryCode: null, name: 'A. Receipts', displayOrder: 3, isTotalRow: true, activityType: 'REVENUE_TOTAL' },

    // B. Expenditures - Human Resources + BONUS
    { categoryCode: 'B', subCategoryCode: 'B-01', name: 'Laboratory Technician', displayOrder: 1, isTotalRow: false, activityType: 'EXPENSE' },
    { categoryCode: 'B', subCategoryCode: 'B-01', name: 'Nurse', displayOrder: 2, isTotalRow: false, activityType: 'EXPENSE' },

    // B. Expenditures - Monitoring & Evaluation
    { categoryCode: 'B', subCategoryCode: 'B-02', name: 'Supervision CHWs', displayOrder: 1, isTotalRow: false, activityType: 'EXPENSE' },
    { categoryCode: 'B', subCategoryCode: 'B-02', name: 'Support group meetings', displayOrder: 2, isTotalRow: false, activityType: 'EXPENSE' },

    // B. Expenditures - Living Support to Clients
    { categoryCode: 'B', subCategoryCode: 'B-03', name: 'Sample transport', displayOrder: 1, isTotalRow: false, activityType: 'EXPENSE' },
    { categoryCode: 'B', subCategoryCode: 'B-03', name: 'Home visit lost to follow up', displayOrder: 2, isTotalRow: false, activityType: 'EXPENSE' },
    { categoryCode: 'B', subCategoryCode: 'B-03', name: 'Transport and travel for survey/surveillance', displayOrder: 3, isTotalRow: false, activityType: 'EXPENSE' },

    // B. Expenditures - Overheads
    { categoryCode: 'B', subCategoryCode: 'B-04', name: 'Infrastructure support', displayOrder: 1, isTotalRow: false, activityType: 'EXPENSE' },
    { categoryCode: 'B', subCategoryCode: 'B-04', name: 'Office supplies', displayOrder: 2, isTotalRow: false, activityType: 'EXPENSE' },
    { categoryCode: 'B', subCategoryCode: 'B-04', name: 'Transport and travel (Reporting)', displayOrder: 3, isTotalRow: false, activityType: 'EXPENSE' },
    { categoryCode: 'B', subCategoryCode: 'B-04', name: 'Bank charges', displayOrder: 4, isTotalRow: false, activityType: 'EXPENSE' },

    // B. Expenditures - Transfer to other entities
    { categoryCode: 'B', subCategoryCode: 'B-05', name: 'Transfer to RBC', displayOrder: 1, isTotalRow: false, activityType: 'EXPENSE' },

    // B. Expenditures Total (no subcategory)
    { categoryCode: 'B', subCategoryCode: null, name: 'B. Expenditures', displayOrder: 99, isTotalRow: true, activityType: 'EXPENSE_TOTAL' },

    // D. Financial Assets
    { categoryCode: 'D', subCategoryCode: null, name: 'Cash at bank', displayOrder: 1, isTotalRow: false, activityType: 'ASSET' },
    { categoryCode: 'D', subCategoryCode: null, name: 'Petty cash', displayOrder: 2, isTotalRow: false, activityType: 'ASSET' },
    { categoryCode: 'D', subCategoryCode: null, name: 'Receivables (VAT refund)', displayOrder: 3, isTotalRow: false, activityType: 'ASSET' },
    { categoryCode: 'D', subCategoryCode: null, name: 'Other Receivables', displayOrder: 4, isTotalRow: false, activityType: 'ASSET' },
    { categoryCode: 'D', subCategoryCode: null, name: 'D. Financial Assets', displayOrder: 5, isTotalRow: true, activityType: 'ASSET_TOTAL' },

    // E. Financial Liabilities
    { categoryCode: 'E', subCategoryCode: null, name: 'Salaries on borrowed funds (BONUS)', displayOrder: 1, isTotalRow: false, activityType: 'LIABILITY' },
    { categoryCode: 'E', subCategoryCode: null, name: 'Payable - Maintenance & Repairs', displayOrder: 2, isTotalRow: false, activityType: 'LIABILITY' },
    { categoryCode: 'E', subCategoryCode: null, name: 'Payable - Office suppliers', displayOrder: 3, isTotalRow: false, activityType: 'LIABILITY' },
    { categoryCode: 'E', subCategoryCode: null, name: 'Payable - Transportation fees', displayOrder: 4, isTotalRow: false, activityType: 'LIABILITY' },
    { categoryCode: 'E', subCategoryCode: null, name: 'VAT refund to RBC', displayOrder: 5, isTotalRow: false, activityType: 'LIABILITY' },
    { categoryCode: 'E', subCategoryCode: null, name: 'E. Financial Liabilities', displayOrder: 6, isTotalRow: true, activityType: 'LIABILITY_TOTAL' },

    // F. Net Financial Assets (represented as a single total row like HIV)
    { categoryCode: 'F', subCategoryCode: null, name: 'F. Net Financial Assets', displayOrder: 1, isTotalRow: true, activityType: 'COMPUTED', computationRules: { formula: 'D - E', description: 'Financial Assets minus Financial Liabilities' } },

    // G. Closing Balance
    { categoryCode: 'G', subCategoryCode: null, name: 'Accumulated Surplus/Deficit', displayOrder: 1, isTotalRow: false, activityType: 'EQUITY' },
    { categoryCode: 'G', subCategoryCode: null, name: 'Prior Year Adjustment', displayOrder: 2, isTotalRow: false, activityType: 'EQUITY' },
    { categoryCode: 'G', subCategoryCode: null, name: 'Surplus/Deficit of the Period', displayOrder: 3, isTotalRow: false, activityType: 'COMPUTED', computationRules: { formula: 'A - B', description: 'Receipts minus Expenditures' } },
    { categoryCode: 'G', subCategoryCode: null, name: 'G. Closing Balance', displayOrder: 4, isTotalRow: true, activityType: 'EQUITY_TOTAL' },
];

// TB execution activities (mirrors HIV structure)
const tbActivities: ActivityData[] = [
    // A. Receipts
    { categoryCode: 'A', subCategoryCode: null, name: 'Other Incomes', displayOrder: 1, isTotalRow: false },
    { categoryCode: 'A', subCategoryCode: null, name: 'Transfers from SPIU/RBC', displayOrder: 2, isTotalRow: false },
    { categoryCode: 'A', subCategoryCode: null, name: 'A. Receipts', displayOrder: 3, isTotalRow: true },

    // B. Expenditures - Human Resources + BONUS
    { categoryCode: 'B', subCategoryCode: 'B-01', name: 'Laboratory Technician', displayOrder: 1, isTotalRow: false },
    { categoryCode: 'B', subCategoryCode: 'B-01', name: 'Nurse', displayOrder: 2, isTotalRow: false },

    // B. Expenditures - Monitoring & Evaluation
    { categoryCode: 'B', subCategoryCode: 'B-02', name: 'Supervision CHWs', displayOrder: 1, isTotalRow: false },
    { categoryCode: 'B', subCategoryCode: 'B-02', name: 'Support group meetings', displayOrder: 2, isTotalRow: false },

    // B. Expenditures - Living Support to Clients
    { categoryCode: 'B', subCategoryCode: 'B-03', name: 'Sample transport', displayOrder: 1, isTotalRow: false },
    { categoryCode: 'B', subCategoryCode: 'B-03', name: 'Home visit lost to follow up', displayOrder: 2, isTotalRow: false },
    { categoryCode: 'B', subCategoryCode: 'B-03', name: 'Transport and travel for survey/surveillance', displayOrder: 3, isTotalRow: false },

    // B. Expenditures - Overheads
    { categoryCode: 'B', subCategoryCode: 'B-04', name: 'Infrastructure support', displayOrder: 1, isTotalRow: false },
    { categoryCode: 'B', subCategoryCode: 'B-04', name: 'Office supplies', displayOrder: 2, isTotalRow: false },
    { categoryCode: 'B', subCategoryCode: 'B-04', name: 'Transport and travel (Reporting)', displayOrder: 3, isTotalRow: false },
    { categoryCode: 'B', subCategoryCode: 'B-04', name: 'Bank charges', displayOrder: 4, isTotalRow: false },

    // B. Expenditures - Transfer to other entities
    { categoryCode: 'B', subCategoryCode: 'B-05', name: 'Transfer to RBC', displayOrder: 1, isTotalRow: false },

    // B. Expenditures Total (no subcategory)
    { categoryCode: 'B', subCategoryCode: null, name: 'B. Expenditures', displayOrder: 99, isTotalRow: true },

    // D. Financial Assets
    { categoryCode: 'D', subCategoryCode: null, name: 'Cash at bank', displayOrder: 1, isTotalRow: false },
    { categoryCode: 'D', subCategoryCode: null, name: 'Petty cash', displayOrder: 2, isTotalRow: false },
    { categoryCode: 'D', subCategoryCode: null, name: 'Receivables (VAT refund)', displayOrder: 3, isTotalRow: false },
    { categoryCode: 'D', subCategoryCode: null, name: 'Other Receivables', displayOrder: 4, isTotalRow: false },
    { categoryCode: 'D', subCategoryCode: null, name: 'D. Financial Assets', displayOrder: 5, isTotalRow: true },

    // E. Financial Liabilities
    { categoryCode: 'E', subCategoryCode: null, name: 'Salaries on borrowed funds (BONUS)', displayOrder: 1, isTotalRow: false },
    { categoryCode: 'E', subCategoryCode: null, name: 'Payable - Maintenance & Repairs', displayOrder: 2, isTotalRow: false },
    { categoryCode: 'E', subCategoryCode: null, name: 'Payable - Office suppliers', displayOrder: 3, isTotalRow: false },
    { categoryCode: 'E', subCategoryCode: null, name: 'Payable - Transportation fees', displayOrder: 4, isTotalRow: false },
    { categoryCode: 'E', subCategoryCode: null, name: 'VAT refund to RBC', displayOrder: 5, isTotalRow: false },
    { categoryCode: 'E', subCategoryCode: null, name: 'E. Financial Liabilities', displayOrder: 6, isTotalRow: true },

    // F. Net Financial Assets
    { categoryCode: 'F', subCategoryCode: null, name: 'F. Net Financial Assets', displayOrder: 1, isTotalRow: true },

    // G. Closing Balance
    { categoryCode: 'G', subCategoryCode: null, name: 'Accumulated Surplus/Deficit', displayOrder: 1, isTotalRow: false },
    { categoryCode: 'G', subCategoryCode: null, name: 'Prior Year Adjustment', displayOrder: 2, isTotalRow: false },
    { categoryCode: 'G', subCategoryCode: null, name: 'Surplus/Deficit of the Period', displayOrder: 3, isTotalRow: false },
    { categoryCode: 'G', subCategoryCode: null, name: 'G. Closing Balance', displayOrder: 4, isTotalRow: true },
];

/* eslint-disable no-console */
export default async function seed(db: Database) {
    console.log('Seeding execution categories and activities for Malaria and TB…');

    // Seed HIV (project code: 'HIV')
    await seedCategories(db, hivCategories, 'HIV');
    if (hivSubCategories.length > 0) {
        await seedSubCategories(db, hivSubCategories, 'HIV');
    }
    await seedActivities(db, hivActivities, 'HIV');

    // Seed Malaria (project code: 'MAL')
    await seedCategories(db, malariaCategories, 'MAL');
    if (malariaSubCategories.length > 0) {
        await seedSubCategories(db, malariaSubCategories, 'MAL');
    }
    await seedActivities(db, malariaActivities, 'MAL');

    // Seed TB (project code: 'TB')
    await seedCategories(db, tbCategories, 'TB');
    if (tbSubCategories.length > 0) {
        await seedSubCategories(db, tbSubCategories, 'TB');
    }
    await seedActivities(db, tbActivities, 'TB');

    console.log('Finished seeding execution categories and activities for Malaria and TB.');
}


