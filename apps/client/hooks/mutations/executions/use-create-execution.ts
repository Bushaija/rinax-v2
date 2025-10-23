import { useMutation, useQueryClient } from "@tanstack/react-query";
import {createExecution, type CreateExecutionRequest, type CreateExecutionResponse } from "@/fetchers/execution/create-execution";

export function useCreateExecution() {
  const queryClient = useQueryClient();

  return useMutation<CreateExecutionResponse, Error, CreateExecutionRequest>({
    mutationFn: createExecution,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["execution", "list", variables.projectId ?? null, variables.facilityId ?? null],
      });

      queryClient.setQueryData(["execution", "detail", data.id], data);
    },
  });
}



