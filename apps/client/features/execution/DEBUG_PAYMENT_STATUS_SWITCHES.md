# Debug Guide: Payment Status Switches Not Reflecting Saved State

## Debug Logging Added

We've added comprehensive logging throughout the data flow to track where payment status data might be getting lost or overwritten.

### 1. Backend Response (Edit Page)
**File:** `apps/client/app/dashboard/execution/edit/[id]/page.tsx`

Look for logs like:
```
🔍 [Edit Page] Raw Section B item from backend: {
  code: "HIV_EXEC_HOSPITAL_B_B-01_1",
  q1: 30000,
  paymentStatus: "paid",
  amountPaid: 30000,
  fullItem: {...}
}
```

**What to check:**
- Does the backend response include `paymentStatus` and `amountPaid` fields?
- Are the values correct (matching what was saved)?

### 2. InitialData Transformation
**File:** `apps/client/app/dashboard/execution/edit/[id]/page.tsx`

Look for logs like:
```
🔍 [Edit Page] initialData Section B Payment Status: {
  totalExpenses: 10,
  sampleExpenses: [
    { code: "...", paymentStatus: "paid", amountPaid: 30000 },
    ...
  ]
}
```

**What to check:**
- Is the initialData correctly transformed with payment tracking fields?
- Are all Section B expenses included?

### 3. Form Initialization
**File:** `apps/client/hooks/use-execution-form.ts`

Look for logs like:
```
🔍 [useExecutionForm] Initializing Section B expense: {
  code: "HIV_EXEC_HOSPITAL_B_B-01_1",
  existingData: { q1: 30000, paymentStatus: "paid", amountPaid: 30000 },
  initializedData: { q1: 30000, paymentStatus: "paid", amountPaid: 30000 }
}
```

**What to check:**
- Is the existingData (from initialData) correct?
- Is the initializedData preserving the payment tracking fields?

### 4. Table Component FormData
**File:** `apps/client/features/execution/components/v2/table.tsx`

Look for logs like:
```
🔍 [Table] Section B Payment Status Data: {
  totalExpenses: 10,
  sampleExpenses: [
    { code: "...", paymentStatus: "paid", amountPaid: 30000 },
    ...
  ],
  allExpenses: [...]
}
```

**What to check:**
- Does the formData in the table component have the correct payment tracking fields?
- Are the values matching what was initialized?

### 5. PaymentStatusControl Props
**File:** `apps/client/features/execution/components/payment-status-control.tsx`

Look for logs like:
```
🔍 [PaymentStatusControl] Props received: {
  expenseCode: "HIV_EXEC_HOSPITAL_B_B-01_1",
  amount: 30000,
  paymentStatus: "paid",
  amountPaid: 30000
}
```

**What to check:**
- Is the PaymentStatusControl receiving the correct paymentStatus?
- Does the paymentStatus match what was saved?

## Common Issues to Look For

### Issue 1: Backend Not Returning Payment Tracking Fields
**Symptom:** Backend logs show `paymentStatus: undefined` or missing

**Solution:** Check the backend API to ensure it's including payment tracking fields in the response.

### Issue 2: InitialData Transformation Losing Fields
**Symptom:** Backend has correct data, but initialData logs show `paymentStatus: "unpaid"`

**Solution:** Check the transformation logic in the edit page's `initialData` useMemo.

### Issue 3: Form Initialization Overwriting Fields
**Symptom:** InitialData is correct, but form initialization logs show default values

**Solution:** Check the `useExecutionForm` hook's initialization logic.

### Issue 4: Auto-Calculation Overwriting Values
**Symptom:** Form initializes correctly, but table logs show different values

**Solution:** Check if the auto-calculation useEffect is still running in edit mode.

### Issue 5: Table Not Reading FormData Correctly
**Symptom:** FormData has correct values, but PaymentStatusControl receives wrong values

**Solution:** Check how the table component passes props to PaymentStatusControl:
```typescript
paymentStatus={(ctx.formData[leaf.id]?.paymentStatus as PaymentStatus) ?? "unpaid"}
amountPaid={ctx.formData[leaf.id]?.amountPaid ?? 0}
```

## Debugging Steps

1. **Open the edit page in the browser**
2. **Open browser console (F12)**
3. **Look for the debug logs in order:**
   - 🔍 [Edit Page] Raw Section B item from backend
   - 🔍 [Edit Page] initialData Section B Payment Status
   - 🔍 [useExecutionForm] Initializing Section B expense
   - 🔍 [Table] Section B Payment Status Data
   - 🔍 [PaymentStatusControl] Props received

4. **Identify where the data is getting lost or changed:**
   - Compare the values at each step
   - Look for where `paymentStatus` changes from "paid" to "unpaid"
   - Check if `amountPaid` is being reset to 0

5. **Report findings:**
   - Which step shows incorrect data?
   - What are the actual vs expected values?
   - Are there any error messages in the console?

## Expected Data Flow

```
Backend Response (with payment tracking)
  ↓
Edit Page: Transform to initialData (preserve payment tracking)
  ↓
useExecutionForm: Initialize formData (preserve payment tracking)
  ↓
Table Component: Read from formData (preserve payment tracking)
  ↓
PaymentStatusControl: Receive props (display correct state)
```

## Next Steps After Debugging

Once you identify where the data is being lost:
1. Share the console logs showing the issue
2. Note which step shows incorrect data
3. We'll fix the specific transformation/initialization logic
