import { honoClient as client } from "@/api-client/index";

export interface ExecutionFormSchema {
  id: number;
  name: string;
  version: string;
  schema: any;
  metadata: any;
}

export async function getExecutionFormSchema(params: {
  projectType?: "HIV" | "Malaria" | "TB";
  facilityType?: "hospital" | "health_center";
}) {
  const response = await (client.execution as any)["schema"].$get({
    query: params,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to fetch execution form schema");
  }

  const json = await response.json();
  return json.data as ExecutionFormSchema;
}


