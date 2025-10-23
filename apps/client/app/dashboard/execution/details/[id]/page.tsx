"use client";

import { useParams, useRouter } from "next/navigation";
import { ExecutionDetailsView } from "@/app/dashboard/execution/details/_components/execution-details-view";

export default function ExecutionDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const idParam = params?.id as string;
  const executionId = Number(idParam);

  if (!executionId || Number.isNaN(executionId)) {
    router.push("/dashboard/execution");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 md:p-8 max-w-7xl">
        <ExecutionDetailsView 
          executionId={executionId}
          onBack={() => router.push("/dashboard/execution")}
          onEdit={() => router.push(`/dashboard/execution/edit/${executionId}`)}
        /> 
      </div>
    </div>
  );
}



