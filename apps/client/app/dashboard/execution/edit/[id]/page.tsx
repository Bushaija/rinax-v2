"use client"

import { useMemo } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"

import EnhancedExecutionForm from "@/features/execution/components/v2/enhanced-execution-form"
import { useGetExecutionById } from "@/hooks/queries/executions/use-get-execution-by-id"
import { useExecutionActivities } from "@/hooks/queries/executions/use-execution-activities"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

function toQuarterLabel(v: string | null | undefined): "Q1" | "Q2" | "Q3" | "Q4" {
  const q = String(v || "Q1").toUpperCase()
  return (["Q1", "Q2", "Q3", "Q4"].includes(q) ? q : "Q1") as any
}

export default function EditExecutionPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = Number(params?.id)
  const searchParams = useSearchParams()

  const { data: executionResponse, isLoading, error } = useGetExecutionById({ id })

  // Extract the main execution data from the response
  const execution = executionResponse?.entry;

  // Get the activities schema to create ID-to-code mapping
  // Only fetch activities if we have execution data
  const activitiesQuery = useExecutionActivities({
    projectType: execution?.formData?.context?.projectType || execution?.schema?.projectType || "HIV",
    facilityType: execution?.formData?.context?.facilityType || execution?.schema?.facilityType || "health_center",
    enabled: !!execution // Only run this query when execution data is available
  });

  const projectType = useMemo(() => {
    // Use the corrected context from the server response first
    const fromCorrectedContext = executionResponse?.ui?.context?.projectType;
    const fromProject = execution?.project?.projectType;
    const fromContext = execution?.formData?.context?.projectType;
    const fromSchema = execution?.schema?.projectType;
    const fromMetadata = execution?.metadata?.projectType;
    const fromUrl = searchParams?.get("program");

    const val = (fromCorrectedContext || fromProject || fromContext || fromSchema || fromMetadata || fromUrl || "HIV").toString();
    const result = (["HIV", "Malaria", "TB"].includes(val) ? val : "HIV") as "HIV" | "Malaria" | "TB";
    return result;
  }, [executionResponse, execution, searchParams]);

  const facilityType = useMemo(() => {
    // Use the corrected context from the server response first
    const fromCorrectedContext = executionResponse?.ui?.context?.facilityType;
    const fromContext = execution?.formData?.context?.facilityType;
    const fromSchema = execution?.schema?.facilityType;
    const fromFacility = execution?.facility?.facilityType;
    const fromMetadata = execution?.metadata?.facilityType;
    const fromUrl = searchParams?.get("facilityType");

    const val = (fromCorrectedContext || fromContext || fromSchema || fromFacility || fromMetadata || fromUrl || "health_center").toString();
    const result = (["hospital", "health_center"].includes(val) ? val : "health_center") as "hospital" | "health_center";
    return result;
  }, [executionResponse, execution, searchParams]);

  const quarter = useMemo(() => {
    // Use the corrected context from the server response first
    const fromCorrectedContext = executionResponse?.ui?.context?.quarter;
    const fromContext = execution?.formData?.context?.quarter;
    const fromMetadata = execution?.metadata?.quarter;
    const fromUrl = searchParams?.get("quarter");

    const result = toQuarterLabel((fromCorrectedContext || fromContext || fromMetadata || fromUrl) as any);
    return result;
  }, [executionResponse, execution, searchParams]);

  const initialData = useMemo(() => {
    // The server now returns structured UI data, so we need to extract from that
    const ui = executionResponse?.ui;

    if (!ui) return undefined;

    // Helper function to safely convert to number
    const toNumber = (val: any): number => {
      if (val === null || val === undefined || val === '') return 0;
      const num = Number(val);
      return isNaN(num) ? 0 : num;
    };

    // Extract activities from all sections (A, B, D, E, G)
    const mapped: Record<string, any> = {};

    // Process section A items
    if (ui.A?.items) {
      ui.A.items.forEach((item: any) => {
        if (item.code) {
          mapped[item.code] = {
            q1: toNumber(item.q1),
            q2: toNumber(item.q2),
            q3: toNumber(item.q3),
            q4: toNumber(item.q4),
            comment: String(item.comment || ""),
          };
        }
      });
    }

    // Process section B groups
    if (ui.B?.groups) {
      ui.B.groups.forEach((group: any) => {
        if (group.items) {
          group.items.forEach((item: any) => {
            if (item.code) {
              mapped[item.code] = {
                q1: toNumber(item.q1),
                q2: toNumber(item.q2),
                q3: toNumber(item.q3),
                q4: toNumber(item.q4),
                comment: String(item.comment || ""),
              };
            }
          });
        }
      });
    }

    // Process section D items
    if (ui.D?.items) {
      ui.D.items.forEach((item: any) => {
        if (item.code) {
          mapped[item.code] = {
            q1: toNumber(item.q1),
            q2: toNumber(item.q2),
            q3: toNumber(item.q3),
            q4: toNumber(item.q4),
            comment: String(item.comment || ""),
          };
        }
      });
    }

    // Process section E items
    if (ui.E?.items) {
      ui.E.items.forEach((item: any) => {
        if (item.code) {
          mapped[item.code] = {
            q1: toNumber(item.q1),
            q2: toNumber(item.q2),
            q3: toNumber(item.q3),
            q4: toNumber(item.q4),
            comment: String(item.comment || ""),
          };
        }
      });
    }

    // Process section G items (excluding computed items)
    if (ui.G?.items) {
      ui.G.items.forEach((item: any) => {
        if (item.code && !item.isComputed) {
          mapped[item.code] = {
            q1: toNumber(item.q1),
            q2: toNumber(item.q2),
            q3: toNumber(item.q3),
            q4: toNumber(item.q4),
            comment: String(item.comment || ""),
          };
        }
      });
    }

    return mapped;
  }, [executionResponse])

  if (!id || Number.isNaN(id)) {
    return (
      <div className="container mx-auto p-4 md:p-8 h-full">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Invalid Execution ID</AlertTitle>
          <AlertDescription>
            The execution ID provided is not valid.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (isLoading || (execution && activitiesQuery.isLoading)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto p-4 md:p-8 max-w-7xl">
          {/* Header Skeleton */}
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <Skeleton className="h-9 w-48" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-4 w-96" />
            </div>
          </div>

          {/* Form Skeleton */}
          <Card>
            <CardHeader>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-32" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sections Skeleton */}
          <div className="mt-4 space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-64" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !execution || (execution && activitiesQuery.error)) {
    return (
      <div className="container mx-auto p-4 md:p-8 h-full">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Execution</AlertTitle>
          <AlertDescription>
            <div className="space-y-2">
              <p>Failed to load execution. {String((error as any)?.message || "Please try again.")}</p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 md:p-8 max-w-7xl">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard/execution')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Execution List
            </Button>
          </div>
          
          <div>
            <h1 className="text-2xl font-bold">Edit Execution</h1>
            <p className="text-gray-600 mt-1">
              Update execution activities and data
            </p>
          </div>
        </div>

        <EnhancedExecutionForm
          projectType={projectType}
          facilityType={facilityType}
          quarter={quarter}
          mode="edit"
          executionId={id}
          initialData={initialData}
          projectId={execution?.projectId}
          facilityId={execution?.facilityId}
          reportingPeriodId={execution?.reportingPeriodId}
          facilityName={execution?.facility?.name || execution?.metadata?.facilityName}
          programName={execution?.project?.projectType || execution?.metadata?.program}
          schemaId={execution?.schemaId}
        />
      </div>
    </div>
  )
}


