"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Ellipsis } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { products, type Product } from "@/server/db/schema/demo/schema";
import { formatDate } from "@/lib/format";
import type { DataTableRowAction } from "@/types/data-table";

interface GetProductsTableColumnsProps {
  categoryCounts: Record<string, number>;
  statusCounts: Record<string, number>;
  priceRange: { min: number; max: number };
  setRowAction: React.Dispatch<React.SetStateAction<DataTableRowAction<Product> | null>>;
}

export function getProductsTableColumns({
  categoryCounts,
  statusCounts,
  priceRange,
  setRowAction,
}: GetProductsTableColumnsProps): ColumnDef<Product>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || 
                   (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },
    {
      id: "sku",
      accessorKey: "sku",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="SKU" />
      ),
      cell: ({ row }) => <div className="w-24 font-mono">{row.getValue("sku")}</div>,
    },
    {
      id: "name",
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Product Name" />
      ),
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate font-medium">
          {row.getValue("name")}
        </div>
      ),
      meta: {
        label: "Product Name",
        placeholder: "Search products...",
        variant: "text",
      },
      enableColumnFilter: true,
    },
    {
      id: "category",
      accessorKey: "category",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Category" />
      ),
      cell: ({ cell }) => {
        const category = cell.getValue<string>();
        return (
          <Badge variant="outline" className="capitalize">
            {category}
          </Badge>
        );
      },
      meta: {
        label: "Category",
        variant: "multiSelect",
        options: products.category.enumValues.map((category) => ({
          label: category.charAt(0).toUpperCase() + category.slice(1),
          value: category,
          count: categoryCounts[category] || 0,
        })),
      },
      enableColumnFilter: true,
    },
    {
      id: "status",
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ cell }) => {
        const status = cell.getValue<string>();
        const variant = status === "active" ? "default" : 
                       status === "inactive" ? "secondary" : "destructive";
        return (
          <Badge variant={variant} className="capitalize">
            {status}
          </Badge>
        );
      },
      meta: {
        label: "Status",
        variant: "multiSelect",
        options: products.status.enumValues.map((status) => ({
          label: status.charAt(0).toUpperCase() + status.slice(1),
          value: status,
          count: statusCounts[status] || 0,
        })),
      },
      enableColumnFilter: true,
    },
    {
      id: "price",
      accessorKey: "price",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Price" />
      ),
      cell: ({ cell }) => {
        const price = cell.getValue<number>();
        return <div className="text-right">${price.toFixed(2)}</div>;
      },
      meta: {
        label: "Price",
        variant: "range",
        range: [priceRange.min, priceRange.max],
        unit: "$",
      },
      enableColumnFilter: true,
    },
    {
      id: "stock",
      accessorKey: "stock",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Stock" />
      ),
      cell: ({ cell }) => {
        const stock = cell.getValue<number>();
        const variant = stock === 0 ? "destructive" : 
                       stock < 10 ? "secondary" : "default";
        return (
          <Badge variant={variant}>
            {stock} units
          </Badge>
        );
      },
    },
    {
      id: "createdAt",
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created" />
      ),
      cell: ({ cell }) => formatDate(cell.getValue<Date>()),
      meta: {
        label: "Created At",
        variant: "dateRange",
      },
      enableColumnFilter: true,
    },
    {
      id: "actions",
      cell: function Cell({ row }) {
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label="Open menu"
                variant="ghost"
                className="flex size-8 p-0 data-[state=open]:bg-muted"
              >
                <Ellipsis className="size-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onSelect={() => window.open(`/products/${row.original.id}/details`, '_blank')}
              >
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setRowAction({ row, variant: "update" })}
              >
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => setRowAction({ row, variant: "delete" })}
              >
                Delete
                <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      size: 40,
    },
  ];
}