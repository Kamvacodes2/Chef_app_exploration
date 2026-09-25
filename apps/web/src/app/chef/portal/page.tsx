import { ChefOverview } from "@/features/platform/ChefOverview";
import { PanicButton } from "@/features/safety/PanicButton";

export default function ChefPortalPage() {
  return (
    <>
      <ChefOverview />
      <PanicButton contextLabel="Chef portal" />
    </>
  );
}
