import { SiteHeader } from "@/components/SiteHeader";
import { ChefMagicLoginPage } from "@/features/platform/ChefMagicLoginPage";

interface PageProps {
  readonly searchParams: Promise<{ readonly token?: string | string[] }>;
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const token = Array.isArray(params.token) ? (params.token[0] ?? null) : (params.token ?? null);

  return (
    <>
      <SiteHeader />
      <ChefMagicLoginPage token={token} />
    </>
  );
}
