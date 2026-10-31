import { connection } from "next/server";
import { calendarToday } from "@/lib/contact-tracking";

export async function requestCalendarToday() {
  await connection();
  return calendarToday();
}
