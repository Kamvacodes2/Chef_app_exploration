import { SiteHeader } from "@/components/SiteHeader";
import { ChefMagicLoginPage } from "@/features/platform/ChefMagicLoginPage";

interface PageProps {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const rawToken = params.token;
  const token = typeof rawToken === "string" ? rawToken : null;

  return (
    <>
      <SiteHeader variant="chefPortal" />
      <ChefMagicLoginPage token={token} />
    </>
  );
}
