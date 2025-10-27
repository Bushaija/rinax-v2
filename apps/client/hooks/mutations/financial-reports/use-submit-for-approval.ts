import { useMutation, useQueryClient } from "@tanstack/react-query";
import { submitForApproval } from "@/fetchers/financial-reports/submit-for-approval";

function useSubmitForApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitForApproval,
    onSuccess: () => {
      // Invalidate financial reports list to refetch
      queryClient.invalidateQueries({ queryKey: ["financial-reports", "list"] });
      queryClient.invalidateQueries({ queryKey: ["financial-reports"] });
    },
  });
}

export default useSubmitForApproval;
