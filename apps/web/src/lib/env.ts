export type DataSource = "local" | "http";

const DEFAULT_DEVELOPMENT_CHEFMATE_API_URL = "http://localhost:3001";

type ChefmateApiEnv = {
  readonly NEXT_PUBLIC_CHEFMATE_API_URL?: string;
  readonly NEXT_PUBLIC_MEALS_API_URL?: string;
  readonly NODE_ENV?: string;
};

export function getMealsDataSource(): DataSource {
  const raw = process.env.NEXT_PUBLIC_MEALS_DATA_SOURCE;
  return raw === "http" ? "http" : "local";
}

export function getChefmateApiUrl(): string {
  return resolveChefmateApiUrl(getPublicChefmateApiEnv());
}

export function resolveChefmateApiUrl(env: ChefmateApiEnv): string {
  const configured = env.NEXT_PUBLIC_CHEFMATE_API_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_CHEFMATE_API_URL must be configured in production.");
  }
  return DEFAULT_DEVELOPMENT_CHEFMATE_API_URL;
}

export function getCatalogApiUrl(): string {
  return resolveCatalogApiUrl(getPublicChefmateApiEnv());
}

function getPublicChefmateApiEnv(): ChefmateApiEnv {
  // Direct references let Next inject public environment values into browser bundles.
  return {
    NEXT_PUBLIC_CHEFMATE_API_URL: process.env.NEXT_PUBLIC_CHEFMATE_API_URL,
    NEXT_PUBLIC_MEALS_API_URL: process.env.NEXT_PUBLIC_MEALS_API_URL,
    NODE_ENV: process.env.NODE_ENV,
  };
}

export function resolveCatalogApiUrl(env: ChefmateApiEnv): string {
  const configured = (env.NEXT_PUBLIC_MEALS_API_URL ?? env.NEXT_PUBLIC_CHEFMATE_API_URL)?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_MEALS_API_URL or NEXT_PUBLIC_CHEFMATE_API_URL must be configured in production.",
    );
  }
  return DEFAULT_DEVELOPMENT_CHEFMATE_API_URL;
}
