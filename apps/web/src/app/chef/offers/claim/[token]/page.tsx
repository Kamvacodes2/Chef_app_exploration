import { SiteHeader } from "@/components/SiteHeader";
import { OfferClaimPage } from "@/features/platform/OfferClaimPage";

interface PageProps {
  readonly params: Promise<{ token: string }>;
}

export default async function Page({ params }: PageProps) {
  const { token } = await params;
  return (
    <>
      <SiteHeader variant="chefPortal" />
      <OfferClaimPage token={token} />
    </>
  );
}
