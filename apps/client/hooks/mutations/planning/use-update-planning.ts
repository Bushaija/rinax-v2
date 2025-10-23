// import updatePlanning from "@/fetchers/planning/update-planning";
// import { useMutation, useQueryClient } from "@tanstack/react-query";
// import type { UpdatePlanningRequest } from "@/fetchers/planning/update-planning";

// function useUpdatePlanning() {
//   const queryClient = useQueryClient();
  
//   return useMutation({
//     mutationFn: updatePlanning,
//     onSuccess: (data, variables) => {
//       // Invalidate related queries
//       queryClient.invalidateQueries({
//         queryKey: ["planning", "list"]
//       });
      
//       // Update the specific planning data in cache
//       queryClient.setQueryData(
//         ["planning", "detail", variables.id],
//         data
//       );
//     },
//     onError: (error) => {
//       console.error("Failed to update planning data:", error);
//     },
//   });
// }

// export default useUpdatePlanning;

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updatePlanning } from "@/fetchers/planning/update-planning";
import type { UpdatePlanningDataRequest } from "@/fetchers/planning/types";
import { toast } from "sonner";

interface UseUpdatePlanningParams {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

export function useUpdatePlanning(params?: UseUpdatePlanningParams) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: UpdatePlanningDataRequest }) =>
      updatePlanning(id, data),
    onSuccess: (data, variables) => {
      // Update specific queries
      queryClient.setQueryData(["planning", "detail", variables.id], data);
      queryClient.invalidateQueries({ queryKey: ["planning", "list"] });
      
      // If reportingPeriodId changed, invalidate summary
      if (variables.data.reportingPeriodId) {
        queryClient.invalidateQueries({ queryKey: ["planning", "summary"] });
      }
      
      toast.success("Planning data updated successfully");
      params?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update planning data");
      params?.onError?.(error);
    },
  });
}

