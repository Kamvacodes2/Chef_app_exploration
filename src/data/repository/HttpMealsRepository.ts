import type { Category, Meal } from "@/data/types/Meal";
import type { MealsRepository } from "./MealsRepository";

/**
 * Stub HTTP-backed repository for a future API swap. Not wired up yet —
 * throws until a real endpoint contract is defined.
 */
export class HttpMealsRepository implements MealsRepository {
  constructor(private readonly baseUrl: string) {}

  async getCategories(): Promise<readonly Category[]> {
    throw new Error(`HttpMealsRepository.getCategories not implemented (baseUrl: ${this.baseUrl})`);
  }

  async findAll(): Promise<readonly Meal[]> {
    throw new Error(`HttpMealsRepository.findAll not implemented (baseUrl: ${this.baseUrl})`);
  }

  async findByCategory(): Promise<readonly Meal[]> {
    throw new Error("HttpMealsRepository.findByCategory not implemented");
  }

  async findById(): Promise<Meal | undefined> {
    throw new Error("HttpMealsRepository.findById not implemented");
  }
}
