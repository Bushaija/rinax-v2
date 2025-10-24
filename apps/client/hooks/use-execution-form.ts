import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useGetExecutionSchema } from "./queries/executions/use-get-execution-schema";
import { useExecutionActivities } from "./queries/executions/use-execution-activities";
import { useCalculateExecutionBalances } from "./mutations/executions/use-calculate-execution-balances";
import { useValidateAccountingEquation } from "./mutations/executions/use-validate-accounting-equation";
import { useDebounce } from "@/hooks/use-debounce";

type ProjectType = "HIV" | "Malaria" | "TB";
type FacilityType = "hospital" | "health_center";
type Quarter = "Q1" | "Q2" | "Q3" | "Q4";

interface UseExecutionFormParams {
  projectType: ProjectType;
  facilityType: FacilityType;
  quarter: Quarter;
  initialData?: Record<string, any>;
  onDataChange?: (data: Record<string, any>) => void;
  validationMode?: "onChange" | "onBlur" | "manual";
  executionId?: number;
}

type PaymentStatus = "paid" | "unpaid" | "partial";

interface ActivityQuarterValues {
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  comment?: string;
  paymentStatus?: PaymentStatus;
  amountPaid?: number;
}

export function useExecutionForm({
  projectType,
  facilityType,
  quarter,
  initialData,
  onDataChange,
  validationMode = "onBlur",
  executionId,
}: UseExecutionFormParams) {
  const [formData, setFormData] = useState<Record<string, ActivityQuarterValues>>((initialData as any) ?? {});
  const [validationErrors, setValidationErrors] = useState<Record<string, any>>({});
  const [isBalanced, setIsBalanced] = useState<boolean>(true);
  const [difference, setDifference] = useState<number>(0);
  const [computedValues, setComputedValues] = useState<Record<string, any> | null>(null);

  // Debounce API-triggering changes; keep UI responsive while reducing calls
  const [debounceMs, setDebounceMs] = useState<number>(200);
  const debouncedFormData = useDebounce(formData, debounceMs);

  // Load schema and activities
  const schemaQuery = useGetExecutionSchema({ projectType, facilityType });
  const activitiesQuery = useExecutionActivities({ projectType, facilityType });

  // Mutations for server-side computations/validation
  const calculateBalances = useCalculateExecutionBalances();
  const validateEquation = useValidateAccountingEquation();

  const form = useForm({
    defaultValues: initialData,
    mode: validationMode === "manual" ? "onSubmit" : validationMode,
  });

  // Initialize activity entries when schema+activities are ready (once per project/facility change)
  console.log("execution activities::", activitiesQuery.data)
  const initKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activitiesQuery.data) return;
    const key = `${projectType}|${facilityType}`;
    if (initKeyRef.current === key) return;

    const safeInitial = (initialData as any) ?? {};

    // Extract all editable activities from hierarchical data
    const editableActivities: any[] = [];
    const hierarchicalData = activitiesQuery.data ?? {};

    Object.values(hierarchicalData).forEach((categoryData: any) => {
      if (categoryData.subCategories) {
        // Category with subcategories (like B)
        Object.values(categoryData.subCategories).forEach((subCategoryData: any) => {
          if (subCategoryData.items) {
            subCategoryData.items.forEach((item: any) => {
              if (!item.isTotalRow && !item.isComputed) {
                editableActivities.push(item);
              }
            });
          }
        });
      } else if (categoryData.items) {
        // Category with direct items (like A, D, E, G)
        categoryData.items.forEach((item: any) => {
          if (!item.isTotalRow && !item.isComputed) {
            editableActivities.push(item);
          }
        });
      }
    });

    const defaults = editableActivities.reduce((acc: Record<string, ActivityQuarterValues>, a: any) => {
      const existing = safeInitial[a.code] as ActivityQuarterValues | undefined;

      // Helper function to safely convert to number, preserving undefined for unreported quarters
      const toNumber = (val: any): number => {
        // If explicitly 0, keep it as 0
        if (val === 0) return 0;
        // If undefined/null/empty, return 0 (will be treated as unreported)
        if (val === null || val === undefined || val === '') return 0;
        const num = Number(val);
        return isNaN(num) ? 0 : num;
      };

      acc[a.code] = {
        q1: toNumber(existing?.q1),
        q2: toNumber(existing?.q2),
        q3: toNumber(existing?.q3),
        q4: toNumber(existing?.q4),
        comment: String(existing?.comment || ""),
        paymentStatus: existing?.paymentStatus ?? "unpaid",
        amountPaid: existing?.amountPaid ?? 0,
      };

      // Debug: Log payment tracking data for Section B expenses
      if (a.code.includes('_B_')) {
        console.log('🔍 [useExecutionForm] Initializing Section B expense:', {
          code: a.code,
          existingData: existing,
          initializedData: acc[a.code],
        });
      }

      return acc;
    }, {});

    setFormData(prev => ({ ...defaults, ...prev }));
    form.reset(defaults);
    initKeyRef.current = key;
  }, [activitiesQuery.data, projectType, facilityType, initialData]);

  // Helper to produce API payload shape from local form state
  const payload = useMemo(() => {
    const activities = Object.entries(formData).map(([code, values]) => ({
      code,
      q1: Number(values.q1) || 0,
      q2: Number(values.q2) || 0,
      q3: Number(values.q3) || 0,
      q4: Number(values.q4) || 0,
    }));
    return {
      executionId: executionId ?? 0,
      data: {
        activities,
        quarter,
      },
    };
  }, [formData, quarter, executionId]);

  // Recalculate and validate whenever debounced form data changes
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!activitiesQuery.data) return;

      try {
        // Build payload locally to avoid effect retriggering on memo identity
        const localPayload = {
          executionId: executionId ?? 0,
          data: {
            activities: Object.entries(debouncedFormData).map(([code, values]) => ({
              code,
              q1: Number(values.q1) || 0,
              q2: Number(values.q2) || 0,
              q3: Number(values.q3) || 0,
              q4: Number(values.q4) || 0,
            })),
            quarter,
          },
        } as const;

        const balances = await calculateBalances.mutateAsync(localPayload as any);
        if (cancelled) return;
        setComputedValues(balances);
        setIsBalanced(Boolean(balances.isBalanced));

        const validation = await validateEquation.mutateAsync({
          data: localPayload.data as any,
          tolerance: 0.01,
        });
        if (cancelled) return;
        setIsBalanced(validation.isValid);
        setDifference(validation.difference);
        setValidationErrors(
          Array.isArray(validation.errors)
            ? validation.errors.reduce((acc: Record<string, any>, e: any) => {
              acc[e.field] = e.message;
              return acc;
            }, {})
            : {}
        );
      } catch (error) {
        setIsBalanced(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [debouncedFormData, activitiesQuery.data, executionId, quarter]);

  // Field change updates only the selected quarter value by default
  const handleFieldChange = useCallback(
    (activityCode: string, value: number) => {
      const quarterKey = quarter.toLowerCase() as keyof ActivityQuarterValues;
      setFormData(prev => {
        const next = {
          ...prev,
          [activityCode]: {
            q1: prev[activityCode]?.q1 ?? 0,
            q2: prev[activityCode]?.q2 ?? 0,
            q3: prev[activityCode]?.q3 ?? 0,
            q4: prev[activityCode]?.q4 ?? 0,
            comment: prev[activityCode]?.comment ?? "",
            paymentStatus: prev[activityCode]?.paymentStatus,
            amountPaid: prev[activityCode]?.amountPaid,
          },
        };
        (next[activityCode] as any)[quarterKey] = value;
        onDataChange?.(next);
        return next;
      });
      form.setValue(`${activityCode}.${quarter.toLowerCase()}`, value, { shouldDirty: true });
    },
    [form, onDataChange, quarter]
  );

  const setComment = useCallback(
    (activityCode: string, comment: string) => {
      setFormData(prev => {
        const next = {
          ...prev,
          [activityCode]: {
            q1: prev[activityCode]?.q1 ?? 0,
            q2: prev[activityCode]?.q2 ?? 0,
            q3: prev[activityCode]?.q3 ?? 0,
            q4: prev[activityCode]?.q4 ?? 0,
            comment,
            paymentStatus: prev[activityCode]?.paymentStatus,
            amountPaid: prev[activityCode]?.amountPaid,
          },
        };
        onDataChange?.(next);
        return next;
      });
      form.setValue(`${activityCode}.comment`, comment, { shouldDirty: true });
    },
    [form, onDataChange]
  );

  const updateExpensePayment = useCallback(
    (activityCode: string, status: PaymentStatus, amountPaid: number) => {
      setFormData(prev => {
        const next = {
          ...prev,
          [activityCode]: {
            q1: prev[activityCode]?.q1 ?? 0,
            q2: prev[activityCode]?.q2 ?? 0,
            q3: prev[activityCode]?.q3 ?? 0,
            q4: prev[activityCode]?.q4 ?? 0,
            comment: prev[activityCode]?.comment ?? "",
            paymentStatus: status,
            amountPaid: amountPaid,
          },
        };
        onDataChange?.(next);
        return next;
      });
      form.setValue(`${activityCode}.paymentStatus`, status, { shouldDirty: true });
      form.setValue(`${activityCode}.amountPaid`, amountPaid, { shouldDirty: true });
    },
    [form, onDataChange]
  );

  const isLoading = schemaQuery.isLoading || activitiesQuery.isLoading;
  const error = schemaQuery.error || activitiesQuery.error;

  // Table model derived from dynamic activities and server-computed values
  interface TableRow {
    id: string; // stable id (activity code for leaves, section key for parents)
    title: string;
    isCategory?: boolean;
    isSubcategory?: boolean;
    isEditable?: boolean;
    isCalculated?: boolean;
    children?: TableRow[];
    q1?: number;
    q2?: number;
    q3?: number;
    q4?: number;
    cumulativeBalance?: number;
  }

  const table: TableRow[] = useMemo(() => {
    const hierarchicalData = activitiesQuery.data ?? {};
    if (Object.keys(hierarchicalData).length === 0) return [];

    // Helper functions
    function computedFieldForCategory(letter: string): keyof NonNullable<typeof computedValues> | null {
      switch (letter) {
        case "A": return "receipts" as const;
        case "B": return "expenditures" as const;
        case "C": return "surplus" as const;
        case "D": return "financialAssets" as const;
        case "E": return "financialLiabilities" as const;
        case "F": return "netFinancialAssets" as const;
        case "G": return "closingBalance" as const;
        default: return null;
      }
    }

    // Sort categories by displayOrder
    const sortedCategories = Object.entries(hierarchicalData)
      .sort(([, a], [, b]) => ((a as any).displayOrder ?? 0) - ((b as any).displayOrder ?? 0));

    const sections: TableRow[] = [];
    const catLocalTotals: Record<string, { q1: number; q2: number; q3: number; q4: number; cumulativeBalance: number }> = {};

    for (const [categoryCode, categoryData] of sortedCategories) {
      const letter = categoryCode;
      const totalsKey = computedFieldForCategory(letter);
      const categoryInfo = categoryData as any;
      const children: TableRow[] = [];

      // Helper to build a leaf activity row
      function buildActivityRow(activity: any): TableRow {
        const state = formData[activity.code] || {};
        const isComputedActivity = Boolean(activity.isComputed);

        let q1 = Number(state.q1) || 0;
        let q2 = Number(state.q2) || 0;
        let q3 = Number(state.q3) || 0;
        let q4 = Number(state.q4) || 0;
        let cumulativeBalance: number | undefined = undefined;
        let isCalculated = isComputedActivity;
        let isEditable = !isComputedActivity;

        // Handle computed activities
        if (isComputedActivity && totalsKey && computedValues && (computedValues as any)[totalsKey]) {
          const totalObj = (computedValues as any)[totalsKey] as any;
          q1 = totalObj.q1 ?? (Number(state.q1) || 0);
          q2 = totalObj.q2 ?? (Number(state.q2) || 0);
          q3 = totalObj.q3 ?? (Number(state.q3) || 0);
          q4 = totalObj.q4 ?? (Number(state.q4) || 0);
          cumulativeBalance = totalObj.cumulativeBalance ?? undefined;
        }

        // Special formula rows under G: "Surplus/Deficit of the Period" should mirror C totals
        if (letter === "G" && typeof activity.name === "string") {
          const name = activity.name.toLowerCase();
          if (name.includes("surplus/deficit of the period")) {
            const cTotalsKey = computedFieldForCategory("C");
            const cObj = cTotalsKey && computedValues ? (computedValues as any)[cTotalsKey] : undefined;
            q1 = (cObj?.q1 ?? (Number(state.q1) || 0));
            q2 = (cObj?.q2 ?? (Number(state.q2) || 0));
            q3 = (cObj?.q3 ?? (Number(state.q3) || 0));
            q4 = (cObj?.q4 ?? (Number(state.q4) || 0));
            cumulativeBalance = cObj?.cumulativeBalance ?? undefined;
            isCalculated = true;
            isEditable = false;
          }
        }

        // Calculate cumulative balance based on section type
        if (typeof cumulativeBalance !== "number") {
          // Determine section from activity code
          // Code format: PROJECT_EXEC_FACILITY_SECTION_ID
          // Example: MAL_EXEC_HEALTH_CENTER_D_1 or HIV_EXEC_HOSPITAL_B_B-01_1
          // The section is a single letter (A-G) that appears after the facility type
          const codeParts = activity.code?.split('_') || [];
          // Find the part that is a single letter A-G (the section)
          const sectionPart = codeParts.find((part: string) => /^[A-G]$/i.test(part));
          const sectionCode = sectionPart?.toUpperCase() || '';


          // Stock sections (D, E) use latest quarter with data (including explicit zeros)
          if (sectionCode === 'D' || sectionCode === 'E') {
            // Check quarters in reverse order (Q4 -> Q3 -> Q2 -> Q1)
            // Use the latest quarter that has been explicitly set (even if it's 0)
            // We check the original state to see if a value was explicitly entered
            const stateQ4 = state.q4;
            const stateQ3 = state.q3;
            const stateQ2 = state.q2;
            const stateQ1 = state.q1;


            // Check if a quarter has been explicitly set (not undefined/null) AND has non-zero value
            // For stock sections, we only want quarters with actual data
            // A quarter that is 0 and hasn't been reached yet should be ignored
            const quarterOrder = ['Q1', 'Q2', 'Q3', 'Q4'];
            const currentQuarterIndex = quarterOrder.indexOf(quarter);

            const hasQ4 = stateQ4 !== undefined && stateQ4 !== null && (q4 !== 0 || currentQuarterIndex >= 3);
            const hasQ3 = stateQ3 !== undefined && stateQ3 !== null && (q3 !== 0 || currentQuarterIndex >= 2);
            const hasQ2 = stateQ2 !== undefined && stateQ2 !== null && (q2 !== 0 || currentQuarterIndex >= 1);
            const hasQ1 = stateQ1 !== undefined && stateQ1 !== null && (q1 !== 0 || currentQuarterIndex >= 0);


            // For stock sections, use the latest REPORTED quarter (including 0)
            // We need to distinguish between "not reported" vs "reported as 0"
            // Check in reverse order and use the first quarter that has been reported
            if (hasQ4) {
              cumulativeBalance = q4;
            } else if (hasQ3) {
              cumulativeBalance = q3;
            } else if (hasQ2) {
              cumulativeBalance = q2;
            } else if (hasQ1) {
              cumulativeBalance = q1;
            } else {
              // No quarters reported - leave as undefined to show dash
              cumulativeBalance = undefined;
            }
          } else {
            // Flow sections (A, B, C, F, G) use cumulative sum
            cumulativeBalance = q1 + q2 + q3 + q4;
          }

        }

        return {
          id: activity.code,
          title: activity.name,
          isEditable,
          isCalculated,
          q1, q2, q3, q4, cumulativeBalance,
        } as TableRow;
      }

      // Handle categories with subcategories (like B)
      if (categoryInfo.subCategories) {
        const sortedSubCategories = Object.entries(categoryInfo.subCategories)
          .sort(([, a], [, b]) => ((a as any).displayOrder ?? 0) - ((b as any).displayOrder ?? 0));

        for (const [subCategoryCode, subCategoryData] of sortedSubCategories) {
          const subCategoryInfo = subCategoryData as any;
          const childRows = (subCategoryInfo.items || [])
            .sort((a: any, b: any) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
            .map(buildActivityRow);

          const totals = childRows.reduce(
            (acc: any, r: any) => {
              acc.q1 += Number(r.q1 || 0);
              acc.q2 += Number(r.q2 || 0);
              acc.q3 += Number(r.q3 || 0);
              acc.q4 += Number(r.q4 || 0);
              acc.cumulativeBalance += Number(r.cumulativeBalance || 0);
              return acc;
            },
            { q1: 0, q2: 0, q3: 0, q4: 0, cumulativeBalance: 0 }
          );

          children.push({
            id: `${categoryCode}:${subCategoryCode}`,
            title: `${subCategoryCode}. ${subCategoryInfo.label}`,
            isSubcategory: true,
            isEditable: false,
            isCalculated: true,
            children: childRows,
            q1: totals.q1,
            q2: totals.q2,
            q3: totals.q3,
            q4: totals.q4,
            cumulativeBalance: totals.cumulativeBalance || undefined,
          });
        }
      } else if (categoryInfo.items) {
        // Handle categories with direct items (like A, D, E, G)
        const sortedItems = categoryInfo.items
          .sort((a: any, b: any) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

        for (const item of sortedItems) {
          children.push(buildActivityRow(item));
        }
      }

      // Compute category totals from children
      function sumRows(rows: TableRow[]): { q1: number; q2: number; q3: number; q4: number; cumulativeBalance: number } {
        return rows.reduce(
          (acc, r) => {
            if (r.isSubcategory && typeof r.q1 === "number") {
              acc.q1 += r.q1 || 0;
              acc.q2 += r.q2 || 0;
              acc.q3 += r.q3 || 0;
              acc.q4 += r.q4 || 0;
              acc.cumulativeBalance += Number(r.cumulativeBalance || 0);
            } else if (Array.isArray(r.children) && r.children.length > 0) {
              const nested = sumRows(r.children);
              acc.q1 += nested.q1;
              acc.q2 += nested.q2;
              acc.q3 += nested.q3;
              acc.q4 += nested.q4;
              acc.cumulativeBalance += nested.cumulativeBalance;
            } else {
              acc.q1 += Number(r.q1 || 0);
              acc.q2 += Number(r.q2 || 0);
              acc.q3 += Number(r.q3 || 0);
              acc.q4 += Number(r.q4 || 0);
              acc.cumulativeBalance += Number(r.cumulativeBalance || 0);
            }
            return acc;
          },
          { q1: 0, q2: 0, q3: 0, q4: 0, cumulativeBalance: 0 }
        );
      }

      const catTotals = sumRows(children);
      const normalizedCatTotals = {
        q1: catTotals.q1,
        q2: catTotals.q2,
        q3: catTotals.q3,
        q4: catTotals.q4,
        cumulativeBalance: typeof catTotals.cumulativeBalance === "number"
          ? catTotals.cumulativeBalance
          : (catTotals.q1 + catTotals.q2 + catTotals.q3 + catTotals.q4),
      };
      catLocalTotals[letter] = normalizedCatTotals;

      // Handle computed categories (C, F) or use local totals
      const serverTotals = totalsKey && computedValues ? (computedValues as any)[totalsKey] : undefined;
      const useServer = categoryInfo.isComputed && serverTotals;

      sections.push({
        id: categoryCode,
        title: categoryInfo.label,
        isCategory: true,
        isEditable: false,
        children,
        q1: useServer ? (serverTotals.q1 ?? 0) : normalizedCatTotals.q1,
        q2: useServer ? (serverTotals.q2 ?? 0) : normalizedCatTotals.q2,
        q3: useServer ? (serverTotals.q3 ?? 0) : normalizedCatTotals.q3,
        q4: useServer ? (serverTotals.q4 ?? 0) : normalizedCatTotals.q4,
        cumulativeBalance: useServer
          ? (serverTotals.cumulativeBalance ?? (serverTotals.q1 ?? 0) + (serverTotals.q2 ?? 0) + (serverTotals.q3 ?? 0) + (serverTotals.q4 ?? 0))
          : normalizedCatTotals.cumulativeBalance,
      });
    }

    // Client-side derived sections: C = A - B, F = D - E, and G incorporates C into its child
    function deriveDiff(
      a?: { q1: number; q2: number; q3: number; q4: number },
      b?: { q1: number; q2: number; q3: number; q4: number },
      type: 'flow' | 'stock' = 'flow'
    ) {
      const safeA = a || { q1: 0, q2: 0, q3: 0, q4: 0 };
      const safeB = b || { q1: 0, q2: 0, q3: 0, q4: 0 };
      const q1 = safeA.q1 - safeB.q1;
      const q2 = safeA.q2 - safeB.q2;
      const q3 = safeA.q3 - safeB.q3;
      const q4 = safeA.q4 - safeB.q4;

      let cumulativeBalance: number;

      if (type === 'stock') {
        // CRITICAL FIX: For stock sections (D, E), use latest quarter value
        // D and E are balance sheet items (point-in-time), not income statement items (flow)
        // Check in reverse order (Q4 -> Q3 -> Q2 -> Q1) for the latest reported quarter
        if (q4 !== 0 || (safeA.q4 !== 0 || safeB.q4 !== 0)) {
          cumulativeBalance = q4;
        } else if (q3 !== 0 || (safeA.q3 !== 0 || safeB.q3 !== 0)) {
          cumulativeBalance = q3;
        } else if (q2 !== 0 || (safeA.q2 !== 0 || safeB.q2 !== 0)) {
          cumulativeBalance = q2;
        } else {
          cumulativeBalance = q1;
        }
      } else {
        // For flow sections (A, B, C), sum all quarters
        cumulativeBalance = q1 + q2 + q3 + q4;
      }

      return { q1, q2, q3, q4, cumulativeBalance };
    }

    // Update computed sections with derived values
    const cDerived = deriveDiff(catLocalTotals["A"], catLocalTotals["B"], 'flow');  // C is flow (income statement)
    const fDerived = deriveDiff(catLocalTotals["D"], catLocalTotals["E"], 'stock'); // F is stock (balance sheet)

    // Update C section if it exists
    const cIdx = sections.findIndex(s => s.id === "C");
    if (cIdx >= 0) {
      (sections[cIdx] as any).q1 = cDerived.q1;
      (sections[cIdx] as any).q2 = cDerived.q2;
      (sections[cIdx] as any).q3 = cDerived.q3;
      (sections[cIdx] as any).q4 = cDerived.q4;
      (sections[cIdx] as any).cumulativeBalance = cDerived.cumulativeBalance;
    }

    // Update F section if it exists
    const fIdx = sections.findIndex(s => s.id === "F");
    if (fIdx >= 0) {
      (sections[fIdx] as any).q1 = fDerived.q1;
      (sections[fIdx] as any).q2 = fDerived.q2;
      (sections[fIdx] as any).q3 = fDerived.q3;
      (sections[fIdx] as any).q4 = fDerived.q4;
      (sections[fIdx] as any).cumulativeBalance = fDerived.cumulativeBalance;
    }

    // Update G section's "Surplus/Deficit of the Period" child with C values
    const gIdx = sections.findIndex(s => s.id === "G");
    if (gIdx >= 0) {
      const gSection = sections[gIdx];
      const surplusChild = gSection.children?.find(r => String(r.title).toLowerCase().includes("surplus/deficit of the period"));
      if (surplusChild) {
        (surplusChild as any).q1 = cDerived.q1;
        (surplusChild as any).q2 = cDerived.q2;
        (surplusChild as any).q3 = cDerived.q3;
        (surplusChild as any).q4 = cDerived.q4;
        (surplusChild as any).cumulativeBalance = cDerived.cumulativeBalance;
        (surplusChild as any).isCalculated = true;
        (surplusChild as any).isEditable = false;
      }

      // Re-sum G header from its children
      if (gSection.children) {
        const gTotals = gSection.children.reduce((acc, r) => {
          acc.q1 += Number((r as any).q1 || 0);
          acc.q2 += Number((r as any).q2 || 0);
          acc.q3 += Number((r as any).q3 || 0);
          acc.q4 += Number((r as any).q4 || 0);
          acc.cumulativeBalance += Number((r as any).cumulativeBalance || 0);
          return acc;
        }, { q1: 0, q2: 0, q3: 0, q4: 0, cumulativeBalance: 0 });

        (sections[gIdx] as any).q1 = gTotals.q1;
        (sections[gIdx] as any).q2 = gTotals.q2;
        (sections[gIdx] as any).q3 = gTotals.q3;
        (sections[gIdx] as any).q4 = gTotals.q4;
        (sections[gIdx] as any).cumulativeBalance = gTotals.cumulativeBalance;
      }
    }

    return sections;
  }, [activitiesQuery.data, formData, computedValues]);

  // Quarter UX helpers
  const quarterLabels = useMemo(() => ({
    Q1: "Jul - Sep",
    Q2: "Oct - Dec (Future)",
    Q3: "Jan - Mar (Future)",
    Q4: "Apr - Jun (Future)",
  }), []);

  function isQuarterEditable(q: Quarter): boolean {
    // Only the current quarter should be editable
    return q === quarter;
  }

  function isQuarterVisible(q: Quarter): boolean {
    // Quarter is visible if it's the current quarter OR has existing data
    const hasExistingDataForQuarter = Object.values(formData).some((activityData: ActivityQuarterValues) => {
      const quarterKey = q.toLowerCase() as keyof ActivityQuarterValues;
      const value = activityData[quarterKey];
      return value !== undefined && value !== null && Number(value) > 0;
    });

    return (q === quarter) || hasExistingDataForQuarter;
  }

  const lockedQuarters = useMemo<Quarter[]>(() =>
    (["Q1", "Q2", "Q3", "Q4"] as Quarter[]).filter(q => !isQuarterEditable(q)),
    [quarter, formData]);

  // Section expand/collapse state (default collapsed)
  const [expandState, setExpandState] = useState<Record<string, boolean>>({});
  const onToggleSection = useCallback((id: string) => {
    setExpandState(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // Section totals sourced from computedValues
  function getSectionTotals(sectionId: string) {
    const letter = String(sectionId).split("_").pop()?.charAt(0) ?? sectionId.charAt(0);
    const map: Record<string, keyof NonNullable<typeof computedValues>> = {
      A: "receipts",
      B: "expenditures",
      C: "surplus",
      D: "financialAssets",
      E: "financialLiabilities",
      F: "netFinancialAssets",
      G: "closingBalance",
    } as any;
    const key = map[letter];
    if (!key || !computedValues) return { q1: 0, q2: 0, q3: 0, q4: 0, cumulativeBalance: 0 };
    const t = (computedValues as any)[key] || {};
    return {
      q1: t.q1 ?? 0,
      q2: t.q2 ?? 0,
      q3: t.q3 ?? 0,
      q4: t.q4 ?? 0,
      cumulativeBalance: t.cumulativeBalance ?? 0,
    };
  }

  // Row state helpers
  function getRowState(code: string) {
    const sectionLetter = code.split("_").slice(-2, -1)[0]?.slice(0, 1) || code.slice(0, 1);
    // Only blanket-compute C and F; G leaves are editable except the specific computed row handled in table model
    const isComputed = ["C", "F"].includes(sectionLetter);
    const isEditable = !isComputed;
    const message = isComputed ? "Computed from totals" : undefined;
    return { isEditable, isCalculated: isComputed, validationMessage: message };
  }

  // Enforce accounting equation before enabling submit/save
  const canSubmitExecution = useMemo(() => {
    // F must equal G and form must be valid
    const f = (computedValues as any)?.netFinancialAssets?.cumulativeBalance ?? null;
    const g = (computedValues as any)?.closingBalance?.cumulativeBalance ?? null;
    const balanced = isBalanced && f !== null && g !== null && Math.abs(Number(f) - Number(g)) < 0.0001;
    return balanced && Object.keys(validationErrors).length === 0;
  }, [computedValues, isBalanced, validationErrors]);

  function isRowLocked(code: string, q: Quarter): boolean {
    const { isEditable } = getRowState(code);

    // If the row itself isn't editable (computed), it's always locked
    if (!isEditable) return true;

    // Special case: "Accumulated Surplus/Deficit" should only be editable in Q1
    // Check if this is an accumulated surplus/deficit row by looking at the activity name
    const activityData = table.flatMap(section => {
      if (section.children) {
        return section.children.flatMap(child => {
          if (child.children) {
            return child.children;
          }
          return [child];
        });
      }
      return [];
    }).find(item => item.id === code);

    if (activityData && activityData.title) {
      const titleLower = activityData.title.toLowerCase();
      if (titleLower.includes('accumulated') && (titleLower.includes('surplus') || titleLower.includes('deficit'))) {
        // Accumulated Surplus/Deficit is only editable in Q1
        if (q !== 'Q1') {
          return true; // Locked for Q2, Q3, Q4
        }
      }
    }

    // If it's not the current quarter, it should always be locked
    // (Previous quarters with data should be visible but locked for viewing)
    // (Previous quarters without data should be hidden)
    if (q !== quarter) {
      return true; // Always locked for non-current quarters
    }

    // Current quarter is always editable (for rows that are editable)
    return false;
  }

  // Header context placeholders (can be integrated with facility/period queries if available)
  const header = useMemo(() => ({
    facilityName: undefined as string | undefined,
    periodLabel: undefined as string | undefined,
    quarter,
  }), [quarter]);

  // Action gating
  const topLevelErrors = useMemo(() => {
    const errors: string[] = [];
    if (isBalanced === false) errors.push("Accounting equation failed: F â‰  G");
    return errors;
  }, [isBalanced]);

  const canSaveDraft = useMemo(() => Boolean(schemaQuery.data && activitiesQuery.data), [schemaQuery.data, activitiesQuery.data]);
  const canCreateReport = useMemo(() => canSubmitExecution, [canSubmitExecution]);

  return {
    // RHF
    form,

    // Data
    schema: schemaQuery.data,
    activities: activitiesQuery.data,

    // Form state
    formData,
    setFormData,
    quarter,

    // Server computations & validation
    computedValues,
    isBalanced,
    difference,
    validationErrors,

    // Schema-compatible hierarchical data built from activities
    table,

    // Quarter UX helpers
    quarterLabels,
    isQuarterEditable,
    isQuarterVisible,
    lockedQuarters,

    // Section helpers
    expandState,
    onToggleSection,
    getSectionTotals,

    // Row helpers
    getRowState,
    isRowLocked,

    // Header context
    header,

    // Actions and status
    canSaveDraft,
    canCreateReport,
    status: {
      isLoadingSchema: schemaQuery.isLoading,
      isLoadingActivities: activitiesQuery.isLoading,
      isCalculating: calculateBalances.isPending,
      isValidating: validateEquation.isPending,
    },

    // Handlers
    onFieldChange: handleFieldChange,
    onCommentChange: setComment,
    updateExpensePayment,

    // Status
    isLoading,
    error,
    isDirty: form.formState.isDirty,
    isValid: Object.keys(validationErrors).length === 0 && isBalanced,

    // Utilities
    getPayload: () => payload,
    setDebounceMs,
    canSubmitExecution,
    reset: () => {
      form.reset();
      setFormData(initialData as any);
      setValidationErrors({});
      setComputedValues(null);
      setIsBalanced(true);
      setDifference(0);
    },
  };
}

