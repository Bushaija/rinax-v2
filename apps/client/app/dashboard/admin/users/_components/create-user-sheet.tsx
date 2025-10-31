"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader, Plus } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useSignUp } from "@/hooks/mutations/users/use-sign-up";
import { UserForm } from "./user-form";

const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["admin", "accountant", "program_manager", "daf", "dg"] as const),
  facilityId: z.number({
    required_error: "Facility is required",
    invalid_type_error: "Facility is required",
  }).min(1, "Facility is required"),
  permissions: z.array(z.string()),
  projectAccess: z.array(z.number()),
  mustChangePassword: z.boolean(),
  isActive: z.boolean(),
}).refine(
  (data) => {
    // DAF and DG roles require hospital facility - validation happens on server
    // This is just a client-side check for better UX
    return true;
  },
  {
    message: "DAF and DG roles require a hospital facility",
    path: ["facilityId"],
  }
);

type CreateUserFormData = z.infer<typeof createUserSchema>;

export function CreateUserSheet() {
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const signUpMutation = useSignUp();

  const form = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "accountant",
      facilityId: undefined,
      permissions: [],
      projectAccess: [],
      mustChangePassword: true,
      isActive: true,
    },
  });

  function onSubmit(input: CreateUserFormData) {
    startTransition(async () => {
      try {
        // Validate projectAccess contains only valid numbers
        const validProjectAccess = input.projectAccess.filter(id => 
          typeof id === 'number' && !isNaN(id) && id > 0
        );

        // Build payload with proper types - send arrays directly
        const payload = {
          name: input.name,
          email: input.email,
          password: input.password,
          role: input.role,
          facilityId: input.facilityId,
          mustChangePassword: input.mustChangePassword,
          isActive: input.isActive,
          banned: false,
          permissions: input.permissions || [],
          projectAccess: validProjectAccess,
        };

        console.log("Submitting payload:", payload);
        
        await signUpMutation.mutateAsync(payload);

        form.reset();
        setOpen(false);
        toast.success("User created successfully");
      } catch (error) {
        console.error("Sign up error:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to create user";
        toast.error(errorMessage);
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 size-4" />
          New User
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col gap-6 sm:max-w-md">
        <SheetHeader className="text-left">
          <SheetTitle>Create User</SheetTitle>
          <SheetDescription>
            Fill in the details below to create a new user account
          </SheetDescription>
        </SheetHeader>
        <UserForm form={form} onSubmit={onSubmit}>
          <SheetFooter className="gap-2 pt-2 sm:space-x-0">
            <SheetClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </SheetClose>
            <Button disabled={isPending}>
              {isPending && <Loader className="mr-2 size-4 animate-spin" />}
              Create User
            </Button>
          </SheetFooter>
        </UserForm>
      </SheetContent>
    </Sheet>
  );
}
