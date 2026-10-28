import { BookingForm } from "@/components/booking-form";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ resource?: string }>;
}) {
  const { resource } = await searchParams;
  return <BookingForm resourceId={resource || ""} />;
}
