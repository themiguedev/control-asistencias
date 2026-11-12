import type {
  Teacher,
  TeacherWithBlocks,
  Student,
  StudentAttendanceRecord,
  DayOfWeek,
  WeekRange,
  StudentAttendanceSummary,
} from '../types';
import { formatDate, getDayName } from './schedule';

/**
 * Returns Monday at 00:00:00 of the week containing the given date.
 */
export function getMondayOfWeek(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Calculates standard ISO week number for a date.
 */
export function getISOWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Nombres de los meses en español
 */
const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

/**
 * Computes the full WeekRange object for the week containing referenceDate.
 * Class days considered are Monday through Friday (5 teaching days).
 */
export function getWeekRange(referenceDate: Date = new Date()): WeekRange {
  const monday = getMondayOfWeek(referenceDate);

  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  friday.setHours(23, 59, 59, 999);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const weekNumber = getISOWeekNumber(monday);
  const year = monday.getFullYear();

  // Calcular el mes predominante (usando el jueves de la semana) y la semana del mes (1 a 4)
  const midWeek = new Date(monday);
  midWeek.setDate(monday.getDate() + 3); // Jueves
  const monthName = MONTH_NAMES[midWeek.getMonth()];
  const weekOfMonth = Math.min(4, Math.max(1, Math.ceil(midWeek.getDate() / 7)));

  const weekDays = [0, 1, 2, 3, 4].map((offset) => {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + offset);
    return {
      date: cur,
      dateStr: formatDate(cur),
      dayName: getDayName(cur) as DayOfWeek,
    };
  });

  const startFormatted = `${String(monday.getDate()).padStart(2, '0')}/${String(
    monday.getMonth() + 1
  ).padStart(2, '0')}`;
  const endFormatted = `${String(friday.getDate()).padStart(2, '0')}/${String(
    friday.getMonth() + 1
  ).padStart(2, '0')}/${friday.getFullYear()}`;
  const label = `${monthName} - Semana ${weekOfMonth} (${startFormatted} - ${endFormatted})`;

  return {
    startDate: formatDate(monday),
    endDate: formatDate(friday),
    fridayDate: formatDate(friday),
    sundayDate: formatDate(sunday),
    start: monday,
    end: sunday,
    weekNumber,
    year,
    label,
    weekDays,
  };
}

/**
 * Returns an array of WeekRange objects around a given date (default 8 weeks back).
 */
export function getAvailableWeeks(
  referenceDate: Date = new Date(),
  pastWeeksCount = 6,
  futureWeeksCount = 2
): WeekRange[] {
  const currentMonday = getMondayOfWeek(referenceDate);
  const weeks: WeekRange[] = [];

  for (let i = -pastWeeksCount; i <= futureWeeksCount; i++) {
    const d = new Date(currentMonday);
    d.setDate(currentMonday.getDate() + i * 7);
    weeks.push(getWeekRange(d));
  }

  return weeks;
}

/**
 * Gets all dates (YYYY-MM-DD) on which a teacher has scheduled classes during a given week.
 */
export function getTeachingDatesForTeacherInWeek(
  teacher: Teacher,
  weekRange: WeekRange
): string[] {
  return weekRange.weekDays
    .filter((day) => teacher.scheduleDays.includes(day.dayName))
    .map((day) => day.dateStr);
}

export interface ReconcileOptions {
  teacher: TeacherWithBlocks;
  students: Student[];
  weekRange: WeekRange;
  existingRecords: StudentAttendanceRecord[];
}

/**
 * CRITICAL BUSINESS RULE:
 * Reconciles student attendance for a teacher in a given week.
 * Any student enrolled with the teacher whose attendance was NOT explicitly registered
 * on a scheduled teaching day is AUTOMATICALLY assigned status 'ausente' (isAutomatic: true).
 */
