import { useMemo } from 'react';
import { generateExpenseToPayableMapping } from '../utils/expense-to-payable-mapping';

/**
 * Payment status for an expense
 */
export type PaymentStatus = 'paid' | 'unpaid' | 'partial';

/**
 * Expense form data with payment information
 */
export interface ExpenseFormData {
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  comment?: string;
  // Payment status can be either a single value (old format) or quarter-specific (new format)
  paymentStatus?: PaymentStatus | Record<string, PaymentStatus>;
  amountPaid?: number | Record<string, number>;
}

/**
 * Parameters for the expense calculations hook
 */
export interface UseExpenseCalculationsParams {
  formData: Record<string, ExpenseFormData>;
  openingBalance: number;
  activities: any;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
}

/**
 * Return value from the expense calculations hook
 */
export interface UseExpenseCalculationsReturn {
  cashAtBank: number;
  payables: Record<string, number>;
  totalExpenses: number;
  totalPaid: number;
  totalUnpaid: number;
}

/**
 * Custom hook to calculate Cash at Bank and Payables from expense payment data
 * 
 * This hook:
 * - Calculates total expenses, total paid, and total unpaid from Section B
 * - Computes Cash at Bank as opening balance minus total paid
 * - Computes payables by category using expense-to-payable mapping
 * - Uses useMemo for performance optimization
 * 
 * @param params - Hook parameters
 * @returns Calculated financial values
 */
export function useExpenseCalculations({
  formData,
  openingBalance,
  activities,
  quarter,
}: UseExpenseCalculationsParams): UseExpenseCalculationsReturn {
  // Generate expense-to-payable mapping from activities
  const expenseToPayableMapping = useMemo(() => {
    const mapping = generateExpenseToPayableMapping(activities);
    console.log('🗺️ [useExpenseCalculations] Expense-to-Payable Mapping:', {
      mappingCount: Object.keys(mapping).length,
      sampleMappings: Object.entries(mapping).slice(0, 5),
      allMappings: mapping,
    });
    return mapping;
  }, [activities]);

  // Calculate all financial values
  const calculations = useMemo(() => {
    console.log('🧮 [useExpenseCalculations] Starting calculation:', {
      openingBalance,
      quarter,
      activitiesAvailable: !!activities,
      sectionBAvailable: !!activities?.B,
      formDataKeysCount: Object.keys(formData).length,
    });

    // Get Section B expenses
    const sectionB = activities?.B;
    if (!sectionB?.subCategories) {
      console.log('⚠️ [useExpenseCalculations] No Section B found, returning defaults');
      return {
        cashAtBank: openingBalance,
        payables: {},
        totalExpenses: 0,
        totalPaid: 0,
        totalUnpaid: 0,
      };
    }

    // Extract all expense items from Section B
    const expenseItems: Array<{
      code: string;
      amount: number;
      amountPaid: number;
      payableCode: string | null;
    }> = [];

    Object.entries(sectionB.subCategories).forEach(([subCatCode, subCatData]: [string, any]) => {
      const items = subCatData.items || [];

      items.forEach((item: any) => {
        if (item.isTotalRow || item.isComputed) {
          return;
        }

        const expenseCode = item.code;
        const expenseData = formData[expenseCode];

        if (!expenseData) {
          return;
        }

        // Get the amount for the current quarter
        const quarterKey = quarter.toLowerCase() as 'q1' | 'q2' | 'q3' | 'q4';
        const amount = Number(expenseData[quarterKey]) || 0;

        // Get quarter-specific payment status (support both old and new format)
        const paymentStatusData = expenseData.paymentStatus;
        const amountPaidData = expenseData.amountPaid;
        
        const paymentStatus = amount > 0
          ? (typeof paymentStatusData === 'object' && paymentStatusData !== null
              ? (paymentStatusData[quarterKey] || 'unpaid')
              : (paymentStatusData || 'unpaid'))
          : 'unpaid';
        
        let amountPaid = 0;

        if (amount > 0) {
          if (paymentStatus === 'paid') {
            amountPaid = amount;
          } else if (paymentStatus === 'partial') {
            amountPaid = typeof amountPaidData === 'object' && amountPaidData !== null
              ? (Number(amountPaidData[quarterKey]) || 0)
              : (Number(amountPaidData) || 0);
          }
        }

        // Get the corresponding payable code
        const payableCode = expenseToPayableMapping[expenseCode] || null;
        
        // Debug: Log each expense item with its mapping
        if (amount > 0) {
          console.log(`💸 [Expense Item] ${expenseCode}:`, {
            name: item.name,
            amount,
            amountPaid,
            unpaid: amount - amountPaid,
            payableCode,
            paymentStatus,
            subCategory: subCatCode,
          });
        }

        expenseItems.push({
          code: expenseCode,
          amount,
          amountPaid,
          payableCode,
        });
      });
    });

    // Calculate totals
    const totalExpenses = expenseItems.reduce((sum, item) => sum + item.amount, 0);
    const totalPaid = expenseItems.reduce((sum, item) => sum + item.amountPaid, 0);
    const totalUnpaid = totalExpenses - totalPaid;

    // Calculate Cash at Bank
    const cashAtBank = openingBalance - totalPaid;

    // Calculate payables by category
    const payables: Record<string, number> = {};

    expenseItems.forEach((item) => {
      const unpaidAmount = item.amount - item.amountPaid;

      // Only add to payables if there's an unpaid amount and a valid payable code
      if (unpaidAmount > 0 && item.payableCode) {
        payables[item.payableCode] = (payables[item.payableCode] || 0) + unpaidAmount;
      }
    });

    console.log('✅ [useExpenseCalculations] Calculation complete:', {
      expenseItemsCount: expenseItems.length,
      expenseItemsWithAmount: expenseItems.filter(e => e.amount > 0).length,
      expenseItemsWithUnpaid: expenseItems.filter(e => e.amount - e.amountPaid > 0).length,
      expenseItemsWithPayableCode: expenseItems.filter(e => e.payableCode !== null).length,
      totalExpenses,
      totalPaid,
      totalUnpaid,
      cashAtBank,
      payablesCount: Object.keys(payables).length,
      payables,
      sampleExpenseItems: expenseItems.slice(0, 3),
    });

    return {
      cashAtBank,
      payables,
      totalExpenses,
      totalPaid,
      totalUnpaid,
    };
  }, [formData, openingBalance, activities, quarter, expenseToPayableMapping]);

  return calculations;
}
