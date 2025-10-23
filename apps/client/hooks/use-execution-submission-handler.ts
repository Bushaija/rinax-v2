import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSmartExecutionSubmission, type SmartExecutionSubmissionParams } from "@/hooks/mutations/executions/use-smart-execution-submission";

interface UseExecutionSubmissionHandlerParams {
  projectType: "HIV" | "Malaria" | "TB";
  facilityType: "hospital" | "health_center";
  quarter: "Q1" | "Q2" | "Q3" | "Q4";
  schemaId?: number;
  isValid: boolean;
  canSubmitExecution: boolean;
}

interface SubmissionData {
  projectId: number;
  facilityId: number;
  reportingPeriodId: number;
  facilityName: string;
  activities: Array<{
    code: string;
    q1: number;
    q2: number;
    q3: number;
    q4: number;
    comment: string;
  }>;
  programName?: string;
}

export function useExecutionSubmissionHandler({
  projectType,
  facilityType,
  quarter,
  schemaId,
  isValid,
  canSubmitExecution,
}: UseExecutionSubmissionHandlerParams) {
  const router = useRouter();

  const smartSubmissionMutation = useSmartExecutionSubmission({
    onSuccess: (data, isUpdate) => {
      const action = isUpdate ? "updated" : "created";
      toast.success(`Execution ${action} successfully`, {
        description: isUpdate
          ? "The quarterly data has been merged with the existing execution record."
          : "A new execution record has been created for this combination.",
      });

      // Navigate back to the execution list
      router.push("/dashboard/execution");
    },
    onError: (error, isUpdate) => {
      const action = isUpdate ? "update" : "create";
      toast.error(`Failed to ${action} execution`, {
        description: error.message,
      });
    },
  });

  const handleSubmission = useCallback(
    async (submissionData: SubmissionData) => {
      // Validate required fields
      if (!isValid || !canSubmitExecution) {
        toast.error("Form validation failed", {
          description: "Please fix validation errors before submitting.",
        });
        return;
      }

      if (!schemaId || !submissionData.projectId || !submissionData.facilityId || !submissionData.reportingPeriodId) {
        toast.error("Missing required fields to submit execution", {
          description: `schemaId=${schemaId} projectId=${submissionData.projectId} facilityId=${submissionData.facilityId} reportingPeriodId=${submissionData.reportingPeriodId}`,
        });
        return;
      }

      if (submissionData.activities.length === 0) {
        toast.error("No activities to submit", {
          description: "Please enter at least one activity before submitting.",
        });
        return;
      }

      const params: SmartExecutionSubmissionParams = {
        projectId: submissionData.projectId,
        facilityId: submissionData.facilityId,
        reportingPeriodId: submissionData.reportingPeriodId,
        schemaId,
        formData: {
          activities: submissionData.activities,
          quarter,
        },
        metadata: {
          projectType,
          facilityType,
          quarter,
          facilityName: submissionData.facilityName,
          program: submissionData.programName || projectType,
          projectId: submissionData.projectId,
          facilityId: submissionData.facilityId,
          reportingPeriodId: submissionData.reportingPeriodId,
          source: "dynamic-execution-v2",
        },
      };

      try {
        await smartSubmissionMutation.mutateAsync(params);
      } catch (error) {
        // Error handling is done in the onError callback
        console.error("Execution submission error:", error);
      }
    },
    [
      isValid,
      canSubmitExecution,
      schemaId,
      quarter,
      projectType,
      facilityType,
      smartSubmissionMutation,
    ]
  );

  return {
    handleSubmission,
    isSubmitting: smartSubmissionMutation.isPending,
    error: smartSubmissionMutation.error,
  };
}