export function reconcileStudentAttendance({
  teacher,
  students,
  weekRange,
  existingRecords,
}: ReconcileOptions): StudentAttendanceRecord[] {
  const teacherStudents = students.filter((s) => s.teacherId === teacher.id);
  const teachingDates = getTeachingDatesForTeacherInWeek(teacher, weekRange);
  const reconciled: StudentAttendanceRecord[] = [];

  for (const student of teacherStudents) {
    // Determine applicable blocks for this student
    const blocksToCheck: (string | null)[] =
      teacher.blockType === 'split'
        ? student.blockId
          ? [student.blockId]
          : teacher.blocks.map((b) => b.id)
        : [teacher.blocks[0]?.id || null];

    for (const classDate of teachingDates) {
      for (const blockId of blocksToCheck) {
        // Find explicit record if already exists (matching student, teacher, and date)
        const existing = existingRecords.find(
          (r) =>
            r.studentId === student.id &&
            r.teacherId === teacher.id &&
            r.classDate === classDate &&
            // Match blockId or allow fallback when teacher is continuous / null
            (r.blockId === blockId ||
              !r.blockId ||
              !blockId ||
              teacher.blockType === 'continuous')
        );

        if (existing) {
          reconciled.push({
            ...existing,
            isAutomatic: existing.isAutomatic || false,
          });
        } else {
          // Automatic absence assignment
          reconciled.push({
            id: `auto-${student.id}-${classDate}-${blockId || 'continuous'}`,
            studentId: student.id,
            teacherId: teacher.id,
            blockId,
            classDate,
            status: 'ausente',
            notes: 'Ausente (Automático al cierre de semana)',
            isAutomatic: true,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }
  }

  return reconciled;
}

/**
 * Reconciles student attendance across ALL teachers for a given week.
 */
export function reconcileAllTeachersStudentAttendance({
  teachers,
  students,
  weekRange,
  existingRecords,
}: {
  teachers: TeacherWithBlocks[];
  students: Student[];
  weekRange: WeekRange;
  existingRecords: StudentAttendanceRecord[];
}): StudentAttendanceRecord[] {
  const allReconciled: StudentAttendanceRecord[] = [];
  for (const teacher of teachers) {
    const list = reconcileStudentAttendance({
      teacher,
      students,
      weekRange,
      existingRecords,
    });
    allReconciled.push(...list);
  }
  return allReconciled;
}

/**
 * Calculates student attendance summaries and percentages for a teacher in a given week.
 */
export function calculateStudentWeeklySummaries({
  teacher,
  students,
  weekRange: _weekRange,
  reconciledRecords,
}: {
  teacher: TeacherWithBlocks;
  students: Student[];
  weekRange: WeekRange;
  reconciledRecords: StudentAttendanceRecord[];
}): StudentAttendanceSummary[] {
  const teacherStudents = students.filter((s) => s.teacherId === teacher.id);

  return teacherStudents.map((student) => {
    const studentRecords = reconciledRecords.filter(
      (r) => r.studentId === student.id && r.teacherId === teacher.id
    );

    const recordsByDate: Record<string, StudentAttendanceRecord> = {};
    let presentes = 0;
    let ausentes = 0;
    let justificados = 0;

    for (const rec of studentRecords) {
      recordsByDate[rec.classDate] = rec;
      if (rec.status === 'presente') presentes++;
      else if (rec.status === 'ausente') ausentes++;
      else if (rec.status === 'justificado') justificados++;
    }

    const totalClasses = studentRecords.length;
    const attendanceRate =
      totalClasses > 0 ? Math.round((presentes / totalClasses) * 100) : 0;
    const blockObj = teacher.blocks.find((b) => b.id === student.blockId);

    return {
      student,
      teacher,
      teamName: student.teamName || 'Sin Equipo',
      blockLabel: blockObj ? blockObj.label : undefined,
      totalClasses,
      presentes,
      ausentes,
      justificados,
      attendanceRate,
      recordsByDate,
    };
  });
}
