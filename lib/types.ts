export type BookingStatus =
  | "PENDING_APPROVAL"
  | "AWAITING_PAYMENT"
  | "PAYMENT_REVIEW"
  | "CONFIRMED"
  | "REJECTED"
  | "CANCELLED"
  | "EXPIRED";

export type Slot = {
  start: string;
  end: string;
  status: "available" | "pending" | "booked" | "blocked" | "past";
};

export type PublicBooking = {
  booking_reference: string;
  customer_name: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  hourly_rate: number;
  total_amount: number;
  status: BookingStatus;
  payment_due_at?: string | null;
  payment_rejection_reason?: string | null;
  settings: {
    venue_name: string;
    qris_image_url: string | null;
    qris_account_name: string | null;
    payment_instructions: string | null;
    whatsapp_number: string | null;
  };
};
