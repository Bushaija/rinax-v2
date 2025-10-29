"use client"

import React, { useMemo, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useExecutionForm } from "@/hooks/use-execution-form";
import { ExecutionFormProvider } from "@/features/execution/execution-form-context";
import ExecutionHeader from "@/features/execution/components/v2/header";
import ExecutionTable from "@/features/execution/components/v2/table";
import { FormActions } from "@/features/shared/form-actions";
import { ExecutionActionsProvider } from "@/features/execution/components/v2/execution-actions-context";
import { useTempSaveStore, generateSaveId } from "@/features/execution/stores/temp-save-store";
import { useExecutionSubmissionHandler } from "@/hooks/use-execution-submission-handler";
import useCheckExistingExecution from "@/hooks/queries/executions/use-check-existing-execution";
import { toast } from "sonner";
import { useGetCurrentReportingPeriod } from "@/hooks/queries";
import { useExpenseCalculations } from "@/features/execution/hooks/use-expense-calculations";

type Quarter = "Q1" | "Q2" | "Q3" | "Q4";

interface EnhancedExecutionFormAutoLoadProps {
  projectType: "HIV" | "MAL" | "TB"; // Changed from "Malaria" to "MAL" for consistency with activity codes
  facilityType: "hospital" | "health_center";
  quarter: Quarter;
  mode?: "create" | "edit" | "view" | "readOnly";
  executionId?: number;
  initialData?: Record<string, any>;
  projectId?: number;
  facilityId?: number;
  reportingPeriodId?: number;
  facilityName?: string;
  programName?: string;
  schemaId?: number;
}

