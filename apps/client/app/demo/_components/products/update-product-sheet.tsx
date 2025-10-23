"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Product } from "@/db/schema";

import { updateProductAction } from "../../_lib/product-server-actions";
import { type UpdateProductSchema, updateProductSchema } from "../../_lib/validations";
import { ProductForm } from "./product-form";

interface UpdateProductSheetProps
  extends React.ComponentPropsWithRef<typeof Sheet> {
  product: Product | null;
}

export function UpdateProductSheet({ product, ...props }: UpdateProductSheetProps) {
  const [isPending, startTransition] = React.useTransition();

  const form = useForm<UpdateProductSchema>({
    resolver: zodResolver(updateProductSchema),
    defaultValues: {
      name: product?.name ?? "",
      category: product?.category ?? "electronics",
      status: product?.status ?? "active",
      price: product?.price ?? 0,
      stock: product?.stock ?? 0,
    },
  });

  React.useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        category: product.category,
        status: product.status,
        price: product.price,
        stock: product.stock,
      });
    }
  }, [product, form]);

  const onSubmit = (data: UpdateProductSchema) => {
    if (!product) return;

    startTransition(async () => {
      const { error } = await updateProductAction({
        id: product.id,
        ...data,
      });

      if (error) {
        toast.error(error);
        return;
      }

      toast.success("Product updated");
      props.onOpenChange?.(false);
    });
  };

  return (
    <Sheet {...props}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Update Product</SheetTitle>
          <SheetDescription>
            Make changes to the product details below.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <ProductForm form={form} />
          <SheetFooter>
            <SheetClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </SheetClose>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader className="mr-2 size-4 animate-spin" />}
              Update Product
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
