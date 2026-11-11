export const CURRENT_STUDENT_ID = "S001";

export function formatSlot(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const hour = hours % 12 || 12;
  const period = hours >= 12 ? "pm" : "am";
  return `${hour}:${String(minutes).padStart(2, "0")} ${period}`;
}
