import { faker } from "@faker-js/faker";
import {
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  CheckCircle2,
  CircleHelp,
  CircleIcon,
  CircleX,
  Timer,
} from "lucide-react";
import { customAlphabet } from "nanoid";
import { type Task, tasks, type Product, products } from "@/server/db/schema/demo/schema";

export function generateRandomTask(): Task {
  return {
    id: faker.number.int(),
    code: `TASK-${customAlphabet("0123456789", 4)()}`,
    title: faker.hacker
      .phrase()
      .replace(/^./, (letter) => letter.toUpperCase()),
    estimatedHours: faker.number.int({ min: 1, max: 24 }),
    status: faker.helpers.shuffle(tasks.status.enumValues)[0] ?? "todo",
    label: faker.helpers.shuffle(tasks.label.enumValues)[0] ?? "bug",
    priority: faker.helpers.shuffle(tasks.priority.enumValues)[0] ?? "low",
    archived: faker.datatype.boolean({ probability: 0.2 }),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function generateRandomProduct(): Product {
  return {
    id: faker.number.int(),
    sku: `SKU-${customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 8)()}`,
    name: faker.commerce.productName(),
    category: faker.helpers.shuffle(products.category.enumValues)[0] ?? "electronics",
    status: faker.helpers.shuffle(products.status.enumValues)[0] ?? "active",
    price: parseFloat(faker.commerce.price({ min: 10, max: 1000 })),
    stock: faker.number.int({ min: 0, max: 100 }),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function getStatusIcon(status: Task["status"]) {
  const statusIcons = {
    canceled: CircleX,
    done: CheckCircle2,
    "in-progress": Timer,
    todo: CircleHelp,
  };

  return statusIcons[status] || CircleIcon;
}

export function getPriorityIcon(priority: Task["priority"]) {
  const priorityIcons = {
    high: ArrowUpIcon,
    low: ArrowDownIcon,
    medium: ArrowRightIcon,
  };

  return priorityIcons[priority] || CircleIcon;
}
