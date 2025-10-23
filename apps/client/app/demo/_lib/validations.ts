import {
  createSearchParamsCache,
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
} from "nuqs/server";
import * as z from "zod";
import { flagConfig } from "@/config/flag";
import { products, type Task, tasks } from "@/server/db/schema/demo/schema";
import { getFiltersStateParser, getSortingStateParser } from "@/lib/parsers";

export const searchParamsCache = createSearchParamsCache({
  filterFlag: parseAsStringEnum(
    flagConfig.featureFlags.map((flag) => flag.value),
  ),
  page: parseAsInteger.withDefault(1),
  perPage: parseAsInteger.withDefault(10),
  sort: getSortingStateParser<Task>().withDefault([
    { id: "createdAt", desc: true },
  ]),
  title: parseAsString.withDefault(""),
  status: parseAsArrayOf(z.enum(tasks.status.enumValues)).withDefault([]),
  priority: parseAsArrayOf(z.enum(tasks.priority.enumValues)).withDefault([]),
  estimatedHours: parseAsArrayOf(z.coerce.number()).withDefault([]),
  createdAt: parseAsArrayOf(z.coerce.number()).withDefault([]),
  // advanced filter
  filters: getFiltersStateParser().withDefault([]),
  joinOperator: parseAsStringEnum(["and", "or"]).withDefault("and"),

  // products validations
  name: parseAsString.withDefault(""),
  category: parseAsArrayOf(z.enum(products.category.enumValues)).withDefault([]),
  status: parseAsArrayOf(z.enum(products.status.enumValues)).withDefault([]),
  price: parseAsArrayOf(z.coerce.number()).withDefault([]),
  createdAt: parseAsArrayOf(z.coerce.number()).withDefault([]),
});

export const createTaskSchema = z.object({
  title: z.string(),
  label: z.enum(tasks.label.enumValues),
  status: z.enum(tasks.status.enumValues),
  priority: z.enum(tasks.priority.enumValues),
  estimatedHours: z.coerce.number().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().optional(),
  label: z.enum(tasks.label.enumValues).optional(),
  status: z.enum(tasks.status.enumValues).optional(),
  priority: z.enum(tasks.priority.enumValues).optional(),
  estimatedHours: z.coerce.number().optional(),
});

// products new schemas
export const createProductSchema = z.object({
  name: z.string().min(1),
  category: z.enum(products.category.enumValues),
  status: z.enum(products.status.enumValues),
  price: z.coerce.number().min(0),
  stock: z.coerce.number().min(0),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.enum(products.category.enumValues).optional(),
  status: z.enum(products.status.enumValues).optional(),
  price: z.coerce.number().min(0).optional(),
  stock: z.coerce.number().min(0).optional(),
});


export type GetTasksSchema = Awaited<
  ReturnType<typeof searchParamsCache.parse>
>;
export type CreateTaskSchema = z.infer<typeof createTaskSchema>;
export type UpdateTaskSchema = z.infer<typeof updateTaskSchema>;

export type CreateProductSchema = z.infer<typeof createProductSchema>;
export type UpdateProductSchema = z.infer<typeof updateProductSchema>;
