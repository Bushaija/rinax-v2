import { useMutation, useQueryClient } from "@tanstack/react-query";
import {updateExecution, type UpdateExecutionRequest, type UpdateExecutionResponse, type UpdateExecutionParam } from "@/fetchers/execution/update-execution";

type Variables = { params: UpdateExecutionParam; body: UpdateExecutionRequest };

export function useUpdateExecution() {
  const queryClient = useQueryClient();

  return useMutation<UpdateExecutionResponse, Error, Variables>({
    mutationFn: ({ params, body }) => updateExecution(params, body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["execution", "list"] });
      queryClient.setQueryData(["execution", "detail", data.id], data);
    },
  });
}



