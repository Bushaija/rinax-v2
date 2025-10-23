"use client";

import * as React from "react";
import { DynamicForm, productFields } from "@/components/dynamic-form";
import { updateProductAction } from "../../_lib/product-server-actions";
import type { Product } from "@/db/schema";

interface DynamicProductFormProps {
  product?: Product | null;
  mode: "create" | "edit" | "details";
  onSuccess?: (data: any) => void;
  onCancel?: () => void;
  // Layout preferences
  layout?: "modal" | "page" | "auto";
  // For page forms
  redirectPath?: string;
  // Modal control props
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DynamicProductForm({
  product,
  mode,
  onSuccess,
  onCancel,
  layout = "auto",
  redirectPath,
  open,
  onOpenChange,
}: DynamicProductFormProps) {
  const handleSubmit = async (data: any) => {
    if (mode === "create") {
      // Handle create logic here
      console.log("Creating product:", data);
      return { error: "Create functionality not implemented yet" };
    }
    
    if (mode === "edit" && product) {
      const result = await updateProductAction({
        id: product.id,
        ...data,
      });
      return result.error ? { error: result.error } : {};
    }
    
    return {};
  };

  const config = {
    title: mode === "create" ? "Create Product" : 
           mode === "edit" ? "Update Product" : 
           "Product Details",
    description: mode === "create" ? "Add a new product to your inventory" :
                mode === "edit" ? "Make changes to the product details below" :
                "View product information",
    mode,
    fields: productFields,
    layout,
    maxFieldsForModal: 5, // Will use modal for 5 or fewer fields
    columns: 2 as const, // 2-column grid layout
    showCancel: mode !== "details",
    className: mode === "details" ? "opacity-75" : undefined,
  };

  return (
    <DynamicForm
      config={config}
      data={product || undefined}
      onSubmit={handleSubmit}
      onSuccess={onSuccess}
      onCancel={onCancel}
      redirectPath={redirectPath}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}

// Convenience components for different use cases
export function CreateProductModal({ 
  onSuccess, 
  onCancel,
  open,
  onOpenChange
}: { 
  onSuccess?: (data: any) => void; 
  onCancel?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <DynamicProductForm
      mode="create"
      layout="modal"
      onSuccess={onSuccess}
      onCancel={onCancel}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}

export function EditProductModal({ 
  product, 
  onSuccess, 
  onCancel,
  open = true,
  onOpenChange
}: { 
  product: Product; 
  onSuccess?: (data: any) => void; 
  onCancel?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <DynamicProductForm
      product={product}
      mode="edit"
      layout="modal"
      onSuccess={onSuccess}
      onCancel={onCancel}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}

export function ProductPageForm({ 
  product, 
  mode = "edit",
  redirectPath = "/products"
}: { 
  product?: Product | null; 
  mode?: "create" | "edit" | "details";
  redirectPath?: string;
}) {
  return (
    <DynamicProductForm
      product={product}
      mode={mode}
      layout="page"
      redirectPath={redirectPath}
    />
  );
}
