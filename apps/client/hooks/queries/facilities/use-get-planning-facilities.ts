import getPlanningFacilities, {
    type GetPlanningFacilitiesResponse,
  } from "@/fetchers/facilities/get-planning-facilities";
  import { useQuery } from "@tanstack/react-query";
  
  interface UseGetPlanningFacilitiesParams {
    program: string;
    facilityType: string;
    districtId: number | string;
    reportingPeriodId?: number | string;
  }
  
  export function useGetPlanningFacilities(params: UseGetPlanningFacilitiesParams) {
    const { program, facilityType, districtId, reportingPeriodId } = params;
    
    // Convert IDs to strings for the query
    const districtIdStr = String(districtId);
    const reportingPeriodIdStr = reportingPeriodId ? String(reportingPeriodId) : undefined;
  
    return useQuery<GetPlanningFacilitiesResponse>({
      queryFn: () =>
        getPlanningFacilities({
          program,
          facilityType,
          districtId: districtIdStr,
          ...(reportingPeriodIdStr && { reportingPeriodId: reportingPeriodIdStr }),
        }),
      queryKey: ["facilities", "planning", program, facilityType, districtIdStr, reportingPeriodIdStr],
      enabled: !!program && !!facilityType && !!districtId,
    });
  }