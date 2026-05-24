// Weekly business-hours helpers.
// Hours are stored as JSON on businesses.hours with this shape:
// {
//   mon: { open: "09:00", close: "17:00" } | null, // null = closed
//   tue: { ... }, wed, thu, fri, sat, sun,
//   tz: "America/Toronto"   // optional, defaults to America/Toronto
// }

export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export type DayHours = { open: string; close: string } | null;
export type BusinessHours = Partial<Record<DayKey, DayHours>> & { tz?: string };

export const DAY_KEYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
export const DAY_LABELS: Record<DayKey, string> = {
  mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday",
  fri: "Friday", sat: "Saturday", sun: "Sunday",
};
export const DAY_SHORT: Record<DayKey, string> = {
  mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun",
};

const JS_DAY_TO_KEY: Record<number, DayKey> = {
  0: "sun", 1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri", 6: "sat",
};

const PROVINCE_TZ: Record<string, string> = {
  BC: "America/Vancouver", AB: "America/Edmonton", SK: "America/Regina",
  MB: "America/Winnipeg", ON: "America/Toronto", QC: "America/Toronto",
  NB: "America/Halifax", NS: "America/Halifax", PE: "America/Halifax",
  NL: "America/St_Johns", YT: "America/Whitehorse",
  NT: "America/Yellowknife", NU: "America/Iqaluit",
};

export function tzForProvince(province?: string | null): string {
  if (province && PROVINCE_TZ[province]) return PROVINCE_TZ[province];
  return "America/Toronto";
}

export function emptyHours(province?: string | null): BusinessHours {
  const h: BusinessHours = { tz: tzForProvince(province) };
  for (const d of DAY_KEYS) h[d] = null;
  return h;
}

function nowInTz(tz: string): { day: DayKey; minutes: number } {
  // Use Intl to read components in the given timezone.
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const map: Record<string, DayKey> = {
    Sun: "sun", Mon: "mon", Tue: "tue", Wed: "wed", Thu: "thu", Fri: "fri", Sat: "sat",
  };
  return { day: map[wd] ?? "mon", minutes: hour * 60 + minute };
}

function toMin(t: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
  if (!m) return null;
  const h = Number(m[1]); const mi = Number(m[2]);
  if (h < 0 || h > 24 || mi < 0 || mi > 59) return null;
  return h * 60 + mi;
}

export function formatTime12(t: string): string {
  const m = toMin(t);
  if (m == null) return t;
  let h = Math.floor(m / 60); const mi = m % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12; if (h === 0) h = 12;
  return mi === 0 ? `${h} ${ampm}` : `${h}:${mi.toString().padStart(2, "0")} ${ampm}`;
}

export type OpenStatus = {
  open: boolean;
  label: string; // "Open now" or "Closed"
  detail: string; // "Closes at 9 PM" / "Opens at 8 AM" / "Opens Mon at 9 AM"
};

export function getOpenStatus(hours: BusinessHours | null | undefined, province?: string | null): OpenStatus | null {
  if (!hours) return null;
  const tz = hours.tz || tzForProvince(province);
  const { day, minutes } = nowInTz(tz);
  const today = hours[day];
  if (today && today.open && today.close) {
    const o = toMin(today.open); const c = toMin(today.close);
    if (o != null && c != null) {
      // Handle overnight (close <= open means close next day, e.g. 22:00 -> 02:00)
      const isOpen = c > o ? (minutes >= o && minutes < c) : (minutes >= o || minutes < c);
      if (isOpen) {
        const closeStr = formatTime12(today.close);
        return { open: true, label: "Open now", detail: `Closes at ${closeStr}` };
      }
      if (minutes < o) {
        return { open: false, label: "Closed", detail: `Opens at ${formatTime12(today.open)}` };
      }
    }
  }
  // Find next open day within the next 7 days
  const order: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const startIdx = order.indexOf(day);
  for (let i = 1; i <= 7; i++) {
    const nd = order[(startIdx + i) % 7];
    const dh = hours[nd];
    if (dh && dh.open) {
      const lbl = i === 1 ? "tomorrow" : DAY_SHORT[nd];
      return { open: false, label: "Closed", detail: `Opens ${lbl} at ${formatTime12(dh.open)}` };
    }
  }
  return { open: false, label: "Closed", detail: "Hours not posted" };
}

export function isValidHours(h: unknown): h is BusinessHours {
  if (!h || typeof h !== "object") return false;
  const o = h as Record<string, unknown>;
  for (const d of DAY_KEYS) {
    const v = o[d];
    if (v == null) continue;
    if (typeof v !== "object") return false;
    const vv = v as Record<string, unknown>;
    if (typeof vv.open !== "string" || typeof vv.close !== "string") return false;
    if (toMin(vv.open) == null || toMin(vv.close) == null) return false;
  }
  return true;
}
