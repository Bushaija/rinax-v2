# Debug Guide: Payment Tracking Display Issue

## Current Issue
Cash at Bank is showing a dash (-) instead of the opening balance value (85,000).

## Debug Logs Added

I've added comprehensive console logging throughout the payment tracking flow. Here's what to look for in the browser console:

### 1. Opening Balance Detection
Look for logs starting with `🔍 [Opening Balance]`:

```javascript
🔍 [Opening Balance] Debug: {
  openingBalanceCode: "HIV_EXEC_HOSPITAL_A_2",  // The code we're looking for
  quarterKey: "q1",                              // Which quarter
  formDataKeys: [...],                           // First 10 keys in formData
  formDataEntry: { q1: 85000, q2: 0, ... },     // The actual data for this code
  extractedValue: 85000,                         // The value we extracted
  allFormDataSample: [...]                       // Sample of formData entries
}
```

**What to check:**
- Is `openingBalanceCode` correct for your program/facility?
- Does `formDataEntry` exist and have the right value?
- Is `extractedValue` correct (should be 85000)?

### 2. Expense Calculations
Look for logs starting with `🧮 [useExpenseCalculations]`:

```javascript
🧮 [useExpenseCalculations] Starting calculation: {
  openingBalance: 85000,                         // Should match your opening balance
  quarter: "Q1",
  activitiesAvailable: true,                     // Should be true
  sectionBAvailable: true,                       // Should be true
  formDataKeysCount: 50                          // Number of form fields
}
```

**What to check:**
- Is `openingBalance` correct (85000)?
- Are `activitiesAvailable` and `sectionBAvailable` both true?

### 3. Calculation Results
Look for logs starting with `✅ [useExpenseCalculations]`:

```javascript
✅ [useExpenseCalculations] Calculation complete: {
  expenseItemsCount: 10,                         // Number of expense items found
  totalExpenses: 0,                              // Total of all expenses
  totalPaid: 0,                                  // Total paid expenses
  totalUnpaid: 0,                                // Total unpaid expenses
  cashAtBank: 85000,                             // Should be 85000 initially
  payablesCount: 0,                              // Number of payable categories
  payables: {},                                  // Payable amounts by code
  sampleExpenseItems: [...]                      // First 3 expense items
}
```

**What to check:**
- Is `cashAtBank` correct (should be 85000 with no expenses)?
- Are `totalPaid` and `totalUnpaid` both 0 initially?

### 4. Overall Calculations
Look for logs starting with `💰 [Payment Tracking] Calculations:`:

```javascript
💰 [Payment Tracking] Calculations: {
  projectType: "HIV",
  facilityType: "hospital",
  quarter: "Q1",
  openingBalance: 85000,
  openingBalanceCode: "HIV_EXEC_HOSPITAL_A_2",
  cashAtBank: 85000,
  totalPaid: 0,
  totalUnpaid: 0,
  payablesCount: 0,
  payables: {},
  activitiesAvailable: true,
  formDataKeysCount: 50
}
```

**What to check:**
- All values should be consistent with previous logs
- `cashAtBank` should equal `openingBalance` when no expenses are paid

### 5. Field Updates - Cash at Bank
Look for logs starting with `💰 [Payment Tracking] Updating Cash at Bank:`:

```javascript
💰 [Payment Tracking] Updating Cash at Bank: {
  cashAtBankCode: "HIV_EXEC_HOSPITAL_D_1",      // The code for Cash at Bank field
  quarterKey: "q1",
  currentValue: undefined,                       // Current value in form (might be undefined)
  newValue: 85000,                               // Value we want to set
  willUpdate: true,                              // Will we update? (should be true)
  formDataHasCode: true,                         // Does formData have this code?
  formDataEntry: { q1: 0, q2: 0, ... }          // Current formData for this code
}
```

**What to check:**
- Is `cashAtBankCode` correct?
- Is `willUpdate` true?
- Is `formDataHasCode` true?

### 6. Field Update Execution
Look for logs starting with `🔄 [Payment Tracking] Calling onFieldChange`:

```javascript
🔄 [Payment Tracking] Calling onFieldChange for Cash at Bank
✅ [Payment Tracking] onFieldChange called, new formData: { q1: 85000, q2: 0, ... }
```

**What to check:**
- Does the update actually happen?
- Does the formData get updated with the new value?

### 7. Payables Updates
Look for logs starting with `💰 [Payment Tracking] Processing payables:`:

```javascript
💰 [Payment Tracking] Processing payables: {
  payablesCount: 0,                              // Should be 0 initially
  payablesCodes: []                              // Should be empty initially
}
```

## Common Issues and Solutions

### Issue 1: Opening Balance Not Found
**Symptoms:**
- `formDataEntry` is undefined
- `extractedValue` is 0

**Possible Causes:**
1. Opening balance code is incorrect
2. Opening balance hasn't been entered yet
3. Form data hasn't loaded

**Solution:**
- Check the `openingBalanceCode` matches your program/facility
- Verify you've entered a value in Section A-2 (Initial transfer from SPIU/RBC)

### Issue 2: Activities Not Available
**Symptoms:**
- `activitiesAvailable` is false
- `sectionBAvailable` is false

**Possible Causes:**
1. Activities haven't loaded yet
2. Schema query failed

**Solution:**
- Wait for activities to load
- Check network tab for failed API calls

### Issue 3: Field Update Not Happening
**Symptoms:**
- `willUpdate` is false
- No `🔄 Calling onFieldChange` log

**Possible Causes:**
1. Current value already equals new value
2. Infinite loop prevention kicking in

**Solution:**
- Check if the field already has the correct value
- Look for the value in the UI (might be displaying incorrectly)

### Issue 4: onFieldChange Not Working
**Symptoms:**
- `🔄 Calling onFieldChange` appears
- But formData doesn't update

**Possible Causes:**
1. Form is in read-only mode
2. onFieldChange function is not working

**Solution:**
- Check if form is in edit/create mode
- Look for errors in console after onFieldChange call

## Testing Steps

1. **Open browser console** (F12)
2. **Clear console** to start fresh
3. **Load the execution form**
4. **Look for the logs** in the order listed above
5. **Enter opening balance** (85,000) in Section A-2
6. **Watch for updates** in the console
7. **Check Section D** - Cash at Bank should now show 85,000

## Expected Flow

With opening balance of 85,000 and no expenses:

```
1. 🔍 Opening Balance: 85000
2. 🧮 Starting calculation: openingBalance=85000
3. ✅ Calculation complete: cashAtBank=85000, totalPaid=0
4. 💰 Calculations: cashAtBank=85000
5. 💰 Updating Cash at Bank: newValue=85000, willUpdate=true
6. 🔄 Calling onFieldChange for Cash at Bank
7. ✅ onFieldChange called, new formData shows 85000
```

## What to Report

If the issue persists, please provide:

1. **All console logs** (copy/paste or screenshot)
2. **Program type** (HIV, Malaria, TB)
3. **Facility type** (Hospital, Health Center)
4. **Quarter** (Q1, Q2, Q3, Q4)
5. **Opening balance value** entered
6. **What Section D shows** (dash, 0, or other value)

This will help identify exactly where the flow is breaking.

---

**Debug Logs Added**: October 24, 2025  
**Status**: Ready for Testing
