import * as XLSX from 'xlsx';
import type { TeacherWithBlocks, Student, StudentAttendanceRecord, WeekRange } from '../types';
import {
  reconcileAllTeachersStudentAttendance,
  calculateStudentWeeklySummaries,
} from './weeklyReports';

export interface ExportReportOptions {
  teachers: TeacherWithBlocks[];
  students: Student[];
  studentRecords: StudentAttendanceRecord[];
  weekRange: WeekRange;
  selectedTeacherId?: string; // If specified, highlights or filters for that teacher
}

/**
 * Helper to trigger browser download of an XLSX workbook
 */
export function saveWorkbook(wb: XLSX.WorkBook, filename: string): void {
  try {
    XLSX.writeFile(wb, filename);
  } catch (err) {
    console.warn('XLSX.writeFile failed, falling back to Blob download:', err);
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 150);
  }
}

/**
 * Returns formatted status label for Excel cells
 */
function formatStatusCell(rec?: StudentAttendanceRecord, isClassDay?: boolean): string {
  if (!isClassDay) return '—';
  if (!rec) return 'Ausente (Automático)';
  if (rec.status === 'presente') return 'Presente';
  if (rec.status === 'justificado') return 'Justificado';
  if (rec.status === 'ausente') {
    return rec.isAutomatic ? 'Ausente (Automático)' : 'Ausente';
  }
  return 'Ausente (Automático)';
}

/**
 * Format date for table headers (e.g. "02/11")
 */
function formatShortDate(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return dateStr;
}

/**
 * ============================================================================
 * SHEET 1 BUILDER: Asistencia de Alumnos por Equipo y por Profesor (Semanal)
 * ============================================================================
 */
