import { BookingHistory } from "@/components/booking-history";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BookingHistory id={id} />;
}
