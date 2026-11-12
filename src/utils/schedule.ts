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
 * Formats a Date as YYYY-MM-DD.
 */
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
