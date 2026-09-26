import BookingForm from "./booking-form";

export default function BookPage() {
  return (
    <main className="page">
      <div className="page-heading">
        <div className="eyebrow">Reserve your session</div>
        <h1>Book the table</h1>
        <p>Pick a date and consecutive hours. We’ll hold your time while the venue confirms.</p>
      </div>
      <BookingForm />
    </main>
  );
}
