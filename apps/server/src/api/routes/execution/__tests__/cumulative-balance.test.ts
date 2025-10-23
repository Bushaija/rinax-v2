/**
 * Tests for cumulative balance calculation logic
 * Verifies correct handling of stock vs flow sections
 */

import { describe, it, expect } from 'vitest';
import { calculateCumulativeBalance } from '../execution.helpers';
import { recalculateExecutionData } from '../execution.recalculations';

describe('Cumulative Balance Calculation', () => {
  describe('Flow Sections (A, B, C)', () => {
    it('should sum all quarters for Section A (Receipts)', () => {
      const result = calculateCumulativeBalance(100, 150, 120, 180, 'A', null);
      expect(result).toBe(550); // 100 + 150 + 120 + 180
    });

    it('should sum all quarters for Section B (Expenditures)', () => {
      const result = calculateCumulativeBalance(80, 120, 100, 140, 'B', null);
      expect(result).toBe(440); // 80 + 120 + 100 + 140
    });

    it('should sum all quarters for Section C (Surplus/Deficit)', () => {
      const result = calculateCumulativeBalance(20, 30, 20, 40, 'C', null);
      expect(result).toBe(110); // 20 + 30 + 20 + 40
    });

    it('should treat undefined as 0 for flow sections', () => {
      const result = calculateCumulativeBalance(100, undefined, 120, undefined, 'A', null);
      expect(result).toBe(220); // 100 + 0 + 120 + 0
    });
  });

  describe('Stock Sections (D, E, F)', () => {
    it('should use latest quarter for Section D (Financial Assets)', () => {
      const result = calculateCumulativeBalance(50000, 65000, 48000, 72000, 'D', null);
      expect(result).toBe(72000); // Q4 value only
    });

    it('should use latest quarter for Section E (Financial Liabilities)', () => {
      const result = calculateCumulativeBalance(8000, 10000, 9000, 12000, 'E', null);
      expect(result).toBe(12000); // Q4 value only
    });

    it('should use latest quarter for Section F (Net Financial Assets)', () => {
      // F = D - E, so if D activities and E activities both use stock logic,
      // F activities should also use stock logic
      const result = calculateCumulativeBalance(42000, 55000, 39000, 60000, 'F', null);
      expect(result).toBe(60000); // Q4 value only, NOT sum
    });

    it('should fallback to earlier quarters if latest is undefined', () => {
      const result = calculateCumulativeBalance(50000, 65000, 48000, undefined, 'D', null);
      expect(result).toBe(48000); // Q3 value (Q4 is undefined)
    });

    it('should preserve explicit zero as a valid value', () => {
      const result = calculateCumulativeBalance(50000, 65000, 48000, 0, 'D', null);
      expect(result).toBe(0); // Q4 = 0 is valid
    });

    it('should return undefined if all quarters are undefined', () => {
      const result = calculateCumulativeBalance(undefined, undefined, undefined, undefined, 'D', null);
      expect(result).toBeUndefined();
    });
  });

  describe('Section G (Mixed Logic)', () => {
    it('should use flow logic for surplus/deficit items', () => {
      const result = calculateCumulativeBalance(
        10, 20, 15, 25, 
        'G', null, 
        'HIV_EXEC_HOSPITAL_G_3', 
        'Surplus/Deficit of the Period'
      );
      expect(result).toBe(70); // Sum: 10 + 20 + 15 + 25
    });

    it('should use stock logic for balance items', () => {
      const result = calculateCumulativeBalance(
        100000, 120000, 115000, 130000, 
        'G', null, 
        'HIV_EXEC_HOSPITAL_G_1', 
        'Accumulated Surplus/Deficit'
      );
      expect(result).toBe(130000); // Latest: Q4
    });
  });

  describe('Subsection Override', () => {
    it('should use subsection classification over section', () => {
      // B-01 is a subsection of B, should use flow logic
      const result = calculateCumulativeBalance(10, 20, 15, 25, 'B', 'B-01');
      expect(result).toBe(70); // Sum
    });
  });
});

