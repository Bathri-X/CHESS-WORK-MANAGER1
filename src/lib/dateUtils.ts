import { WeekdayName } from '../types';

/**
 * Returns today's date in local YYYY-MM-DD string
 */
export function getTodayString(): string {
  const now = new Date();
  return formatDateToISO(now);
}

/**
 * Formats a Date object to local YYYY-MM-DD
 */
export function formatDateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a YYYY-MM-DD string into a local Date object
 */
export function parseISODate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

/**
 * Formats date into "Friday, 4 September 2026"
 */
export function formatFullHeaderDate(dateStr: string): string {
  const date = parseISODate(dateStr);
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const year = date.getFullYear();
  return `${weekday}, ${day} ${month} ${year}`;
}

/**
 * Formats date for the daily report: "04-09-2026 (Friday)"
 */
export function formatReportDate(dateStr: string): string {
  const date = parseISODate(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  return `${day}-${month}-${year} (${weekday})`;
}

/**
 * Returns the weekday name of a given YYYY-MM-DD string
 */
export function getWeekdayName(dateStr: string): WeekdayName {
  const date = parseISODate(dateStr);
  const dayIndex = date.getDay(); // 0 is Sunday, 1 is Monday ...
  const weekdays: WeekdayName[] = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  return weekdays[dayIndex];
}

/**
 * Add or subtract days from a YYYY-MM-DD string
 */
export function addDays(dateStr: string, days: number): string {
  const date = parseISODate(dateStr);
  date.setDate(date.getDate() + days);
  return formatDateToISO(date);
}

/**
 * Check if the given date string is today
 */
export function isToday(dateStr: string): boolean {
  return dateStr === getTodayString();
}

/**
 * Converts 24-hour HH:mm time string to 12-hour format e.g. "06:00 AM"
 */
export function to12Hour(time24: string): string {
  if (!time24) return '';
  const [hourStr, minStr] = time24.split(':');
  let hour = parseInt(hourStr, 10);
  const min = minStr || '00';
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${String(hour).padStart(2, '0')}:${min} ${ampm}`;
}

/**
 * Converts 12-hour format e.g. "06:00 AM" or "6:00 AM" to 24-hour "HH:mm" for input fields
 */
export function to24Hour(time12: string): string {
  if (!time12) return '06:00';
  const match = time12.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return '06:00';
  let hour = parseInt(match[1], 10);
  const min = match[2];
  const ampm = (match[3] || 'AM').toUpperCase();
  if (ampm === 'PM' && hour < 12) hour += 12;
  if (ampm === 'AM' && hour === 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${min}`;
}

/**
 * Calculates default end time based on start time and duration (60m or 30m)
 */
export function calculateEndTime(start24: string, durationMinutes: number = 60): string {
  const [h, m] = start24.split(':').map(Number);
  const date = new Date();
  date.setHours(h || 6, m || 0, 0, 0);
  date.setMinutes(date.getMinutes() + durationMinutes);
  const endHours = String(date.getHours()).padStart(2, '0');
  const endMinutes = String(date.getMinutes()).padStart(2, '0');
  return `${endHours}:${endMinutes}`;
}
