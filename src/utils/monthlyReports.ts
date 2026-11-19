import type {
  Teacher,
  TeacherWithBlocks,
  Student,
  StudentAttendanceRecord,
  MonthRange,
  WeekRange,
  StudentMonthlySummary,
} from '../types';
import { formatDate, getMonthDays, isTeachingDay } from './schedule';
import { getWeekRange } from './weeklyReports';

export const MONTH_NAMES = [
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
 * Computes MonthRange information for the month containing referenceDate.
 */
export function getMonthRange(referenceDate: Date = new Date()): MonthRange {
  const year = referenceDate.getFullYear();
  const monthIndex = referenceDate.getMonth(); // 0 - 11
  const month = monthIndex + 1; // 1 - 12

  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);

  const monthDays = getMonthDays(year, month);
  // Class days: Monday (1) to Friday (5)
  const classDays = monthDays.filter((d) => d.getDay() >= 1 && d.getDay() <= 5);

  // Determine all weeks that intersect class days of this month
  const weekMap = new Map<number, WeekRange>();
  for (const day of classDays) {
    const w = getWeekRange(day);
    if (!weekMap.has(w.weekNumber)) {
      weekMap.set(w.weekNumber, w);
    }
  }

  // Sort weeks by starting date
  const weeks = Array.from(weekMap.values()).sort(
    (a, b) => a.start.getTime() - b.start.getTime()
  );

  const label = `${MONTH_NAMES[monthIndex]} ${year}`;
  const shortLabel = `${MONTH_NAMES[monthIndex].slice(0, 3)} ${year}`;

  return {
    year,
    month,
    monthIndex,
    label,
    shortLabel,
    startDate: formatDate(firstDay),
    endDate: formatDate(lastDay),
    monthDays,
    classDays,
    weeks,
  };
}

/**
 * Returns available MonthRange objects around referenceDate (default 6 months back, 2 future).
 */
export function getAvailableMonths(
  referenceDate: Date = new Date(),
  pastMonthsCount = 6,
  futureMonthsCount = 2
): MonthRange[] {
  const months: MonthRange[] = [];
  const year = referenceDate.getFullYear();
  const currentMonthIdx = referenceDate.getMonth();

  for (let i = -pastMonthsCount; i <= futureMonthsCount; i++) {
    const d = new Date(year, currentMonthIdx + i, 1);
    months.push(getMonthRange(d));
  }

  return months;
}

/**
 * Returns all dates (YYYY-MM-DD) on which a teacher has scheduled classes during a month.
 */
export function getTeachingDatesForTeacherInMonth(
  teacher: Teacher,
  monthRange: MonthRange
): string[] {
  return monthRange.classDays
    .filter((day) => isTeachingDay(teacher, day))
    .map((day) => formatDate(day));
}

export interface MonthlyReconcileOptions {
  teacher: TeacherWithBlocks;
  students: Student[];
  monthRange: MonthRange;
  existingRecords: StudentAttendanceRecord[];
}

/**
 * Reconciles student attendance for a teacher over an entire month.
 * Any scheduled class date on or before today without an explicit record
 * is automatically assigned status 'ausente' (isAutomatic: true).
 * Future class dates that have not yet occurred are not penalized.
 */
export function reconcileStudentAttendanceForMonth({
  teacher,
  students,
  monthRange,
  existingRecords,
}: MonthlyReconcileOptions): StudentAttendanceRecord[] {
  const teacherStudents = students.filter((s) => s.teacherId === teacher.id);
  const teachingDates = getTeachingDatesForTeacherInMonth(teacher, monthRange);
  const todayStr = formatDate(new Date());
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
        // Find explicit record if already exists
        const existing = existingRecords.find(
          (r) =>
            r.studentId === student.id &&
            r.teacherId === teacher.id &&
            r.classDate === classDate &&
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
          // If class date has passed or is today, auto-assign absence
          if (classDate <= todayStr) {
            reconciled.push({
              id: `auto-month-${student.id}-${classDate}-${blockId || 'continuous'}`,
              studentId: student.id,
              teacherId: teacher.id,
              blockId,
              classDate,
              status: 'ausente',
              notes: 'Ausente (Automático al cierre mensual)',
              isAutomatic: true,
              createdAt: new Date().toISOString(),
            });
          }
          // Note: dates strictly in the future with no record are not counted as past absences
        }
      }
    }
  }

  return reconciled;
}

/**
 * Reconciles student attendance across ALL teachers for a given month.
 */
export function reconcileAllTeachersStudentAttendanceForMonth({
  teachers,
  students,
  monthRange,
  existingRecords,
}: {
  teachers: TeacherWithBlocks[];
  students: Student[];
  monthRange: MonthRange;
  existingRecords: StudentAttendanceRecord[];
}): StudentAttendanceRecord[] {
  const allReconciled: StudentAttendanceRecord[] = [];
  for (const teacher of teachers) {
    const list = reconcileStudentAttendanceForMonth({
      teacher,
      students,
      monthRange,
      existingRecords,
    });
    allReconciled.push(...list);
  }
  return allReconciled;
}

/**
 * Calculates monthly student attendance summaries, including weekly performance breakdown.
 */
export function calculateStudentMonthlySummaries({
  teacher,
  students,
  monthRange,
  reconciledRecords,
}: {
  teacher: TeacherWithBlocks;
  students: Student[];
  monthRange: MonthRange;
  reconciledRecords: StudentAttendanceRecord[];
}): StudentMonthlySummary[] {
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

    // Compute weekly breakdown across the weeks of the month
    const weeklyBreakdown = monthRange.weeks.map((week, idx) => {
      const weekDates = new Set(week.weekDays.map((d) => d.dateStr));
      const weekRecords = studentRecords.filter((r) => weekDates.has(r.classDate));

      let wPres = 0;
      let wAus = 0;
      let wJust = 0;
      for (const wr of weekRecords) {
        if (wr.status === 'presente') wPres++;
        else if (wr.status === 'ausente') wAus++;
        else if (wr.status === 'justificado') wJust++;
      }

      const wTotal = weekRecords.length;
      const wRate = wTotal > 0 ? Math.round((wPres / wTotal) * 100) : 0;

      return {
        weekNumber: idx + 1,
        weekLabel: `Semana ${idx + 1}`,
        total: wTotal,
        presentes: wPres,
        ausentes: wAus,
        justificados: wJust,
        rate: wRate,
      };
    });

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
      weeklyBreakdown,
    };
  });
}
