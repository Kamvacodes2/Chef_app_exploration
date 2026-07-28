import { SurveyPage } from "@/features/survey/SurveyPage";

interface SurveyRoutePageProps {
  readonly params: Promise<{ token: string }>;
  readonly searchParams: Promise<{ field?: string | string[]; rating?: string | string[] }>;
}

function singleValue(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export default async function SurveyRoutePage({ params, searchParams }: SurveyRoutePageProps) {
  const [routeParams, query] = await Promise.all([params, searchParams]);
  return (
    <SurveyPage
      token={routeParams.token}
      initialField={singleValue(query.field)}
      initialRating={singleValue(query.rating)}
    />
  );
}
