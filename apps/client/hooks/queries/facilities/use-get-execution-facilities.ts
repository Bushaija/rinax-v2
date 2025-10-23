import getExecutionFacilities, {
    type GetExecutionFacilitiesResponse,
  } from "@/fetchers/facilities/get-execution-facilities";
  import { useQuery } from "@tanstack/react-query";
  
interface UseGetExecutionFacilitiesParams {
  program: string;
  facilityType: string;
  districtId: number | string;
  reportingPeriodId?: number | string;
  quarter?: "Q1" | "Q2" | "Q3" | "Q4";
}
  
export function useGetExecutionFacilities(params: UseGetExecutionFacilitiesParams) {
  const { program, facilityType, districtId, reportingPeriodId, quarter } = params;
    
    // Convert IDs to strings for the query
    const districtIdStr = String(districtId);
    const reportingPeriodIdStr = reportingPeriodId ? String(reportingPeriodId) : undefined;
  
    return useQuery<GetExecutionFacilitiesResponse>({
      queryFn: () =>
        getExecutionFacilities({
          program,
          facilityType,
          districtId: districtIdStr,
          ...(reportingPeriodIdStr && { reportingPeriodId: reportingPeriodIdStr }),
          ...(quarter && { quarter }),
        }),
      queryKey: ["facilities", "execution", program, facilityType, districtIdStr, reportingPeriodIdStr, quarter],
      enabled: !!program && !!facilityType && !!districtId,
    });
  }
  