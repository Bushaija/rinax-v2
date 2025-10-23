# Cash Flow Statement - Expense Categories

## Specific Expense Categories

The following expense categories are automatically detected and displayed with negative signs (in parentheses) in the cash flow statement:

### **1. Compensation of Employees**
- Salaries and wages
- Employee benefits
- Pension contributions
- Any line containing "compensation of employee"

**Example:**
```
Compensation of employees    (5,000,000)
```

### **2. Goods and Services**
- Office supplies
- Utilities
- Maintenance
- Any line containing "goods and service"

**Example:**
```
Goods and services          (2,500,000)
```

### **3. Grants and Transfers**
- Grants to other organizations
- Transfer payments
- Any line containing "grant" or "transfer"

**Example:**
```
Grants and transfers        (1,200,000)
```

### **4. Subsidies**
- Government subsidies
- Program subsidies
- Any line containing "subsid"

**Example:**
```
Subsidies                     (800,000)
```

### **5. Social Assistance**
- Social welfare payments
- Assistance programs
- Any line containing "social assistance"

**Example:**
```
Social assistance             (600,000)
```

### **6. Finance Costs**
- Interest payments
- Bank charges
- Loan fees
- Any line containing "finance cost"

**Example:**
```
Finance costs                 (150,000)
```

### **7. Other Expenses**
- Miscellaneous expenses
- Unclassified expenses
- Any line containing "other expense"

**Example:**
```
Other expenses                (300,000)
```

---

## Detection Logic

### **Code Implementation**
```typescript
const isExpenseRow = (description: string): boolean => {
  const descLower = description.toLowerCase();
  
  // Specific expense categories
  const expenseCategories = [
    'compensation of employee',
    'goods and service',
    'grant',
    'transfer',
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
  
  // Check if description matches any category or keyword
  return expenseCategories.some(category => descLower.includes(category)) ||
         expenseKeywords.some(keyword => descLower.includes(keyword));
};
```

### **Matching Rules**
- **Case-insensitive**: "Compensation of Employees" = "compensation of employees"
- **Partial matching**: "subsid" matches "Subsidies", "Subsidy", "Subsidized"
- **Flexible**: Works with variations like "Goods and Services" or "Good and Service"

---

## Complete Example

### **Cash Flow Statement Display**

```
CASH FLOWS FROM OPERATING ACTIVITIES

Receipts:
  Receipts from donors                    5,000,000    4,500,000
  Revenue from services                   2,000,000    1,800,000
  ─────────────────────────────────────────────────────────────
  Total receipts                          7,000,000    6,300,000

Payments:
  Compensation of employees              (3,500,000)  (3,200,000)
  Goods and services                     (1,800,000)  (1,600,000)
  Grants and transfers                     (800,000)    (700,000)
  Subsidies                                (400,000)    (350,000)
  Social assistance                        (300,000)    (280,000)
  Finance costs                            (100,000)     (90,000)
  Other expenses                           (200,000)    (180,000)
  ─────────────────────────────────────────────────────────────
  Total payments                         (7,100,000)  (6,400,000)
  ─────────────────────────────────────────────────────────────
  
Net cash from operating activities        (100,000)    (100,000)
```

---

## Benefits

### **For Accountants**
✅ **Clear expense identification**: All expense categories clearly marked  
✅ **Standard format**: Follows accounting conventions  
✅ **Easy reconciliation**: Matches printed statements  
✅ **Audit-friendly**: Clear distinction between inflows and outflows  

### **For Management**
✅ **Quick analysis**: Immediately see where cash is going  
✅ **Budget comparison**: Easy to compare against budgets  
✅ **Decision support**: Clear view of expense categories  

---

## Testing Checklist

- [ ] Compensation of employees shows with parentheses
- [ ] Goods and services shows with parentheses
- [ ] Grants and transfers shows with parentheses
- [ ] Subsidies shows with parentheses
- [ ] Social assistance shows with parentheses
- [ ] Finance costs shows with parentheses
- [ ] Other expenses shows with parentheses
- [ ] Receipts/revenue shows WITHOUT parentheses
- [ ] Net totals display correctly (positive or negative)

---

## Date
Updated: 2025-01-XX

## Status
✅ **COMPLETE** - Specific expense categories implemented
