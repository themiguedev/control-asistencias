import type { DayOfWeek, Teacher, TeacherWithBlocks } from '../types';

const DAY_NAMES: DayOfWeek[] = [
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
];

/**
 * Returns the Spanish day name for a given Date.
 * Throws if the date falls on a weekend (sábado / domingo).
 */
export function getDayName(date: Date): DayOfWeek {
  // Date.getDay(): 0 = Sunday … 6 = Saturday
  const jsDay = date.getDay();
  if (jsDay === 0 || jsDay === 6) {
    throw new Error('El día cae en fin de semana');
  }
  // Monday = 1 → index 0, …, Friday = 5 → index 4
  return DAY_NAMES[jsDay - 1];
}

/**
 * Checks whether a teacher has a scheduled class on the given date.
 */
export function isTeachingDay(teacher: Teacher, date: Date): boolean {
  const jsDay = date.getDay();
  if (jsDay === 0 || jsDay === 6) return false;
  const dayName = DAY_NAMES[jsDay - 1];
  return teacher.scheduleDays.includes(dayName);
}

/**
 * Filters the teachers list to only those who have class on `date`.
 */
export function getTeachersForDay(
  teachers: TeacherWithBlocks[],
  date: Date,
): TeacherWithBlocks[] {
  return teachers.filter((t) => isTeachingDay(t, date));
}

/**
 * Formats a 24-hour time string (e.g. "16:00" or "09:30") to 12-hour format with am/pm (e.g. "4:00 pm").
 */
export function formatTime12h(timeStr: string): string {
  if (!timeStr || !timeStr.includes(':')) return timeStr;
  const [hoursStr, minutesStr] = timeStr.split(':');
  const hours = parseInt(hoursStr, 10);
  if (isNaN(hours)) return timeStr;
  const period = hours >= 12 ? 'pm' : 'am';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutesStr} ${period}`;
}

/**
 * Formats a start and end time range in 12-hour format (e.g. "4:00 pm - 6:00 pm").
 */
export function formatTimeRange12h(startTime: string, endTime: string): string {
  return `${formatTime12h(startTime)} - ${formatTime12h(endTime)}`;
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns an array with every Date in the given month (1-indexed).
 */
export function getMonthDays(year: number, month: number): Date[] {
  const days: Date[] = [];
  // month is 1-indexed; Date constructor expects 0-indexed month
  const totalDays = new Date(year, month, 0).getDate();
  for (let d = 1; d <= totalDays; d++) {
    days.push(new Date(year, month - 1, d));
  }
  return days;
}


// Re-export weekly report & reconciliation utilities
export {
  getMondayOfWeek,
  getISOWeekNumber,
  getWeekRange,
  getAvailableWeeks,
  getTeachingDatesForTeacherInWeek,
  reconcileStudentAttendance,
  reconcileAllTeachersStudentAttendance,
  calculateStudentWeeklySummaries,
} from './weeklyReports';