describe('Recalculation Integration', () => {
  it('should correctly recalculate mixed stock and flow sections', () => {
    const formData = {
      quarter: 'Q4',
      activities: {
        'HIV_EXEC_HOSPITAL_A_1': { 
          code: 'HIV_EXEC_HOSPITAL_A_1', 
          name: 'Government Grants',
          q1: 100000, q2: 150000, q3: 120000, q4: 180000 
        },
        'HIV_EXEC_HOSPITAL_B_B-01_1': { 
          code: 'HIV_EXEC_HOSPITAL_B_B-01_1', 
          name: 'Salaries',
          q1: 80000, q2: 120000, q3: 100000, q4: 140000 
        },
        'HIV_EXEC_HOSPITAL_D_1': { 
          code: 'HIV_EXEC_HOSPITAL_D_1', 
          name: 'Cash in Bank',
          q1: 50000, q2: 65000, q3: 48000, q4: 72000 
        },
        'HIV_EXEC_HOSPITAL_E_1': { 
          code: 'HIV_EXEC_HOSPITAL_E_1', 
          name: 'Accounts Payable',
          q1: 8000, q2: 10000, q3: 9000, q4: 12000 
        },
        'HIV_EXEC_HOSPITAL_F_1': { 
          code: 'HIV_EXEC_HOSPITAL_F_1', 
          name: 'Net Financial Assets',
          q1: 42000, q2: 55000, q3: 39000, q4: 60000 
        },
      }
    };

    const context = {
      projectType: 'HIV',
      facilityType: 'hospital',
      quarter: 'Q4'
    };

    const result = recalculateExecutionData(formData, context);

    // Flow section A: should sum all quarters
    expect(result.activities['HIV_EXEC_HOSPITAL_A_1'].cumulative_balance).toBe(550000);

    // Flow section B: should sum all quarters
    expect(result.activities['HIV_EXEC_HOSPITAL_B_B-01_1'].cumulative_balance).toBe(440000);

    // Stock section D: should use Q4 value only
    expect(result.activities['HIV_EXEC_HOSPITAL_D_1'].cumulative_balance).toBe(72000);

    // Stock section E: should use Q4 value only
    expect(result.activities['HIV_EXEC_HOSPITAL_E_1'].cumulative_balance).toBe(12000);

    // Stock section F: should use Q4 value only (NOT sum)
    expect(result.activities['HIV_EXEC_HOSPITAL_F_1'].cumulative_balance).toBe(60000);
    expect(result.activities['HIV_EXEC_HOSPITAL_F_1'].cumulative_balance).not.toBe(196000); // NOT the sum
  });

  it('should correctly aggregate rollups with mixed logic', () => {
    const formData = {
      quarter: 'Q4',
      activities: {
        'HIV_EXEC_HOSPITAL_D_1': { 
          code: 'HIV_EXEC_HOSPITAL_D_1', 
          name: 'Cash in Bank',
          q1: 50000, q2: 65000, q3: 48000, q4: 72000 
        },
        'HIV_EXEC_HOSPITAL_D_2': { 
          code: 'HIV_EXEC_HOSPITAL_D_2', 
          name: 'Accounts Receivable',
          q1: 10000, q2: 12000, q3: 15000, q4: 18000 
        },
      }
    };

    const context = {
      projectType: 'HIV',
      facilityType: 'hospital',
      quarter: 'Q4'
    };

    const result = recalculateExecutionData(formData, context);

    // Each activity should use Q4 value
    expect(result.activities['HIV_EXEC_HOSPITAL_D_1'].cumulative_balance).toBe(72000);
    expect(result.activities['HIV_EXEC_HOSPITAL_D_2'].cumulative_balance).toBe(18000);

    // Section D rollup should sum the cumulative balances (which are Q4 values)
    expect(result.rollups.bySection['D'].total).toBe(90000); // 72000 + 18000
  });
});

