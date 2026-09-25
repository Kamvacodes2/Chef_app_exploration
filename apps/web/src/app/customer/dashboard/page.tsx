import { CustomerOverview } from "@/features/customer/CustomerOverview";
import { PanicButton } from "@/features/safety/PanicButton";

export default function CustomerDashboardPage() {
  return (
    <>
      <CustomerOverview />
      <PanicButton contextLabel="Customer portal" />
    </>
  );
}
