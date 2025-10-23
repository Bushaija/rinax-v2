import { useQuery } from "@tanstack/react-query";
import { getExecutionById, type GetExecutionByIdRequest, type GetExecutionByIdResponse } from "@/fetchers/execution/get-execution-by-id";

export function useGetExecutionById({ id }: GetExecutionByIdRequest) {
  return useQuery<GetExecutionByIdResponse>({
    queryFn: () => getExecutionById({ id }),
    queryKey: ["execution", "detail", id],
    enabled: id !== undefined && id !== null && id !== "",
  });
}




