import { LandingPage } from "@/features/landing/LandingPage";
import { WhatsAppChatButton } from "@/features/landing/WhatsAppChatButton";
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
