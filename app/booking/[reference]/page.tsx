import BookingStatus from "./status";

export default async function BookingPage({ params }: { params: Promise<{ reference: string }> }) {
  return <main className="page"><BookingStatus reference={(await params).reference} /></main>;
}
