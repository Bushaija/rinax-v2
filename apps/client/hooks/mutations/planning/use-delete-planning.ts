import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deletePlanning } from "@/fetchers/planning/delete-planning";
import { toast } from "sonner";

export function useDeletePlanning() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | number) => deletePlanning(id),
    onSuccess: (_, deletedId) => {
      // Remove from cache and invalidate list
      queryClient.removeQueries({ queryKey: ["planning", "detail", deletedId] });
      queryClient.invalidateQueries({ queryKey: ["planning", "list"] });
      queryClient.invalidateQueries({ queryKey: ["planning", "summary"] });
      
      toast.success("Planning data deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete planning data");
    },
  });
}