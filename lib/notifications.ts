import { rupiah, shortTime } from "@/lib/booking";

type BookingNotification = {
  id: number;
  booking_reference: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  total_amount: number;
  customers: { name: string; phone: string } | { name: string; phone: string }[] | null;
};

function customerFrom(booking: BookingNotification) {
  return Array.isArray(booking.customers) ? booking.customers[0] : booking.customers;
}

function siteUrlFrom(request: Request) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (configured) return configured.startsWith("http") ? configured : `https://${configured}`;
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "https";
  return host ? `${proto}://${host}` : "";
}

async function sendTelegramMessage(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`Telegram notification failed: ${response.status} ${message}`);
  }
}

function bookingLines(booking: BookingNotification, request: Request) {
  const customer = customerFrom(booking);
  const adminUrl = `${siteUrlFrom(request)}/admin/bookings/${booking.id}`;
  const whatsappUrl = customer?.phone ? `https://wa.me/${customer.phone}` : "";
  return [
    `Reference: ${booking.booking_reference}`,
    `Customer: ${customer?.name ?? "Unknown"}`,
    `WhatsApp: ${customer?.phone ?? "-"}`,
    `Date: ${booking.booking_date}`,
    `Time: ${shortTime(booking.start_time)} - ${shortTime(booking.end_time)}`,
    `Duration: ${booking.duration_minutes / 60} hours`,
    `Total: ${rupiah(booking.total_amount)}`,
    "",
    adminUrl ? `Admin: ${adminUrl}` : "",
    whatsappUrl ? `WhatsApp: ${whatsappUrl}` : "",
  ].filter(Boolean);
}

export async function notifyBookingCreated(booking: BookingNotification, request: Request) {
  await sendTelegramMessage(["New mahjong booking", "", ...bookingLines(booking, request)].join("\n"));
}

export async function notifyPaymentSubmitted(booking: BookingNotification, request: Request) {
  await sendTelegramMessage(["Payment proof uploaded", "", ...bookingLines(booking, request)].join("\n"));
}
