import { honoClient as client } from "@/api-client/index";
import type { InferRequestType, InferResponseType } from "hono/client";

// Type inference for request payload
export type SignUpRequest = InferRequestType<
  (typeof client)["accounts"]["sign-up"]["$post"]
>["json"];

// Type inference for response data
export type SignUpResponse = InferResponseType<
  (typeof client)["accounts"]["sign-up"]["$post"]
>;

async function signUp(payload: SignUpRequest) {
  const response = await client.accounts["sign-up"].$post({
    json: payload,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data;
}

export default signUp;
