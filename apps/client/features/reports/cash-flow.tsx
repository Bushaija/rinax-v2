"use client";

import React from 'react';
import { formatCurrency } from '@/features/planning/utils';

export type CashFlowRow = {
  description: string;
  note: number | null;
  current: number | null;
  previous: number | null;
  isTotal: boolean;
  isSubtotal: boolean;
};

interface Props {
  initialData: CashFlowRow[];
  currentPeriodLabel: string;
  previousPeriodLabel: string;
}

export function CashFlowStatement({ initialData, currentPeriodLabel, previousPeriodLabel }: Props) {
  if (!initialData) return null;

  /**
   * Determines if a row represents an expense/outflow that should be displayed with a negative sign
   * Includes specific expense categories as requested by accounting team:
   * - Compensation of employees
   * - Goods and services
   * - Grants and transfers (outgoing only, not incoming transfers)
   * - Subsidies
   * - Social assistance
   * - Finance costs
   * - Other expenses
   */
  const isExpenseRow = (description: string): boolean => {
    const descLower = description.toLowerCase();

    // Revenue items that should NOT be treated as expenses (even if they contain expense keywords)
    const revenueExceptions = [
      'transfers from',  // "Transfers from public entities", "Transfers from central treasury"
      'transfer from',
      'receipt',
      'revenue',
      'income',
      'grant received',
      'grants received'
    ];

    // Check if this is a revenue item first
    if (revenueExceptions.some(exception => descLower.includes(exception))) {
      return false;
    }

    // Specific expense categories (exact matches or partial matches)
    const expenseCategories = [
      'compensation of employee',
      'goods and service',
      'grants and transfer',  // More specific - only matches "Grants and transfers" (expense line)
      'subsid',  // matches subsidies, subsidy
      'social assistance',
      'finance cost',
      'other expense'
    ];

    // General expense keywords
    const expenseKeywords = [
      'payment', 'expense', 'purchase', 'decrease', 'outflow',
      'paid', 'cost', 'expenditure', 'disbursement', 'withdrawal'
    ];

    // Check if description matches any expense category or keyword
    return expenseCategories.some(category => descLower.includes(category)) ||
      expenseKeywords.some(keyword => descLower.includes(keyword));
  };

  /**
   * Formats currency value with negative sign for expenses (display only)
   * Does not modify the actual value, only the display representation
   */
  const formatCashFlowValue = (value: number | null, description: string): string => {
    if (value === null) return '';

    // If it's an expense row and the value is positive, display it as negative
    if (isExpenseRow(description) && value > 0) {
      return `(${formatCurrency(value)})`;
    }

    // If value is already negative, format with parentheses
    if (value < 0) {
      return `(${formatCurrency(Math.abs(value))})`;
    }

    // Positive values (receipts, inflows) display normally
    return formatCurrency(value);
  };

  const renderRow = (row: CashFlowRow, idx: number) => {
    const rowClass = `${row.isSubtotal ? 'font-semibold' : ''} ${row.isTotal ? 'font-bold border-t-2' : ''}`;
    return (
      <tr key={idx} className={rowClass}>
        <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-700">{row.description}</td>
        <td className="px-6 py-2 text-center text-sm text-gray-700">{row.note ?? ''}</td>
        <td className="px-6 py-2 text-right text-sm text-gray-900">{formatCashFlowValue(row.current, row.description)}</td>
        <td className="px-6 py-2 text-right text-sm text-gray-900">{formatCashFlowValue(row.previous, row.description)}</td>
      </tr>
    );
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
      <table className="min-w-full bg-white">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Note</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{currentPeriodLabel}</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{previousPeriodLabel}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {initialData.map(renderRow)}
        </tbody>
      </table>
    </div>
  );
} 