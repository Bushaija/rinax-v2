// import createPlanning from "@/fetchers/planning/create-planning";
// import { useMutation, useQueryClient } from "@tanstack/react-query";
// import type { CreatePlanningRequest } from "@/fetchers/planning/create-planning";

// function useCreatePlanning() {
//   const queryClient = useQueryClient();
  
//   return useMutation({
//     mutationFn: createPlanning,
//     onSuccess: (data, variables) => {
//       // Invalidate related queries
//       queryClient.invalidateQueries({
//         queryKey: ["planning", "list"]
//       });
      
//       // Add the new planning data to cache
//       queryClient.setQueryData(
//         ["planning", "detail", data.id],
//         data
//       );
//     },
//     onError: (error) => {
//       console.error("Failed to create planning data:", error);
//     },
//   });
// }

// export default useCreatePlanning;

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPlanning } from "@/fetchers/planning/create-planning";
import type { CreatePlanningDataRequest } from "@/fetchers/planning/types";

export function useCreatePlanning() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePlanningDataRequest) => createPlanning(data),
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["planning", "list"] });
      queryClient.invalidateQueries({ 
        queryKey: ["planning", "summary", {
          projectId: variables.projectId,
          facilityId: variables.facilityId,
          reportingPeriodId: variables.reportingPeriodId
        }]
      });
      
      // Update the detail query cache
      queryClient.setQueryData(["planning", "detail", (data as any).id], data);
    },
    // Let calling component handle UX toasts/errors
  });
}



