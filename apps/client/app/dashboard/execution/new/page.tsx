import EnhancedExecutionFormAutoLoad from "@/features/execution/components/v2/enhanced-execution-form-auto-load";
import { getCurrentQuarterForExecution } from "@/features/execution/utils/quarter-management";

interface PageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}

function asString(value: string | string[] | undefined, fallback = ""): string {
  if (Array.isArray(value)) return value[0] ?? fallback;
  return value ?? fallback;
}

export default async function CreateDynamicExecutionPage(props: PageProps) {
  const awaitedSearchParams = typeof (props.searchParams as any)?.then === "function"
    ? await (props.searchParams as Promise<Record<string, string | string[] | undefined>>)
    : ((props.searchParams as Record<string, string | string[] | undefined>) ?? {});

  const rawProgram = asString(awaitedSearchParams.projectId).trim(); // TODO: fix the URL param program to use programName over Id
  const rawFacilityType = asString(awaitedSearchParams.facilityType).trim();
  const rawQuarter = asString(awaitedSearchParams.quarter).trim();

  const allowedPrograms = new Set(["HIV", "Malaria", "TB"]);
  const allowedFacilityTypes = new Set(["hospital", "health_center"]);
  const allowedQuarters = new Set(["Q1", "Q2", "Q3", "Q4"]);

  const projectType = (allowedPrograms.has(rawProgram) ? rawProgram : "HIV") as "HIV" | "Malaria" | "TB";
  const facilityType = (allowedFacilityTypes.has(rawFacilityType) ? rawFacilityType : "health_center") as "hospital" | "health_center";
  

  // Default to Q1 for new executions if no quarter specified
  const quarter = (allowedQuarters.has(rawQuarter) ? rawQuarter : "Q1") as "Q1" | "Q2" | "Q3" | "Q4";

  return (
    <div className="p-4">
      <EnhancedExecutionFormAutoLoad 
        projectType={projectType} 
        facilityType={facilityType} 
        quarter={quarter}
        mode="create"
        // Pass additional params that might be needed for smart submission  
        projectId={(() => {
          const projectIdParam = asString(awaitedSearchParams.projectId);
          const programParam = asString(awaitedSearchParams.program);
          
          // If projectId is numeric, use it; otherwise use program parameter
          if (/^\d+$/.test(projectIdParam)) {
            return Number(projectIdParam);
          } else if (/^\d+$/.test(programParam)) {
            return Number(programParam);
          }
          return undefined;
        })()}
        facilityId={awaitedSearchParams.facilityId ? Number(awaitedSearchParams.facilityId) : undefined}
        reportingPeriodId={awaitedSearchParams.reportingPeriodId ? Number(awaitedSearchParams.reportingPeriodId) : undefined}
        facilityName={asString(awaitedSearchParams.facilityName) || undefined}
        programName={projectType} // Use the resolved projectType instead
      />
    </div>
  );
}