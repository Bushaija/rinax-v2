import { db } from "@/db/index";
import { type Task, tasks, type Product, products } from "@/server/db/schema/demo/schema";

import { generateRandomTask, generateRandomProduct } from "./utils";

export async function seedTasks(input: { count: number }) {
  const count = input.count ?? 100;

  try {
    const allTasks: Task[] = [];

    for (let i = 0; i < count; i++) {
      allTasks.push(generateRandomTask());
    }

    await db.delete(tasks);

    console.log("📝 Inserting tasks", allTasks.length);

    await db.insert(tasks).values(allTasks).onConflictDoNothing();
  } catch (err) {
    console.error(err);
  }
}

export async function seedProducts(input: { count: number }) {
  const count = input.count ?? 100;

  try {
    const allProducts: Product[] = [];

    for (let i = 0; i < count; i++) {
      allProducts.push(generateRandomProduct());
    }

    await db.delete(products);

    console.log("🛍️ Inserting products", allProducts.length);

    await db.insert(products).values(allProducts).onConflictDoNothing();
  } catch (err) {
    console.error(err);
  }
}