export function buildTeamTeacherSheet(
  teachers: TeacherWithBlocks[],
  students: Student[],
  reconciledRecords: StudentAttendanceRecord[],
  weekRange: WeekRange,
  filterTeacherId?: string
): XLSX.WorkSheet {
  const targetTeachers = filterTeacherId && filterTeacherId !== 'all'
    ? teachers.filter((t) => t.id === filterTeacherId)
    : teachers;

  const rows: (string | number)[][] = [];

  // Header Titles
  rows.push(['SISTEMA DE ASISTENCIAS CBA - REPORTE DE ASISTENCIA']);
  rows.push(['REPORTE 1: ASISTENCIA DE ALUMNOS POR EQUIPO Y POR PROFESOR (SEMANAL)']);
  rows.push([
    'Período:',
    weekRange.label,
    'Desde:',
    weekRange.startDate,
    'Hasta:',
    weekRange.endDate,
    'Generado:',
    new Date().toLocaleDateString('es-ES', { hour: '2-digit', minute: '2-digit' }),
  ]);
  rows.push([
    '* Regla de Cierre: Los alumnos sin registro explícito en días de clase se computan como "Ausente (Automático)".',
  ]);
  rows.push([]); // Empty spacing row

  // Table Column Headers
  const colLunes = `Lunes (${formatShortDate(weekRange.weekDays[0].dateStr)})`;
  const colMartes = `Martes (${formatShortDate(weekRange.weekDays[1].dateStr)})`;
  const colMiercoles = `Miércoles (${formatShortDate(weekRange.weekDays[2].dateStr)})`;
  const colJueves = `Jueves (${formatShortDate(weekRange.weekDays[3].dateStr)})`;
  const colViernes = `Viernes (${formatShortDate(weekRange.weekDays[4].dateStr)})`;

  rows.push([
    'Profesor',
    'Equipo de Robótica',
    'Alumno',
    'Bloque / Horario',
    colLunes,
    colMartes,
    colMiercoles,
    colJueves,
    colViernes,
    'Clases Semanales',
    'Asistencias (Presentes)',
    'Inasistencias (Ausentes)',
    'Justificados',
    '% Asistencia',
    'Estado Semanal',
  ]);

  for (const teacher of targetTeachers) {
    const summaries = calculateStudentWeeklySummaries({
      teacher,
      students,
      weekRange,
      reconciledRecords,
    });

    // Group students by teamName, then sort by student name
    const sortedSummaries = [...summaries].sort((a, b) => {
      const teamCompare = a.teamName.localeCompare(b.teamName);
      if (teamCompare !== 0) return teamCompare;
      return a.student.fullName.localeCompare(b.student.fullName);
    });

    for (const item of sortedSummaries) {
      // Days evaluations
      const daysStatuses = weekRange.weekDays.map((day) => {
        const isClassDay = teacher.scheduleDays.includes(day.dayName);
        const rec = item.recordsByDate[day.dateStr];
        return formatStatusCell(rec, isClassDay);
      });

      let estadoSemanal = 'Excelente';
      if (item.attendanceRate < 50) {
        estadoSemanal = 'Crítico';
      } else if (item.attendanceRate < 80) {
        estadoSemanal = 'Regular';
      }

      rows.push([
        teacher.name,
        item.teamName,
        item.student.fullName,
        item.blockLabel || teacher.blocks[0]?.label || 'Clase Regular',
        daysStatuses[0],
        daysStatuses[1],
        daysStatuses[2],
        daysStatuses[3],
        daysStatuses[4],
        item.totalClasses,
        item.presentes,
        item.ausentes,
        item.justificados,
        `${item.attendanceRate}%`,
        estadoSemanal,
      ]);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set explicit column widths (wch)
  ws['!cols'] = [
    { wch: 25 }, // Profesor
    { wch: 20 }, // Equipo
    { wch: 28 }, // Alumno
    { wch: 24 }, // Bloque
    { wch: 20 }, // Lunes
    { wch: 20 }, // Martes
    { wch: 20 }, // Miércoles
    { wch: 20 }, // Jueves
    { wch: 20 }, // Viernes
    { wch: 16 }, // Clases
    { wch: 16 }, // Presentes
    { wch: 16 }, // Ausentes
    { wch: 14 }, // Justificados
    { wch: 14 }, // % Asistencia
    { wch: 16 }, // Estado Semanal
  ];

  return ws;
}

/**
 * ============================================================================
 * SHEET 2 BUILDER: Alumnos por Profesor (Semanal)
 * ============================================================================
 */
export function buildTeacherStudentsSheet(
  teachers: TeacherWithBlocks[],
  students: Student[],
  reconciledRecords: StudentAttendanceRecord[],
  weekRange: WeekRange,
  filterTeacherId?: string
): XLSX.WorkSheet {
  const targetTeachers = filterTeacherId && filterTeacherId !== 'all'
    ? teachers.filter((t) => t.id === filterTeacherId)
    : teachers;

  const rows: (string | number)[][] = [];

  // Header Titles
  rows.push(['SISTEMA DE ASISTENCIAS CBA - REPORTE DE ASISTENCIA']);
  rows.push(['REPORTE 2: ALUMNOS POR PROFESOR (DETALLE SEMANAL)']);
  rows.push([
    'Período:',
    weekRange.label,
    'Desde:',
    weekRange.startDate,
    'Hasta:',
    weekRange.endDate,
    'Generado:',
    new Date().toLocaleDateString('es-ES', { hour: '2-digit', minute: '2-digit' }),
  ]);
  rows.push([
    '* Regla de Cierre: Los alumnos sin registro explícito en días de clase se computan como "Ausente (Automático)".',
  ]);
  rows.push([]);

  const colLunes = `Lunes (${formatShortDate(weekRange.weekDays[0].dateStr)})`;
  const colMartes = `Martes (${formatShortDate(weekRange.weekDays[1].dateStr)})`;
  const colMiercoles = `Miércoles (${formatShortDate(weekRange.weekDays[2].dateStr)})`;
  const colJueves = `Jueves (${formatShortDate(weekRange.weekDays[3].dateStr)})`;
  const colViernes = `Viernes (${formatShortDate(weekRange.weekDays[4].dateStr)})`;

  rows.push([
    'Profesor',
    'Alumno',
    'Equipo',
    'Bloque / Horario',
    'Días de Clase',
    colLunes,
    colMartes,
    colMiercoles,
    colJueves,
    colViernes,
    'Total Clases',
    'Total Asistencias',
    'Total Inasistencias',
    'Total Justificados',
    '% Cumplimiento',
    'Desempeño',
  ]);

  for (const teacher of targetTeachers) {
    const summaries = calculateStudentWeeklySummaries({
      teacher,
      students,
      weekRange,
      reconciledRecords,
    });

    // Sort by student name
    const sorted = [...summaries].sort((a, b) =>
      a.student.fullName.localeCompare(b.student.fullName)
    );

    const scheduleDaysStr = teacher.scheduleDays
      .map((d) => d.charAt(0).toUpperCase() + d.slice(1))
      .join(' y ');

    for (const item of sorted) {
      const daysStatuses = weekRange.weekDays.map((day) => {
        const isClassDay = teacher.scheduleDays.includes(day.dayName);
        const rec = item.recordsByDate[day.dateStr];
        return formatStatusCell(rec, isClassDay);
      });

      let desempeno = 'Excelente';
      if (item.attendanceRate < 50) {
        desempeno = 'Crítico';
      } else if (item.attendanceRate < 80) {
        desempeno = 'Regular';
      }

      rows.push([
        teacher.name,
        item.student.fullName,
        item.teamName,
        item.blockLabel || teacher.blocks[0]?.label || 'Clase Regular',
        scheduleDaysStr,
        daysStatuses[0],
        daysStatuses[1],
        daysStatuses[2],
        daysStatuses[3],
        daysStatuses[4],
        item.totalClasses,
        item.presentes,
        item.ausentes,
        item.justificados,
        `${item.attendanceRate}%`,
        desempeno,
      ]);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws['!cols'] = [
    { wch: 25 }, // Profesor
    { wch: 28 }, // Alumno
    { wch: 18 }, // Equipo
    { wch: 24 }, // Bloque / Horario
    { wch: 20 }, // Días de Clase
    { wch: 20 }, // Lunes
    { wch: 20 }, // Martes
    { wch: 20 }, // Miércoles
    { wch: 20 }, // Jueves
    { wch: 20 }, // Viernes
    { wch: 14 }, // Total Clases
    { wch: 16 }, // Total Asistencias
    { wch: 16 }, // Total Inasistencias
    { wch: 16 }, // Total Justificados
    { wch: 16 }, // % Cumplimiento
    { wch: 14 }, // Desempeño
  ];

  return ws;
}

/**
 * ============================================================================
 * SHEET 3 BUILDER: Reporte General Semanal (Consolidado CBA)
 * ============================================================================
 */
export function buildGeneralConsolidatedSheet(
  teachers: TeacherWithBlocks[],
  students: Student[],
  reconciledRecords: StudentAttendanceRecord[],
  weekRange: WeekRange
): XLSX.WorkSheet {
  const rows: (string | number)[][] = [];

  // Title Block
  rows.push(['SISTEMA DE ASISTENCIAS CBA - REPORTE GENERAL CONSOLIDADO SEMANAL']);
  rows.push([
    'Período Evaluado:',
    weekRange.label,
    'Semana N°:',
    weekRange.weekNumber,
    'Año:',
    weekRange.year,
  ]);
  rows.push([
    'Rango de Fechas:',
    `Del ${weekRange.startDate} al ${weekRange.endDate}`,
    'Fecha de Generación:',
    new Date().toLocaleDateString('es-ES', { hour: '2-digit', minute: '2-digit' }),
  ]);
  rows.push([
    '* Auditoría Automática: Las inasistencias sin registro previo han sido conciliadas automáticamente como Ausente.',
  ]);
  rows.push([]);

  // Calculate Overall Statistics
  let totalEvaluations = reconciledRecords.length;
  let totalPresentes = 0;
  let totalAusentes = 0;
  let totalJustificados = 0;

  for (const r of reconciledRecords) {
    if (r.status === 'presente') totalPresentes++;
    else if (r.status === 'ausente') totalAusentes++;
    else if (r.status === 'justificado') totalJustificados++;
  }

  const globalAttendanceRate =
    totalEvaluations > 0 ? Math.round((totalPresentes / totalEvaluations) * 100) : 0;

  // 1. SECTION: Resumen Institucional Global CBA
  rows.push(['1. INDICADORES GLOBALES DE ASISTENCIA INSTITUCIONAL CBA']);
  rows.push(['Indicador Institucional', 'Valor']);
  rows.push(['Total de Profesores Activos', teachers.length]);
  rows.push(['Total de Alumnos Matriculados', students.length]);
  rows.push(['Total de Sesiones Evaluadas en la Semana', totalEvaluations]);
  rows.push(['Total de Asistencias (Presentes)', totalPresentes]);
  rows.push(['Total de Inasistencias (Ausentes)', totalAusentes]);
  rows.push(['Total de Permisos Justificados', totalJustificados]);
  rows.push(['Porcentaje de Asistencia Global CBA', `${globalAttendanceRate}%`]);
  rows.push([]);

  // 2. SECTION: Rendimiento por Profesor
  rows.push(['2. DESGLOSE Y RENDIMIENTO POR PROFESOR']);
  rows.push([
    'Profesor',
    'Días de Clase',
    'Horario',
    'Alumnos Asignados',
    'Sesiones Totales',
    'Presentes',
    'Ausentes',
    'Justificados',
    '% Asistencia',
  ]);

  for (const teacher of teachers) {
    const teacherRecords = reconciledRecords.filter((r) => r.teacherId === teacher.id);
    const teacherStudents = students.filter((s) => s.teacherId === teacher.id);

    let tPresent = 0;
    let tAbsent = 0;
    let tJustified = 0;
    for (const r of teacherRecords) {
      if (r.status === 'presente') tPresent++;
      else if (r.status === 'ausente') tAbsent++;
      else if (r.status === 'justificado') tJustified++;
    }

    const tTotal = teacherRecords.length;
    const tRate = tTotal > 0 ? Math.round((tPresent / tTotal) * 100) : 0;
    const scheduleDaysStr = teacher.scheduleDays
      .map((d) => d.charAt(0).toUpperCase() + d.slice(1))
      .join(' y ');

    rows.push([
      teacher.name,
      scheduleDaysStr,
      teacher.blocks.map((b) => b.label).join(' | '),
      teacherStudents.length,
      tTotal,
      tPresent,
      tAbsent,
      tJustified,
      `${tRate}%`,
    ]);
  }
  rows.push([]);

  // 3. SECTION: Ranking por Equipos de Robótica
  rows.push(['3. RANKING Y DESGLOSE POR EQUIPOS DE ROBÓTICA']);
  rows.push([
    'Posición',
    'Equipo de Robótica',
    'Alumnos Integrantes',
    'Sesiones Totales',
    'Presentes',
    'Ausentes',
    '% Asistencia',
    'Nivel de Compromiso',
  ]);

  // Aggregate by Team
  interface TeamStats {
    name: string;
    studentCount: number;
    sessions: number;
    presentes: number;
    ausentes: number;
    rate: number;
  }

  const teamMap = new Map<string, TeamStats>();

  for (const student of students) {
    const tName = student.teamName?.trim() || 'Sin Equipo';
    if (!teamMap.has(tName)) {
      teamMap.set(tName, {
        name: tName,
        studentCount: 0,
        sessions: 0,
        presentes: 0,
        ausentes: 0,
        rate: 0,
      });
    }
    teamMap.get(tName)!.studentCount++;
  }

  for (const r of reconciledRecords) {
    const student = students.find((s) => s.id === r.studentId);
    const tName = student?.teamName?.trim() || 'Sin Equipo';
    const stat = teamMap.get(tName);
    if (stat) {
      stat.sessions++;
      if (r.status === 'presente') stat.presentes++;
      else if (r.status === 'ausente') stat.ausentes++;
    }
  }

  const teamList = Array.from(teamMap.values()).map((stat) => {
    stat.rate = stat.sessions > 0 ? Math.round((stat.presentes / stat.sessions) * 100) : 0;
    return stat;
  });

  // Sort by Rate descending, then student count
  teamList.sort((a, b) => b.rate - a.rate || b.studentCount - a.studentCount);

  teamList.forEach((stat, index) => {
    let compromiso = '⭐ Destacado';
    if (stat.rate < 60) compromiso = '⚠️ Bajo';
    else if (stat.rate < 85) compromiso = '✔️ Satisfactorio';

    rows.push([
      `#${index + 1}`,
      stat.name,
      stat.studentCount,
      stat.sessions,
      stat.presentes,
      stat.ausentes,
      `${stat.rate}%`,
      compromiso,
    ]);
  });
  rows.push([]);

  // 4. SECTION: Desglose Diario CBA (Lunes a Viernes)
  rows.push(['4. DESGLOSE DIARIO DE ASISTENCIA CBA (LUNES A VIERNES)']);
  rows.push([
    'Día de la Semana',
    'Fecha',
    'Profesores Programados',
    'Sesiones Convocadas',
    'Presentes',
    'Ausentes',
    'Justificados',
    '% Asistencia del Día',
  ]);

  for (const day of weekRange.weekDays) {
    const dayRecords = reconciledRecords.filter((r) => r.classDate === day.dateStr);
    const activeTeachersToday = teachers.filter((t) => t.scheduleDays.includes(day.dayName));

    let dPresent = 0;
    let dAbsent = 0;
    let dJustified = 0;
    for (const r of dayRecords) {
      if (r.status === 'presente') dPresent++;
      else if (r.status === 'ausente') dAbsent++;
      else if (r.status === 'justificado') dJustified++;
    }

    const dTotal = dayRecords.length;
    const dRate = dTotal > 0 ? Math.round((dPresent / dTotal) * 100) : 0;
    const dayNameCapitalized = day.dayName.charAt(0).toUpperCase() + day.dayName.slice(1);

    rows.push([
      dayNameCapitalized,
      day.dateStr,
      activeTeachersToday.map((t) => t.shortName).join(', ') || 'Ninguno',
      dTotal,
      dPresent,
      dAbsent,
      dJustified,
      `${dRate}%`,
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws['!cols'] = [
    { wch: 30 }, // Indicador / Posición / Profesor
    { wch: 25 }, // Valor / Equipo / Fecha
    { wch: 28 }, // Horario / Profesores
    { wch: 20 }, // Alumnos / Sesiones
    { wch: 18 }, // Presentes
    { wch: 18 }, // Ausentes
    { wch: 16 }, // Justificados
    { wch: 16 }, // % Asistencia
    { wch: 22 }, // Compromiso
  ];

  return ws;
}

/**
 * ============================================================================
 * EXPORT 1: Full Workbook with all 3 sheets
 * ============================================================================
 */
export function exportFullWeeklyReport({
  teachers,
  students,
  studentRecords,
  weekRange,
  selectedTeacherId,
}: ExportReportOptions): void {
  const reconciled = reconcileAllTeachersStudentAttendance({
    teachers,
    students,
    weekRange,
    existingRecords: studentRecords,
  });

  const wb = XLSX.utils.book_new();

  // 1. Sheet: Por Equipo y Profesor
  const ws1 = buildTeamTeacherSheet(
    teachers,
    students,
    reconciled,
    weekRange,
    selectedTeacherId
  );
  XLSX.utils.book_append_sheet(wb, ws1, 'Por Equipo y Profesor');

  // 2. Sheet: Alumnos por Profesor
  const ws2 = buildTeacherStudentsSheet(
    teachers,
    students,
    reconciled,
    weekRange,
    selectedTeacherId
  );
  XLSX.utils.book_append_sheet(wb, ws2, 'Alumnos por Profesor');

  // 3. Sheet: General por Semana
  const ws3 = buildGeneralConsolidatedSheet(
    teachers,
    students,
    reconciled,
    weekRange
  );
  XLSX.utils.book_append_sheet(wb, ws3, 'General por Semana');

  const filename = `CBA_Reporte_Semanal_Completo_${weekRange.startDate}_al_${weekRange.endDate}.xlsx`;
  saveWorkbook(wb, filename);
}

/**
 * ============================================================================
 * EXPORT 2: Individual Report "Por Equipo y Profesor"
 * ============================================================================
 */
export function exportTeamTeacherReport({
  teachers,
  students,
  studentRecords,
  weekRange,
  selectedTeacherId,
}: ExportReportOptions): void {
  const reconciled = reconcileAllTeachersStudentAttendance({
    teachers,
    students,
    weekRange,
    existingRecords: studentRecords,
  });

  const wb = XLSX.utils.book_new();
  const ws = buildTeamTeacherSheet(
    teachers,
    students,
    reconciled,
    weekRange,
    selectedTeacherId
  );
  XLSX.utils.book_append_sheet(wb, ws, 'Por Equipo y Profesor');

  const filename = `CBA_Reporte_Equipo_y_Profesor_${weekRange.startDate}_al_${weekRange.endDate}.xlsx`;
  saveWorkbook(wb, filename);
}

/**
 * ============================================================================
 * EXPORT 3: Individual Report "Alumnos por Profesor"
 * ============================================================================
 */
export function exportTeacherStudentsReport({
  teachers,
  students,
  studentRecords,
  weekRange,
  selectedTeacherId,
}: ExportReportOptions): void {
  const reconciled = reconcileAllTeachersStudentAttendance({
    teachers,
    students,
    weekRange,
    existingRecords: studentRecords,
  });

  const wb = XLSX.utils.book_new();
  const ws = buildTeacherStudentsSheet(
    teachers,
    students,
    reconciled,
    weekRange,
    selectedTeacherId
  );
  XLSX.utils.book_append_sheet(wb, ws, 'Alumnos por Profesor');

  const filename = `CBA_Reporte_Alumnos_por_Profesor_${weekRange.startDate}_al_${weekRange.endDate}.xlsx`;
  saveWorkbook(wb, filename);
}

/**
 * ============================================================================
 * EXPORT 4: Individual Report "General Semanal CBA"
 * ============================================================================
 */
export function exportGeneralConsolidatedReport({
  teachers,
  students,
  studentRecords,
  weekRange,
}: ExportReportOptions): void {
  const reconciled = reconcileAllTeachersStudentAttendance({
    teachers,
    students,
    weekRange,
    existingRecords: studentRecords,
  });

  const wb = XLSX.utils.book_new();
  const ws = buildGeneralConsolidatedSheet(
    teachers,
    students,
    reconciled,
    weekRange
  );
  XLSX.utils.book_append_sheet(wb, ws, 'General por Semana');

  const filename = `CBA_Reporte_General_Consolidado_${weekRange.startDate}_al_${weekRange.endDate}.xlsx`;
  saveWorkbook(wb, filename);
}
