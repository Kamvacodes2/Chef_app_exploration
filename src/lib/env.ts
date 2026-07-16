export type DataSource = "local" | "http";

export function getMealsDataSource(): DataSource {
  const raw = process.env.NEXT_PUBLIC_MEALS_DATA_SOURCE;
  return raw === "http" ? "http" : "local";
}
