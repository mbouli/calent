// Date + timezone helpers — ported verbatim from /calendar/app/lib/dateUtils.ts.
// Pure TS (Intl only), works under Hermes with full ICU.

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function zonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '0';
  const hour = get('hour');
  return {
    year: +get('year'),
    month: +get('month'),
    day: +get('day'),
    hour: hour === '24' ? 0 : +hour, // some engines emit "24" for midnight
    minute: +get('minute'),
    second: +get('second'),
  };
}

// Absolute instant → a Date whose LOCAL fields show its wall-clock in `timeZone`.
export function toZoned(date: Date, timeZone: string): Date {
  const p = zonedParts(date, timeZone);
  return new Date(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
}

// Inverse of toZoned.
export function fromZoned(local: Date, timeZone: string): Date {
  const asIfUTC = Date.UTC(
    local.getFullYear(),
    local.getMonth(),
    local.getDate(),
    local.getHours(),
    local.getMinutes(),
    local.getSeconds(),
  );
  const p = zonedParts(new Date(asIfUTC), timeZone);
  const tzAsUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const offset = tzAsUTC - asIfUTC;
  return new Date(asIfUTC - offset);
}

export function startOfWeek(date: Date, weekStartsOnMonday = true): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = weekStartsOnMonday ? (day === 0 ? -6 : 1 - day) : -day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getWeekDays(startDate: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    return d;
  });
}

export function formatMonthYear(date: Date, locale = 'en-US'): string {
  return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

export function weekdayLabels(
  locale = 'en-US',
  weekStartsOnMonday = true,
  format: 'short' | 'narrow' | 'long' = 'short',
): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: format });
  const mondayFirst = Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2024, 0, 1 + i)));
  return orderWeekdays(mondayFirst, weekStartsOnMonday);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function minutesFromMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function dateAtMinutes(base: Date, minutes: number): Date {
  const d = new Date(base);
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function getMonthGrid(date: Date, weekStartsOnMonday = true): (Date | null)[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const dow = firstDay.getDay();
  const offset = weekStartsOnMonday ? (dow === 0 ? 6 : dow - 1) : dow;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function formatTime(date: Date, hour12 = false): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12,
  });
}

export function formatHourLabel(hour: number, hour12 = false): string {
  if (!hour12) return `${String(hour).padStart(2, '0')}:00`;
  const period = hour < 12 ? 'AM' : 'PM';
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${period}`;
}

export function orderWeekdays<T>(mondayFirst: T[], weekStartsOnMonday = true): T[] {
  return weekStartsOnMonday ? mondayFirst : [mondayFirst[6], ...mondayFirst.slice(0, 6)];
}
