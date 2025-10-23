import { useQuery } from "@tanstack/react-query";
import { getExecutionActivities } from "@/fetchers/execution/get-execution-activities";

interface UseExecutionActivitiesParams {
  projectType?: "HIV" | "Malaria" | "TB";
  facilityType?: "hospital" | "health_center";
  enabled?: boolean;
}

export function useExecutionActivities({
  projectType,
  facilityType,
  enabled = true,
}: UseExecutionActivitiesParams) {
  return useQuery({
    queryKey: [
      "execution",
      "activities",
      projectType ?? "all",
      facilityType ?? "all",
    ],
    queryFn: () =>
      getExecutionActivities({ projectType, facilityType }),
    enabled,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 3,
  });
}


