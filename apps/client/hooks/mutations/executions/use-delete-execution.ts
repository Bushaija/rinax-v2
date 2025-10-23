import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteExecution, type DeleteExecutionRequest, type DeleteExecutionResponse } from "@/fetchers/execution/delete-execution";

export function useDeleteExecution() {
  const queryClient = useQueryClient();

  return useMutation<DeleteExecutionResponse, Error, DeleteExecutionRequest>({
    mutationFn: deleteExecution,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["execution", "list"] });
      queryClient.removeQueries({ queryKey: ["execution", "detail", variables.id] });
    },
  });
}