export function EnhancedExecutionFormAutoLoad({ 
  projectType, 
  facilityType, 
  quarter, 
  mode = "create", 
  executionId, 
  initialData, 
  projectId: projectIdProp, 
  facilityId: facilityIdProp, 
  reportingPeriodId: reportingPeriodIdProp, 
  facilityName: facilityNameProp, 
  programName: programNameProp, 
  schemaId: schemaIdProp 
}: EnhancedExecutionFormAutoLoadProps) {
  console.log('='.repeat(80));
  console.log('🚀 PAYMENT TRACKING: EnhancedExecutionFormAutoLoad RENDERING');
  console.log('='.repeat(80));
  
  const effectiveMode: "create" | "edit" | "view" = (mode === "readOnly" ? "view" : mode) as any;
  const isReadOnly = effectiveMode === "view";
  const { data: currentReportingPeriod } = useGetCurrentReportingPeriod();
  
  const form = useExecutionForm({ projectType, facilityType, quarter, executionId, initialData });
  const searchParams = useSearchParams();
  const router = useRouter();
  
  console.log('📊 [AutoLoad] Form initialized:', {
    formDataKeysCount: Object.keys(form.formData).length,
    activitiesAvailable: !!form.activities,
  });
  
  // Debug: Log activities structure for Section E
  if (form.activities) {
    console.log('🔍 [AutoLoad] Activities Structure:', {
      sectionBExists: !!form.activities.B,
      sectionBHasSubCategories: !!form.activities.B?.subCategories,
      sectionEExists: !!form.activities.E,
      sectionEStructure: form.activities.E ? Object.keys(form.activities.E) : [],
      sectionEItems: form.activities.E?.items?.length || 0,
      sampleSectionEItems: form.activities.E?.items?.slice(0, 3),
    });
  }

  // Extract IDs for checking existing execution
  const projectIdFromUrl = searchParams?.get("projectId") || "";
  const projectId = effectiveMode === "edit" 
    ? (projectIdProp ?? 0) 
    : (projectIdProp ?? (/^\d+$/.test(projectIdFromUrl) ? Number(projectIdFromUrl) : 0));
  
  const facilityId = effectiveMode === "edit" 
    ? (facilityIdProp ?? 0) 
    : (facilityIdProp ?? (Number(searchParams?.get("facilityId") || 0) || 0));
  const reportingPeriodId = effectiveMode === "edit"
    ? (reportingPeriodIdProp ?? (currentReportingPeriod?.id ?? 0))
    : (reportingPeriodIdProp ?? (Number(searchParams?.get("reportingPeriodId") || currentReportingPeriod?.id || 0) || 0));

  // Check for existing execution when we have the required IDs
  const shouldCheckForExisting = Boolean(
    projectId && 
    facilityId && 
    reportingPeriodId && 
    effectiveMode === "create" && // Only check when creating
    !executionId // Don't check if we already have an executionId
  );


  const { 
    data: existingExecution, 
    isLoading: isCheckingExisting,
    refetch: recheckExisting 
  } = useCheckExistingExecution(
    {
      projectId: String(projectId),
      facilityId: String(facilityId),
      reportingPeriodId: String(reportingPeriodId),
    }
  );

  // Auto-load existing data when found (use ref to prevent infinite loops)
  const autoLoadedRef = useRef(false);
  
  useEffect(() => {
    if (existingExecution?.exists && existingExecution?.entry && !initialData && !autoLoadedRef.current) {
      const entry = existingExecution.entry;
      
      // Transform the existing activities data to match the form's expected format
      const activities = entry.formData?.activities || {};
      const transformedData: Record<string, any> = {};
      
        Object.entries(activities).forEach(([code, activityData]) => {
          if (activityData && typeof activityData === 'object') {
            const activityObj = activityData as any;
            
            // Use the activity's code field as the key if available, otherwise use the original code
            const activityCode = activityObj.code || code;
            
            transformedData[activityCode] = {
              q1: Number(activityObj.q1 || 0),
              q2: Number(activityObj.q2 || 0),
              q3: Number(activityObj.q3 || 0),
              q4: Number(activityObj.q4 || 0),
              comment: String(activityObj.comment || ""),
              // Restore payment tracking data with backward compatibility defaults
              paymentStatus: activityObj.paymentStatus || "unpaid",
              amountPaid: Number(activityObj.amountPaid) || 0,
            };
          }
        });
      
      // Update the form with existing data
      if (Object.keys(transformedData).length > 0) {
        form.setFormData(transformedData);
        autoLoadedRef.current = true;
        
        // Show which quarters have data
        const quartersWithData = [];
        if (Object.values(transformedData).some((data: any) => data.q1 > 0)) quartersWithData.push('Q1');
        if (Object.values(transformedData).some((data: any) => data.q2 > 0)) quartersWithData.push('Q2');
        if (Object.values(transformedData).some((data: any) => data.q3 > 0)) quartersWithData.push('Q3');
        if (Object.values(transformedData).some((data: any) => data.q4 > 0)) quartersWithData.push('Q4');
        
        toast.success("📋 Loaded existing execution data", {
          description: `Found data for ${Object.keys(transformedData).length} activities. Previous quarters: ${quartersWithData.join(', ')}`
        });
      }
    }
  }, [existingExecution?.exists, existingExecution?.entry?.id, initialData]); // Simplified dependencies

  // ===== PAYMENT TRACKING LOGIC =====
  // Get opening balance from Section A-2
  const openingBalanceCode = useMemo(() => {
    const projectPrefix = projectType.toUpperCase();
    const facilityPrefix = facilityType === 'health_center' ? 'HEALTH_CENTER' : 'HOSPITAL';
    return `${projectPrefix}_EXEC_${facilityPrefix}_A_2`;
  }, [projectType, facilityType]);

  const openingBalance = useMemo(() => {
    const quarterKey = quarter.toLowerCase() as 'q1' | 'q2' | 'q3' | 'q4';
    const value = Number(form.formData[openingBalanceCode]?.[quarterKey]) || 0;
    
    console.log('🔍 [AutoLoad - Opening Balance] Debug:', {
      openingBalanceCode,
      quarterKey,
      extractedValue: value,
      formDataEntry: form.formData[openingBalanceCode],
    });
    
    return value;
  }, [form.formData, openingBalanceCode, quarter]);

  // Use expense calculations hook to compute Cash at Bank and Payables
  const { cashAtBank, payables, totalPaid, totalUnpaid } = useExpenseCalculations({
    formData: form.formData,
    openingBalance,
    activities: form.activities,
    quarter,
  });

  console.log('💰 [AutoLoad - Payment Tracking] Calculations:', {
    openingBalance,
    cashAtBank,
    totalPaid,
    totalUnpaid,
    payablesCount: Object.keys(payables).length,
  });
  
  // Debug: Check if Section D and E codes exist in formData
  // projectType is already normalized to MAL (not Malaria) at the page level
  const projectPrefix = projectType.toUpperCase();
  const facilityPrefix = facilityType === 'health_center' ? 'HEALTH_CENTER' : 'HOSPITAL';
  const cashAtBankCode = `${projectPrefix}_EXEC_${facilityPrefix}_D_1`;
  const sectionDCodes = Object.keys(form.formData).filter(k => k.includes('_D_'));
  const sectionECodes = Object.keys(form.formData).filter(k => k.includes('_E_'));
  
  console.log('🔍 [AutoLoad] Section D & E Debug:', {
    cashAtBankCode,
    cashAtBankCodeExists: cashAtBankCode in form.formData,
    sectionDCodes,
    sectionECodes,
    allFormDataCodes: Object.keys(form.formData),
  });

  // Auto-update Section D (Cash at Bank) and Section E (Payables) with computed values
  // ONLY in create mode - in edit mode, values are loaded from backend
  const hasInitializedRef = useRef(false);
  
  useEffect(() => {
    console.log('🔧 [AutoLoad] useEffect triggered:', {
      mode: effectiveMode,
      hasActivities: !!form.activities,
      cashAtBank,
      payablesCount: Object.keys(payables).length,
      hasInitialized: hasInitializedRef.current,
    });
    
    // Skip auto-update in view mode only (read-only)
    if (effectiveMode === 'view') {
      console.log('⚠️ [AutoLoad] Skipping auto-update - in view mode (read-only)');
      return;
    }
    
    if (!form.activities) {
      console.log('⚠️ [AutoLoad] Skipping update - activities not available yet');
      return;
    }

    // projectType is already normalized to MAL (not Malaria) at the page level
    const projectPrefix = projectType.toUpperCase();
    const facilityPrefix = facilityType === 'health_center' ? 'HEALTH_CENTER' : 'HOSPITAL';
    const cashAtBankCode = `${projectPrefix}_EXEC_${facilityPrefix}_D_1`;
    
    const quarterKey = quarter.toLowerCase() as 'q1' | 'q2' | 'q3' | 'q4';
    const currentCashValue = form.formData[cashAtBankCode]?.[quarterKey];
    
    console.log('💰 [AutoLoad] Updating Cash at Bank:', {
      projectType,
      projectPrefix,
      facilityPrefix,
      cashAtBankCode,
      currentValue: currentCashValue,
      allFormDataKeys: Object.keys(form.formData).filter(k => k.includes('_D_')),
      newValue: cashAtBank,
      willUpdate: currentCashValue !== cashAtBank,
      formDataHasCode: cashAtBankCode in form.formData,
    });
    
    if (currentCashValue !== cashAtBank) {
      console.log('🔄 [AutoLoad] Calling onFieldChange for Cash at Bank');
      form.onFieldChange(cashAtBankCode, cashAtBank);
    }

    // Update all payable category fields
    // Get all Section E codes from formData
    const allSectionECodes = Object.keys(form.formData).filter(code => code.includes('_E_'));
    
    console.log('🔍 [AutoLoad] Payables update:', {
      payablesWithValues: Object.keys(payables),
      allSectionECodes,
    });
    
    // Update payables that have values
    Object.entries(payables).forEach(([payableCode, amount]) => {
      const currentPayableValue = form.formData[payableCode]?.[quarterKey];
      
      if (currentPayableValue !== amount) {
        console.log('🔄 [AutoLoad] Updating Payable:', { payableCode, amount });
        form.onFieldChange(payableCode, amount);
      }
    });
    
    // Clear payables that should be 0 (not in the payables object)
    allSectionECodes.forEach((payableCode) => {
      // Skip if this payable already has a value in the payables object
      if (payableCode in payables) {
        return;
      }
      
      const currentPayableValue = form.formData[payableCode]?.[quarterKey];
      
      // If the current value is not 0, clear it
      if (currentPayableValue !== 0 && currentPayableValue !== undefined) {
        console.log('🧹 [AutoLoad] Clearing payable to 0:', {
          payableCode,
          currentValue: currentPayableValue,
        });
        form.onFieldChange(payableCode, 0);
      }
    });
    
    hasInitializedRef.current = true;
  }, [cashAtBank, payables, form.activities, projectType, facilityType, quarter, form.formData, form.onFieldChange, effectiveMode]);
  // ===== END PAYMENT TRACKING LOGIC =====

  // Initialize the smart submission handler
  const { handleSubmission, isSubmitting, error } = useExecutionSubmissionHandler({
    projectType,
    facilityType,
    quarter,
    schemaId: schemaIdProp ?? (form.schema as any)?.id ?? 0,
    isValid: form.isValid,
    canSubmitExecution: (form as any).canSubmitExecution ?? true,
  });

  // Build a stable draft id and metadata for this session
  const draftMeta = useMemo(() => {
    const qpFacilityId = Number(searchParams?.get("facilityId") || 0) || 0;
    const qpFacilityType = (searchParams?.get("facilityType") as any) || facilityType;
    const qpFacilityName = searchParams?.get("facilityName") || "";
    const qpProgram = (searchParams?.get("program") as any) || projectType;
    const qpReporting = searchParams?.get("reportingPeriodId") || String(currentReportingPeriod?.id ?? "") || quarter;
    return {
      facilityId: qpFacilityId,
      facilityName: qpFacilityName,
      reportingPeriod: String(qpReporting),
      programName: qpProgram,
      fiscalYear: "",
      mode: effectiveMode as any,
      facilityType: qpFacilityType as any,
    };
  }, [searchParams, facilityType, projectType, quarter, effectiveMode]);

  const draftId = useMemo(() => {
    const raw = `${draftMeta.facilityId}_${draftMeta.reportingPeriod}_${draftMeta.programName}_${draftMeta.facilityType}_${draftMeta.facilityName}_${draftMeta.mode}`;
    return raw.replace(/\s+/g, '_');
  }, [draftMeta]);

  // Select only the action to avoid re-render loops
  const saveTemporary = useTempSaveStore(s => s.saveTemporary);
  const restoreTemporary = useTempSaveStore(s => s.restoreTemporary);
  const lastSavedIso = useTempSaveStore(s => s.saves[draftId]?.timestamps.lastSaved);

  function buildSubmissionActivities() {
    const entries = Object.entries(form.formData || {});
    const activities = entries
      .map(([code, v]: any) => ({
        code,
        q1: Number(v?.q1) || 0,
        q2: Number(v?.q2) || 0,
        q3: Number(v?.q3) || 0,
        q4: Number(v?.q4) || 0,
        comment: typeof v?.comment === "string" ? v.comment : "",
        // Include payment tracking data
        paymentStatus: v?.paymentStatus || "unpaid",
        amountPaid: Number(v?.amountPaid) || 0,
      }))
      // Drop totals/computed placeholders if they carry no data
      .filter(a => (a.q1 + a.q2 + a.q3 + a.q4) !== 0 || (a.comment ?? "").trim().length > 0);
    
    // Debug: Log what we're sending
    console.log('📤 [buildSubmissionActivities] Sending to backend:', {
      totalActivities: activities.length,
      sectionBExpenses: activities.filter(a => a.code.includes('_B_')),
      sectionDCashAtBank: activities.filter(a => a.code.includes('_D_')),
      sectionEPayables: activities.filter(a => a.code.includes('_E_')),
    });
    
    return activities;
  }

  const saveDraft = useCallback(() => {
    try {
      const formValues = form.formData;
      const formRows: any[] = [];
      const expandedRows: string[] = [];
      saveTemporary(draftId, formRows as any, formValues as any, expandedRows, draftMeta);
    } catch (err) {
      console.error("autosave:error", err);
    }
  }, [saveTemporary, draftId, draftMeta, form.formData]);

  // Auto-save when debounced server compute is done and form is dirty
  useEffect(() => {
    if (!form.isDirty || isReadOnly) return;  
    saveDraft();
    // Only depend on data and id; saveTemporary is stable via selector
  }, [form.formData, form.isDirty, draftId, isReadOnly]);

  // Restore draft once after activities are ready
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    const hasActivities = Array.isArray(form.activities) && (form.activities as any).length > 0;
    if (!hasActivities) return;
    
    // Skip temporary restore in edit/readOnly mode when we have initial data - we want to load the saved execution data
    if ((mode === "edit" || mode === "readOnly") && initialData && Object.keys(initialData).length > 0) {
      restoredRef.current = true;
      return;
    }
    
    // Skip restore if we're auto-loading existing execution data
    if (existingExecution?.exists && !initialData) {
      restoredRef.current = true;
      return;
    }
    
    const save = restoreTemporary(draftId);
    if (save && save.formValues && Object.keys(save.formValues).length > 0) {
      // Merge to preserve schema-initialized keys; prefer saved values
      const merged = { ...form.formData, ...(save.formValues as any) } as any;
      form.setFormData(merged);
      restoredRef.current = true;
    } else {
      restoredRef.current = true;
    }
  }, [draftId, form.activities?.length, restoreTemporary, mode, initialData, existingExecution?.exists]);

  // Smart submission handler that uses create or update based on existing data
  const handleSmartSubmission = useCallback(async () => {
    if (isReadOnly || isSubmitting) return;

    try {
      console.log('💾 [handleSmartSubmission] Starting submission...');
      
      // Log current formData state for Section E before building activities
      const quarterKey = quarter.toLowerCase() as 'q1' | 'q2' | 'q3' | 'q4';
      const sectionEData = Object.keys(form.formData)
        .filter(code => code.includes('_E_'))
        .map(code => ({
          code,
          value: form.formData[code]?.[quarterKey],
        }));
      
      console.log('📊 [handleSmartSubmission] Section E values in formData:', sectionEData);
      
      // Extract form parameters
      const programParam = searchParams?.get("program");
      const programAsProjectId = programParam && /^\d+$/.test(programParam) ? Number(programParam) : null;
      const projectIdForSubmission = effectiveMode === "edit" 
        ? (projectIdProp ?? projectId) 
        : (programAsProjectId ?? projectId);
      const facilityIdForSubmission = effectiveMode === "edit" 
        ? (facilityIdProp ?? facilityId) 
        : facilityId;
      const reportingPeriodIdForSubmission = effectiveMode === "edit"
        ? (reportingPeriodIdProp ?? reportingPeriodId)
        : reportingPeriodId;
      const facilityNameForSubmission = effectiveMode === "edit" 
        ? (facilityNameProp ?? "") 
        : (searchParams?.get("facilityName") || "");
      const programParamEffective = effectiveMode === "edit" 
        ? (programNameProp ?? projectType) 
        : (searchParams?.get("program") || projectType);

      const activities = buildSubmissionActivities();

      await handleSubmission({
        projectId: projectIdForSubmission,
        facilityId: facilityIdForSubmission,
        reportingPeriodId: reportingPeriodIdForSubmission,
        facilityName: facilityNameForSubmission,
        activities,
        programName: programParamEffective,
      });
    } catch (err) {
      console.error("submit:execution:error", err);
      toast.error("Failed to submit execution", { 
        description: String((err as any)?.message || err) 
      });
    }
  }, [
    isReadOnly,
    isSubmitting,
    searchParams,
    effectiveMode,
    projectIdProp,
    facilityIdProp,
    reportingPeriodIdProp,
    facilityNameProp,
    programNameProp,
    currentReportingPeriod,
    projectType,
    handleSubmission,
    buildSubmissionActivities,
    projectId,
    facilityId,
    reportingPeriodId,
  ]);

  // Show loading state when checking for existing execution
  if (isCheckingExisting) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Checking for existing execution data...</p>
        </div>
      </div>
    );
  }

  return (
    <ExecutionFormProvider value={{
      formData: form.formData,
      computedValues: form.computedValues,
      onFieldChange: isReadOnly ? () => {} : form.onFieldChange,
      onCommentChange: isReadOnly ? () => {} : form.onCommentChange,
      updateExpensePayment: isReadOnly ? () => {} : form.updateExpensePayment,
      validationErrors: form.validationErrors,
      isCalculating: form.status.isCalculating,
      isValidating: form.status.isValidating,
      isBalanced: form.isBalanced,
      difference: form.difference,
      table: form.table,
      isQuarterEditable: (q) => isReadOnly ? true : form.isQuarterEditable(q),
      isQuarterVisible: form.isQuarterVisible,
      getSectionTotals: form.getSectionTotals,
      getRowState: (code) => {
        const originalState = form.getRowState(code);
        return {
          ...originalState,
          isEditable: isReadOnly ? false : originalState.isEditable,
        };
      },
      isRowLocked: (code, q) => isReadOnly ? false : form.isRowLocked(code, q),
      expandState: form.expandState,
      onToggleSection: form.onToggleSection,
    }}>
      <ExecutionActionsProvider
        value={{
          isSubmitting: isSubmitting || form.status.isCalculating || form.status.isValidating,
          isDirty: isReadOnly ? false : form.isDirty,
          isValid: isReadOnly ? true : form.isValid,
          validationErrors: form.validationErrors,
          lastSaved: null,
          onSaveDraft: () => {
            if (isReadOnly) return;
            saveDraft();
          },
          onSubmit: handleSmartSubmission,
          onCancel: () => {
            console.log({ action: "cancelExecution" });
          },
        }}
      >
        <div className="space-y-4">
          {/* Show notification if we auto-loaded existing data */}
          {existingExecution?.exists && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800">
                📋 <strong>Existing execution found!</strong> Data from previous quarters has been loaded. 
                Fill in the current quarter ({quarter}) data below.
              </p>
            </div>
          )}
          
          <ExecutionHeader />
          <ExecutionTable />
          {!isReadOnly && (
            <FormActions
              module="execution"
              onSaveDraft={saveDraft}
              onSubmit={handleSmartSubmission}
              onCancel={() => console.log({ action: "cancelClick" })}
              isSubmitting={isSubmitting || form.status.isCalculating || form.status.isValidating}
              isDirty={form.isDirty}
              isValid={form.isValid && (form as any).canCreateReport}
              validationErrors={form.validationErrors}
              submitLabel={existingExecution?.exists ? `Update Execution (${quarter})` : "Submit Execution"}
              showStatementButtons
              onGenerateStatement={() => console.log({ action: "generateStatement" })}
              onViewStatement={() => console.log({ action: "viewStatement" })}
              lastSaved={lastSavedIso ? new Date(lastSavedIso) : undefined}
            />
          )}
        </div>
      </ExecutionActionsProvider>
    </ExecutionFormProvider>
  );
}

export default EnhancedExecutionFormAutoLoad;
