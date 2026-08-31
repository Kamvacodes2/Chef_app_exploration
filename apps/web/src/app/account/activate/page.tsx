import { SiteHeader } from "@/components/SiteHeader";
import { CustomerActivationPage } from "@/features/auth/CustomerActivationPage";

interface PageProps {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const rawToken = params.token;
  const token = typeof rawToken === "string" ? rawToken : null;

  return (
    <>
      <SiteHeader />
      <CustomerActivationPage token={token} />
    </>
  );
}