describe('Bug Fix Verification', () => {
  it('should NOT sum quarters for Section F (the bug we fixed)', () => {
    // This test verifies the bug fix
    // Before fix: F was classified as flow, would sum to 196000
    // After fix: F is classified as stock, should use Q4 value of 60000
    
    const q1 = 42000;
    const q2 = 55000;
    const q3 = 39000;
    const q4 = 60000;
    
    const result = calculateCumulativeBalance(q1, q2, q3, q4, 'F', null);
    
    // Correct behavior (stock): use latest quarter
    expect(result).toBe(60000);
    
    // Incorrect behavior (flow): sum all quarters
    expect(result).not.toBe(196000);
  });

  it('should maintain F = D - E relationship with stock logic', () => {
    // Verify that F inherits stock behavior from D and E
    const D_values = { q1: 50000, q2: 65000, q3: 48000, q4: 72000 };
    const E_values = { q1: 8000, q2: 10000, q3: 9000, q4: 12000 };
    
    // Calculate D and E using stock logic
    const D_cumulative = calculateCumulativeBalance(
      D_values.q1, D_values.q2, D_values.q3, D_values.q4, 'D', null
    );
    const E_cumulative = calculateCumulativeBalance(
      E_values.q1, E_values.q2, E_values.q3, E_values.q4, 'E', null
    );
    
    // F should be the difference of the latest quarter values
    const F_expected = D_cumulative! - E_cumulative!;
    expect(F_expected).toBe(60000); // 72000 - 12000
    
    // If F had its own activities, they should also use stock logic
    const F_cumulative = calculateCumulativeBalance(
      D_values.q1 - E_values.q1,
      D_values.q2 - E_values.q2,
      D_values.q3 - E_values.q3,
      D_values.q4 - E_values.q4,
      'F', null
    );
    
    expect(F_cumulative).toBe(F_expected);
  });
});

describe('computeRollups Fix Verification', () => {
  it('should use cumulative_balance for rollup totals (not sum quarters)', () => {
    // Import the functions we need to test
    const { addCumulativeBalances, toKeyedActivities } = require('../execution.helpers');
    const { computeRollups } = require('../execution.helpers');
    
    // Create test activities with stock section (D)
    const activities = [
      {
        code: 'HIV_EXEC_HOSPITAL_D_1',
        name: 'Cash in Bank',
        q1: 50000,
        q2: 65000,
        q3: 48000,
        q4: 72000
      },
      {
        code: 'HIV_EXEC_HOSPITAL_D_2',
        name: 'Accounts Receivable',
        q1: 10000,
        q2: 12000,
        q3: 15000,
        q4: 18000
      }
    ];
    
    // Convert to keyed format and add cumulative balances
    const keyed = toKeyedActivities(activities);
    const withBalances = addCumulativeBalances(keyed);
    
    // Verify cumulative_balance is set correctly (stock logic: latest quarter)
    expect(withBalances['HIV_EXEC_HOSPITAL_D_1'].cumulative_balance).toBe(72000);
    expect(withBalances['HIV_EXEC_HOSPITAL_D_2'].cumulative_balance).toBe(18000);
    
    // Compute rollups
    const rollups = computeRollups(withBalances);
    
    // CRITICAL: Section D total should use cumulative_balance (90000)
    // NOT sum of all quarters (235000)
    expect(rollups.bySection['D'].total).toBe(90000); // 72000 + 18000
    expect(rollups.bySection['D'].total).not.toBe(235000); // NOT (50000+65000+48000+72000) + (10000+12000+15000+18000)
  });

  it('should handle flow sections correctly (sum quarters)', () => {
    const { addCumulativeBalances, toKeyedActivities, computeRollups } = require('../execution.helpers');
    
    // Create test activities with flow section (A)
    const activities = [
      {
        code: 'HIV_EXEC_HOSPITAL_A_1',
        name: 'Government Grants',
        q1: 100000,
        q2: 150000,
        q3: 120000,
        q4: 180000
      }
    ];
    
    const keyed = toKeyedActivities(activities);
    const withBalances = addCumulativeBalances(keyed);
    
    // Verify cumulative_balance is set correctly (flow logic: sum quarters)
    expect(withBalances['HIV_EXEC_HOSPITAL_A_1'].cumulative_balance).toBe(550000);
    
    // Compute rollups
    const rollups = computeRollups(withBalances);
    
    // Section A total should use cumulative_balance (which is sum for flow)
    expect(rollups.bySection['A'].total).toBe(550000);
  });

  it('should fallback to summing quarters if cumulative_balance is not set', () => {
    const { computeRollups } = require('../execution.helpers');
    
    // Activity without cumulative_balance
    const activities = {
      'TEST_A_1': {
        code: 'TEST_A_1',
        section: 'A',
        q1: 100,
        q2: 200,
        q3: 300,
        q4: 400
        // No cumulative_balance set
      }
    };
    
    const rollups = computeRollups(activities);
    
    // Should fallback to summing quarters
    expect(rollups.bySection['A'].total).toBe(1000); // 100 + 200 + 300 + 400
  });
});
