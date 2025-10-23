import { honoClient as client } from "@/api-client/index";
import type { InferRequestType, InferResponseType } from "hono/client";

// Type inference for request body (json)
export type CreateExecutionRequest = InferRequestType<
  (typeof client)["execution"]["$post"]
>["json"];

// Type inference for response data
export type CreateExecutionResponse = InferResponseType<
  (typeof client)["execution"]["$post"]
>;

export async function createExecution(json: CreateExecutionRequest) {
  const response = await (client as any).execution.$post({
    json,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data as CreateExecutionResponse;
}



