import { CustomerBookings } from "@/features/customer/CustomerBookings";
import { PanicButton } from "@/features/safety/PanicButton";

export default function CustomerBookingsPage() {
  return (
    <>
      <CustomerBookings />
      <PanicButton contextLabel="My bookings" />
    </>
  );
}
