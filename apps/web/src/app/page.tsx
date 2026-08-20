import { LandingPage } from "@/features/landing/LandingPage";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <LandingPage />
      <SiteFooter />
    </>
  );
}
