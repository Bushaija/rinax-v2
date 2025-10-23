"use server";

import { eq, inArray } from "drizzle-orm";
import { revalidateTag, unstable_noStore } from "next/cache";
import { db } from "@/db/index";
import { products } from "@/server/db/schema/demo/schema";
import { getErrorMessage } from "@/lib/handle-error";
import type { CreateProductSchema, UpdateProductSchema } from "./validations";

export async function createProductAction(input: CreateProductSchema) {
  unstable_noStore();
  try {
    await db.insert(products).values({
      sku: `PROD-${Date.now()}`,
      ...input,
    });
    revalidateTag("products");
    revalidateTag("product-category-counts");
    revalidateTag("product-status-counts");
    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: getErrorMessage(err) };
  }
}

export async function updateProductAction(input: UpdateProductSchema & { id: string }) {
  unstable_noStore();
  try {
    await db
      .update(products)
      .set(input)
      .where(eq(products.id, input.id));
    revalidateTag("products");
    revalidateTag("product-category-counts");
    revalidateTag("product-status-counts");
    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: getErrorMessage(err) };
  }
}

export async function updateProductsAction(input: {
  ids: string[];
  status?: string;
  category?: string;
}) {
  unstable_noStore();
  try {
    const updateData: Partial<typeof products.$inferInsert> = {};
    if (input.status) updateData.status = input.status as any;
    if (input.category) updateData.category = input.category as any;

    await db
      .update(products)
      .set(updateData)
      .where(inArray(products.id, input.ids));
    
    revalidateTag("products");
    revalidateTag("product-category-counts");
    revalidateTag("product-status-counts");
    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: getErrorMessage(err) };
  }
}

export async function deleteProductsAction(input: { ids: string[] }) {
  unstable_noStore();
  try {
    await db.delete(products).where(inArray(products.id, input.ids));
    revalidateTag("products");
    revalidateTag("product-category-counts");
    revalidateTag("product-status-counts");
    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: getErrorMessage(err) };
  }
}


