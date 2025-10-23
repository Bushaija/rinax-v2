"use client";

import type { Row } from "@tanstack/react-table";
import { Loader, Trash } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import type { Product } from "@/db/schema";
import { useMediaQuery } from "@/hooks/use-media-query";

import { deleteProductsAction } from "../../_lib/product-server-actions";

interface DeleteProductsDialogProps
  extends React.ComponentPropsWithRef<typeof Dialog> {
  products: Product[];
  showTrigger?: boolean;
  onSuccess?: () => void;
}

export function DeleteProductsDialog({
  products,
  showTrigger = false,
  onSuccess,
  ...props
}: DeleteProductsDialogProps) {
  const [isPending, startTransition] = React.useTransition();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const onDelete = () => {
    startTransition(async () => {
      const { error } = await deleteProductsAction({
        ids: products.map((product) => product.id),
      });

      if (error) {
        toast.error(error);
        return;
      }

      toast.success("Products deleted");
      onSuccess?.();
      props.onOpenChange?.(false);
    });
  };

  const productCount = products.length;
  const productText = productCount === 1 ? "product" : "products";

  if (isDesktop) {
    return (
      <Dialog {...props}>
        {showTrigger && (
          <DialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash className="mr-2 size-4" />
              Delete {productCount} {productText}
            </Button>
          </DialogTrigger>
        )}
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {productCount} {productText}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {productCount} {productText}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={onDelete}
              disabled={isPending}
            >
              {isPending && <Loader className="mr-2 size-4 animate-spin" />}
              Delete {productCount} {productText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer {...props}>
      {showTrigger && (
        <DrawerTrigger asChild>
          <Button variant="destructive" size="sm">
            <Trash className="mr-2 size-4" />
            Delete {productCount} {productText}
          </Button>
        </DrawerTrigger>
      )}
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Delete {productCount} {productText}</DrawerTitle>
          <DrawerDescription>
            Are you sure you want to delete {productCount} {productText}? This action cannot be undone.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
          <Button
            variant="destructive"
            onClick={onDelete}
            disabled={isPending}
          >
            {isPending && <Loader className="mr-2 size-4 animate-spin" />}
            Delete {productCount} {productText}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
