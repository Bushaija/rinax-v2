import { useQuery } from "@tanstack/react-query";
import { 
  getCompiledExecution, 
  type GetCompiledExecutionRequest, 
  type GetCompiledExecutionResponse 
} from "@/fetchers/execution/get-compiled-execution";

function useGetCompiledExecution(query: GetCompiledExecutionRequest) {
  return useQuery<GetCompiledExecutionResponse>({
    queryFn: () => getCompiledExecution(query),
    queryKey: [
      "execution",
      "compiled",
      query?.projectType ?? null,
      query?.facilityType ?? null,
      query?.reportingPeriodId ?? null,
      query?.year ?? null,
      query?.quarter ?? null,
      query?.districtId ?? null,
    ],
    enabled: Boolean(query && Object.keys(query as any).length > 0),
  });
}

export default useGetCompiledExecution;
