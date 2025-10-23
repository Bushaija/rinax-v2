"use client";

import type { Table } from "@tanstack/react-table";
import { Check, ChevronsUpDown, Plus, Settings2 } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CreateTaskSheet } from "@/app/demo/_components/tasks/create-task-sheet";
import { CreateProductModal } from "@/app/demo/_components/products/dynamic-product-form";

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>;
}

// Create Product Button Component
function CreateProductButton({ 
  onSuccess, 
  onCancel 
}: { 
  onSuccess?: (data: any) => void; 
  onCancel?: () => void; 
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      {/* <Button 
        variant="outline" 
        size="sm"
        onClick={() => setOpen(true)}
      >
        <Plus />
        New product 2
      </Button>
      <CreateProductModal 
        open={open}
        onOpenChange={setOpen}
        onSuccess={(data) => {
          setOpen(false);
          onSuccess?.(data);
        }}
        onCancel={() => {
          setOpen(false);
          onCancel?.();
        }}
      /> */}
    </>
  );
}

export function DataTableViewOptions<TData>({
  table,
}: DataTableViewOptionsProps<TData>) {
  const columns = React.useMemo(
    () =>
      table
        .getAllColumns()
        .filter(
          (column) =>
            typeof column.accessorFn !== "undefined" && column.getCanHide(),
        ),
    [table],
  );

  // Determine if this is a tasks or products table based on the data structure
  const isTasksTable = React.useMemo(() => {
    const firstRow = table.getRowModel().rows[0];
    if (!firstRow) return false;
    
    const data = firstRow.original as any;
    // Check for task-specific fields
    return data && (
      'title' in data || 
      'code' in data || 
      'label' in data || 
      'priority' in data ||
      'estimated_hours' in data
    );
  }, [table]);

  const isProductsTable = React.useMemo(() => {
    const firstRow = table.getRowModel().rows[0];
    if (!firstRow) return false;
    
    const data = firstRow.original as any;
    // Check for product-specific fields
    return data && (
      'sku' in data || 
      'name' in data || 
      'category' in data || 
      'price' in data ||
      'stock' in data
    );
  }, [table]);

  return (
    <div className="flex items-center gap-2">
      {/* New Item Button */}
      {isTasksTable && (
        <CreateTaskSheet />
      )}
      {isProductsTable && (
        <CreateProductButton 
          onSuccess={() => {
            // Optionally refresh the table or show success message
            console.log("Product created successfully");
          }}
          onCancel={() => {
            console.log("Product creation cancelled");
          }}
        />
      )}
      
      {/* View Options Button */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            aria-label="Toggle columns"
            role="combobox"
            variant="outline"
            size="sm"
            className="ml-auto hidden h-8 lg:flex"
          >
            <Settings2 />
            View
            <ChevronsUpDown className="ml-auto opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-44 p-0">
          <Command>
            <CommandInput placeholder="Search columns..." />
            <CommandList>
              <CommandEmpty>No columns found.</CommandEmpty>
              <CommandGroup>
                {columns.map((column) => (
                  <CommandItem
                    key={column.id}
                    onSelect={() =>
                      column.toggleVisibility(!column.getIsVisible())
                    }
                  >
                    <span className="truncate">
                      {column.columnDef.meta?.label ?? column.id}
                    </span>
                    <Check
                      className={cn(
                        "ml-auto size-4 shrink-0",
                        column.getIsVisible() ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
