import { getMealsDataSource } from "@/lib/env";
import mealsJson from "../../../data/meals.json";
import { HttpMealsRepository } from "./HttpMealsRepository";
import { LocalMealsRepository } from "./LocalMealsRepository";
import type { MealsRepository } from "./MealsRepository";

/** Factory that selects the active MealsRepository implementation. */
export function createMealsRepository(): MealsRepository {
  const source = getMealsDataSource();
  if (source === "http") {
    return new HttpMealsRepository(process.env.NEXT_PUBLIC_MEALS_API_URL ?? "");
  }
  return new LocalMealsRepository(mealsJson);
}
