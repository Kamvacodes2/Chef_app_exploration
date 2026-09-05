import { SiteHeader } from "@/components/SiteHeader";
import { ResetPasswordPage } from "@/features/auth/ResetPasswordPage";

interface PageProps {
  readonly params: Promise<{ token: string }>;
}

export default async function ResetPasswordRoute({ params }: PageProps) {
  const { token } = await params;
  return (
    <>
      <SiteHeader />
      <ResetPasswordPage token={token} />
    </>
  );
}
