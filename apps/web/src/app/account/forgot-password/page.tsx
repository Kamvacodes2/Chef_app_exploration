import { SiteHeader } from "@/components/SiteHeader";
import { ForgotPasswordPage } from "@/features/auth/ForgotPasswordPage";

export default function ForgotPasswordRoute() {
  return (
    <>
      <SiteHeader />
      <ForgotPasswordPage />
    </>
  );
}
