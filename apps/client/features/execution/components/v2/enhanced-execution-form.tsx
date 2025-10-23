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
import { useCreateExecution } from "@/hooks/mutations/executions/use-create-execution";
import { useUpdateExecution } from "@/hooks/mutations/executions/use-update-execution";
import { toast } from "sonner";
import { useGetCurrentReportingPeriod } from "@/hooks/queries";

type Quarter = "Q1" | "Q2" | "Q3" | "Q4";

interface EnhancedExecutionFormProps {
  projectType: "HIV" | "Malaria" | "TB";
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

export function EnhancedExecutionForm({ projectType, facilityType, quarter, mode = "create", executionId, initialData, projectId: projectIdProp, facilityId: facilityIdProp, reportingPeriodId: reportingPeriodIdProp, facilityName: facilityNameProp, programName: programNameProp, schemaId: schemaIdProp }: EnhancedExecutionFormProps) {
  const effectiveMode: "create" | "edit" | "view" = (mode === "readOnly" ? "view" : mode) as any;
  const isReadOnly = effectiveMode === "view";
  const { data: currentReportingPeriod } = useGetCurrentReportingPeriod();
  
  const form = useExecutionForm({ projectType, facilityType, quarter, executionId, initialData });
  const searchParams = useSearchParams();
  const router = useRouter();

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
  const createExecutionMutation = useCreateExecution();
  const updateExecutionMutation = useUpdateExecution();

  function buildSubmissionActivities() {
    const entries = Object.entries(form.formData || {});
    return entries
      .map(([code, v]: any) => ({
        code,
        q1: Number(v?.q1) || 0,
        q2: Number(v?.q2) || 0,
        q3: Number(v?.q3) || 0,
        q4: Number(v?.q4) || 0,
        comment: typeof v?.comment === "string" ? v.comment : "",
      }))
      // Drop totals/computed placeholders if they carry no data
      .filter(a => (a.q1 + a.q2 + a.q3 + a.q4) !== 0 || (a.comment ?? "").trim().length > 0);
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
    
    const save = restoreTemporary(draftId);
    if (save && save.formValues && Object.keys(save.formValues).length > 0) {
      // Merge to preserve schema-initialized keys; prefer saved values
      const merged = { ...form.formData, ...(save.formValues as any) } as any;
      form.setFormData(merged);
      restoredRef.current = true;
    } else {
      restoredRef.current = true;
    }
  }, [draftId, form.activities, restoreTemporary, mode, initialData]);
  return (
    <ExecutionFormProvider value={{
      formData: form.formData,
      computedValues: form.computedValues,
      onFieldChange: isReadOnly ? () => {} : form.onFieldChange,
      onCommentChange: isReadOnly ? () => {} : form.onCommentChange,
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
          isSubmitting: form.status.isCalculating || form.status.isValidating,
          isDirty: isReadOnly ? false : form.isDirty,
          isValid: isReadOnly ? true : form.isValid,
          validationErrors: form.validationErrors,
          lastSaved: null,
          onSaveDraft: () => {
            if (isReadOnly) return;
            saveDraft();
          },
          onSubmit: async () => {
            try {
              if (isReadOnly) {
                return;
              }
              if (!(form.isValid && (form as any).canSubmitExecution)) return;
              const programParam = searchParams?.get("program");
              const programAsProjectId = programParam && /^\d+$/.test(programParam) ? Number(programParam) : null;
              const projectId = effectiveMode === "edit" ? (projectIdProp ?? 0) : (programAsProjectId ?? (Number(searchParams?.get("projectId") || 0) || 0));
              const facilityId = effectiveMode === "edit" ? (facilityIdProp ?? 0) : (Number(searchParams?.get("facilityId") || 0) || 0);
              const reportingPeriodId = effectiveMode === "edit"
                ? (reportingPeriodIdProp ?? (currentReportingPeriod?.id ?? 0))
                : (Number(searchParams?.get("reportingPeriodId") || currentReportingPeriod?.id || 0) || 0);
              const facilityName = effectiveMode === "edit" ? (facilityNameProp ?? "") : (searchParams?.get("facilityName") || "");
              const programParamEffective = effectiveMode === "edit" ? (programNameProp ?? projectType) : (searchParams?.get("program") || projectType);
              const schemaId = effectiveMode === "edit" ? (schemaIdProp ?? (form.schema as any)?.id ?? 0) : ((form.schema as any)?.id ?? 0);
              const activities = buildSubmissionActivities();
              if (!schemaId || !projectId || !facilityId || !reportingPeriodId || activities.length === 0) {
                toast.error("Missing required fields to submit execution", {
                  description: `schemaId=${schemaId} projectId=${projectId} facilityId=${facilityId} reportingPeriodId=${reportingPeriodId} activities=${activities.length}`,
                });
                return;
              }
              const json = {
                schemaId,
                projectId,
                facilityId,
                reportingPeriodId,
                formData: { activities, quarter },
                metadata: {
                  projectType,
                  facilityType,
                  quarter,
                  facilityName,
                  program: programParamEffective,
                  projectId,
                  facilityId,
                  reportingPeriodId,
                  source: "dynamic-execution-v2",
                },
              } as any;
              
              if (effectiveMode === "edit" && executionId) {
                const updateBody = { formData: { activities, quarter } } as any;
                const updated = await updateExecutionMutation.mutateAsync({ params: { id: executionId }, body: updateBody });
              } else {
                const created = await createExecutionMutation.mutateAsync(json);
              }
              const facName = facilityName;
              const facType = searchParams?.get("facilityType") || facilityType;
              const programParam2 = programParamEffective;
              // router.push(`/dashboard/dynamic-execution?facilityName=${encodeURIComponent(facName)}&facilityType=${encodeURIComponent(String(facType))}&projectType=${encodeURIComponent(String(programParam2))}`);
              router.push(`/dashboard/execution`);
            } catch (err) {
              console.error("submit:execution:error", err);
              toast.error("Failed to submit execution", { description: String((err as any)?.message || err) });
            }
          },
          onCancel: () => {
            // navigate back if router available later
            console.log({ action: "cancelExecution" });
          },
        }}
      >
        <div className="space-y-4">
          <ExecutionHeader />
          <ExecutionTable />
          {!isReadOnly ? (
              <FormActions
              module="execution"
              onSaveDraft={saveDraft}
                onSubmit={async () => {
                  if (isReadOnly) return;
                  if (createExecutionMutation.isPending) return;
                  if (!(form.isValid && (form as any).canSubmitExecution)) return;
                  const programParamRaw = searchParams?.get("program");
                  const programAsProjectId2 = programParamRaw && /^\d+$/.test(programParamRaw) ? Number(programParamRaw) : null;
                  const projectId = effectiveMode === "edit" ? (projectIdProp ?? 0) : (programAsProjectId2 ?? (Number(searchParams?.get("projectId") || 0) || 0));
                const facilityId = effectiveMode === "edit" ? (facilityIdProp ?? 0) : (Number(searchParams?.get("facilityId") || 0) || 0);
                  const reportingPeriodId = effectiveMode === "edit"
                    ? (reportingPeriodIdProp ?? (currentReportingPeriod?.id ?? 0))
                    : (Number(searchParams?.get("reportingPeriodId") || currentReportingPeriod?.id || 0) || 0);
                const facilityName = effectiveMode === "edit" ? (facilityNameProp ?? "") : (searchParams?.get("facilityName") || "");
                  const programParam3 = effectiveMode === "edit" ? (programNameProp ?? projectType) : (searchParams?.get("program") || projectType);
                const schemaId = effectiveMode === "edit" ? (schemaIdProp ?? (form.schema as any)?.id ?? 0) : ((form.schema as any)?.id ?? 0);
                const activities = buildSubmissionActivities();
                  if (!schemaId || !projectId || !facilityId || !reportingPeriodId || activities.length === 0) {
                    toast.error("Missing required fields to submit execution", {
                      description: `schemaId=${schemaId} projectId=${projectId} facilityId=${facilityId} reportingPeriodId=${reportingPeriodId} activities=${activities.length}`,
                    });
                    return;
                  }
                const json = {
                  schemaId,
                  projectId,
                  facilityId,
                  reportingPeriodId,
                  formData: { activities, quarter },
                  metadata: {
                    projectType,
                    facilityType,
                    quarter,
                    facilityName,
                    program: programParam3,
                    projectId,
                    facilityId,
                    reportingPeriodId,
                    source: "dynamic-execution-v2",
                  },
                } as any;
                if (effectiveMode === "edit" && executionId) {
                  const updateBody2 = { formData: { activities, quarter } } as any;
                  const updated2 = await updateExecutionMutation.mutateAsync({ params: { id: executionId }, body: updateBody2 });
                } else {
                  const created2 = await createExecutionMutation.mutateAsync(json);
                }
                const facName = facilityName;
                const facType = searchParams?.get("facilityType") || facilityType;
                  const programParam4 = programParam3;
                router.push(`/dashboard/execution?facilityName=${encodeURIComponent(facName)}&facilityType=${encodeURIComponent(String(facType))}&projectType=${encodeURIComponent(String(programParam4))}`);
              }}
              onCancel={() => console.log({ action: "cancelClick" })}
              isSubmitting={createExecutionMutation.isPending || form.status.isCalculating || form.status.isValidating}
              isDirty={form.isDirty}
              isValid={form.isValid && (form as any).canCreateReport}
              validationErrors={form.validationErrors}
              submitLabel={effectiveMode === "edit" ? "Update Execution" : "Submit Execution"}
              showStatementButtons
              onGenerateStatement={() => console.log({ action: "generateStatement" })}
              onViewStatement={() => console.log({ action: "viewStatement" })}
              lastSaved={lastSavedIso ? new Date(lastSavedIso) : undefined}
            />
          ) : null}
        </div>
      </ExecutionActionsProvider>
    </ExecutionFormProvider>
  );
}

export default EnhancedExecutionForm;


