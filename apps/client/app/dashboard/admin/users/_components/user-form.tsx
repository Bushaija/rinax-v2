"use client";

import type * as React from "react";
import type { FieldPath, FieldValues, UseFormReturn } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { FacilitySelector } from "@/components/facility-selector";
import type { UserRole } from "@/types/user";

const userRoles: UserRole[] = ["admin", "accountant", "program_manager"];

const permissionOptions = [
  { value: "view_reports", label: "View Reports" },
  { value: "edit_budget", label: "Edit Budget" },
  { value: "all_quarters", label: "All Quarters" },
  { value: "manage_users", label: "Manage Users" },
  { value: "admin_access", label: "Admin Access" },
  { value: "access_previous_fiscal_year_data", label: "Access Previous Fiscal Year Data" },
] as const;

interface UserFormProps<T extends FieldValues>
  extends Omit<React.ComponentPropsWithRef<"form">, "onSubmit"> {
  children: React.ReactNode;
  form: UseFormReturn<T>;
  onSubmit: (data: T) => void;
}

export function UserForm<T extends FieldValues>({
  form,
  onSubmit,
  children,
}: UserFormProps<T>) {
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4 px-4"
      >
        <FormField
          control={form.control}
          name={"name" as FieldPath<T>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter full name"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={"email" as FieldPath<T>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="Enter email address"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={"password" as FieldPath<T>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Enter password (min 8 characters)"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={"role" as FieldPath<T>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="capitalize">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectGroup>
                    {userRoles.map((role) => (
                      <SelectItem
                        key={role}
                        value={role}
                        className="capitalize"
                      >
                        {role.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={"facilityId" as FieldPath<T>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Facility</FormLabel>
              <FormControl>
                <FacilitySelector
                  value={field.value}
                  onChange={field.onChange}
                  error={form.formState.errors.facilityId?.message as string | undefined}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={"permissions" as FieldPath<T>}
          render={() => (
            <FormItem>
              <div className="mb-4">
                <FormLabel className="text-base">Permissions</FormLabel>
              </div>
              {permissionOptions.map((permission) => (
                <FormField
                  key={permission.value}
                  control={form.control}
                  name={"permissions" as FieldPath<T>}
                  render={({ field }) => {
                    return (
                      <FormItem
                        key={permission.value}
                        className="flex flex-row items-start space-x-3 space-y-0"
                      >
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(permission.value)}
                            onCheckedChange={(checked) => {
                              return checked
                                ? field.onChange([...field.value, permission.value])
                                : field.onChange(
                                  field.value?.filter(
                                    (value: string) => value !== permission.value
                                  )
                                );
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">
                          {permission.label}
                        </FormLabel>
                      </FormItem>
                    );
                  }}
                />
              ))}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={"projectAccess" as FieldPath<T>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project Access (comma-separated IDs)</FormLabel>
              <FormControl>
                <Input
                  placeholder="1, 2, 3"
                  value={Array.isArray(field.value) ? field.value.join(", ") : ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (!value || value.trim() === "") {
                      field.onChange([]);
                      return;
                    }
                    const ids = value
                      .split(",")
                      .map((id) => parseInt(id.trim()))
                      .filter((id) => !isNaN(id));
                    field.onChange(ids);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />


        <div className="flex gap-4">
          <FormField
            control={form.control}
            name={"isActive" as FieldPath<T>}
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Active</FormLabel>
                  <div className="text-sm text-muted-foreground">
                    User can access the system
                  </div>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={"mustChangePassword" as FieldPath<T>}
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Must Change Password</FormLabel>
                  <div className="text-sm text-muted-foreground">
                    User must change password on next login
                  </div>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {children}
      </form>
    </Form>
  );
}
