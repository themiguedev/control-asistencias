import { useState, useMemo } from 'react';
import type {
  TeacherWithBlocks,
  Student,
  StudentAttendanceRecord,
  WeekRange,
  MonthRange,
} from '../../types';
import {
  getWeekRange,
  getAvailableWeeks,
  reconcileAllTeachersStudentAttendance,
  calculateStudentWeeklySummaries,
} from '../../utils/weeklyReports';
import {
  getMonthRange,
  getAvailableMonths,
  reconcileAllTeachersStudentAttendanceForMonth,
  calculateStudentMonthlySummaries,
} from '../../utils/monthlyReports';
import {
  exportFullWeeklyReport,
  exportTeamTeacherReport,
  exportTeacherStudentsReport,
  exportGeneralConsolidatedReport,
  exportFullMonthlyReport,
  exportMonthlyTeamTeacherReport,
  exportMonthlyTeacherStudentsReport,
  exportMonthlyGeneralConsolidatedReport,
} from '../../utils/excelExport';

interface WeeklyReportsViewProps {
  teachers: TeacherWithBlocks[];
  students: Student[];
  studentAttendanceRecords: StudentAttendanceRecord[];
  activeTeacher?: TeacherWithBlocks;
  selectedDate?: Date;
  initialPeriodMode?: 'semanal' | 'mensual';
}

export function WeeklyReportsView({
  teachers,
  students,
  studentAttendanceRecords,
  activeTeacher,
  selectedDate,
  initialPeriodMode = 'semanal',
}: WeeklyReportsViewProps) {
  const [today] = useState<Date>(() => new Date());

  // Period mode: 'semanal' | 'mensual'
  const [periodMode, setPeriodMode] = useState<'semanal' | 'mensual'>(initialPeriodMode);
  const [prevInitialPeriodMode, setPrevInitialPeriodMode] = useState(initialPeriodMode);
  if (initialPeriodMode !== prevInitialPeriodMode) {
    setPrevInitialPeriodMode(initialPeriodMode);
    setPeriodMode(initialPeriodMode);
  }

  // =========================================================================
  // WEEKLY LOGIC & STATE
  // =========================================================================
  const availableWeeks = useMemo(() => getAvailableWeeks(today, 8, 2), [today]);
  const currentWeek = useMemo(() => getWeekRange(today), [today]);

  const defaultWeekLabel = useMemo(() => {
    if (selectedDate) {
      const selectedDateWeek = getWeekRange(selectedDate);
      const match = availableWeeks.find((w) => w.label === selectedDateWeek.label);
      if (match) return match.label;
    }

    if (studentAttendanceRecords && studentAttendanceRecords.length > 0) {
      const recordedDates = new Set(studentAttendanceRecords.map((r) => r.classDate));
      for (const w of availableWeeks) {
        const hasData = w.weekDays.some((d) => recordedDates.has(d.dateStr));
        if (hasData && w.label === currentWeek.label) return w.label;
      }
      for (let i = availableWeeks.length - 1; i >= 0; i--) {
        const w = availableWeeks[i];
        if (w.weekDays.some((d) => recordedDates.has(d.dateStr))) {
          return w.label;
        }
      }
    }

    return currentWeek.label;
  }, [availableWeeks, currentWeek, selectedDate, studentAttendanceRecords]);

  const [selectedWeekLabel, setSelectedWeekLabel] = useState<string>(defaultWeekLabel);

  // =========================================================================
  // MONTHLY LOGIC & STATE
  // =========================================================================
  const availableMonths = useMemo(() => getAvailableMonths(today, 6, 2), [today]);
  const currentMonthRange = useMemo(() => getMonthRange(today), [today]);

  const defaultMonthLabel = useMemo(() => {
    if (selectedDate) {
      const mRange = getMonthRange(selectedDate);
      const match = availableMonths.find((m) => m.label === mRange.label);
      if (match) return match.label;
    }

    if (studentAttendanceRecords && studentAttendanceRecords.length > 0) {
      const monthPrefixes = new Set(
        studentAttendanceRecords.map((r) => r.classDate.slice(0, 7))
      );
      for (let i = availableMonths.length - 1; i >= 0; i--) {
        const m = availableMonths[i];
        const prefix = `${m.year}-${String(m.month).padStart(2, '0')}`;
        if (monthPrefixes.has(prefix)) {
          return m.label;
        }
      }
    }

    return currentMonthRange.label;
  }, [availableMonths, currentMonthRange, selectedDate, studentAttendanceRecords]);

  const [selectedMonthLabel, setSelectedMonthLabel] = useState<string>(defaultMonthLabel);

  // Synchronize state when selectedDate changes (standard React state-during-render pattern)
  const [prevSelectedDate, setPrevSelectedDate] = useState(selectedDate);
  if (selectedDate !== prevSelectedDate) {
    setPrevSelectedDate(selectedDate);
    if (selectedDate) {
      const selectedDateWeek = getWeekRange(selectedDate);
      if (availableWeeks.some((w) => w.label === selectedDateWeek.label)) {
        setSelectedWeekLabel(selectedDateWeek.label);
      }
      const mRange = getMonthRange(selectedDate);
      if (availableMonths.some((m) => m.label === mRange.label)) {
        setSelectedMonthLabel(mRange.label);
      }
    }
  }

  const selectedWeek: WeekRange = useMemo(() => {
    return availableWeeks.find((w) => w.label === selectedWeekLabel) || currentWeek;
  }, [availableWeeks, selectedWeekLabel, currentWeek]);

  const selectedMonth: MonthRange = useMemo(() => {
    return (
      availableMonths.find((m) => m.label === selectedMonthLabel) || currentMonthRange
    );
  }, [availableMonths, selectedMonthLabel, currentMonthRange]);

  // Active preview tab: 'equipo' | 'profesor' | 'general'
  const [reportTab, setReportTab] = useState<'equipo' | 'profesor' | 'general'>('equipo');

  // Pre-calculate which weeks and months have recorded student attendance
  const recordedDatesSet = useMemo(() => {
    return new Set(studentAttendanceRecords.map((r) => r.classDate));
  }, [studentAttendanceRecords]);

  const recordedMonthPrefixes = useMemo(() => {
    return new Set(studentAttendanceRecords.map((r) => r.classDate.slice(0, 7)));
  }, [studentAttendanceRecords]);

  // Filters
  const [teacherFilter, setTeacherFilter] = useState<string>(
    activeTeacher ? activeTeacher.id : 'all'
  );
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Available unique teams for filter dropdown
  const uniqueTeams = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.teamName && s.teamName.trim()) set.add(s.teamName.trim());
    });
    return Array.from(set).sort();
  }, [students]);

  // =========================================================================
  // WEEKLY DATA COMPUTATIONS
  // =========================================================================
  const weeklyReconciledRecords = useMemo(() => {
    return reconcileAllTeachersStudentAttendance({
      teachers,
      students,
      weekRange: selectedWeek,
      existingRecords: studentAttendanceRecords,
    });
  }, [teachers, students, selectedWeek, studentAttendanceRecords]);

  const weeklySummariesByTeacher = useMemo(() => {
    const map = new Map<string, ReturnType<typeof calculateStudentWeeklySummaries>>();
    for (const t of teachers) {
      const summs = calculateStudentWeeklySummaries({
        teacher: t,
        students,
        weekRange: selectedWeek,
        reconciledRecords: weeklyReconciledRecords,
      });
      map.set(t.id, summs);
    }
    return map;
  }, [teachers, students, selectedWeek, weeklyReconciledRecords]);

  const weeklyGlobalStats = useMemo(() => {
    let totalPresentes = 0;
    let totalAusentes = 0;
    let totalAutoAusentes = 0;
    let totalJustificados = 0;

    for (const r of weeklyReconciledRecords) {
      if (r.status === 'presente') totalPresentes++;
      else if (r.status === 'ausente') {
        totalAusentes++;
        if (r.isAutomatic) totalAutoAusentes++;
      } else if (r.status === 'justificado') {
        totalJustificados++;
      }
    }

    const totalEvals = weeklyReconciledRecords.length;
    const globalRate = totalEvals > 0 ? Math.round((totalPresentes / totalEvals) * 100) : 0;

    return {
      totalEvals,
      totalPresentes,
      totalAusentes,
      totalAutoAusentes,
      totalJustificados,
      globalRate,
    };
  }, [weeklyReconciledRecords]);

  const weeklyTeamRanking = useMemo(() => {
    interface TeamStat {
      name: string;
      studentCount: number;
      sessions: number;
      presentes: number;
      ausentes: number;
      rate: number;
    }
    const map = new Map<string, TeamStat>();

    for (const s of students) {
      const tName = s.teamName?.trim() || 'Sin Equipo';
      if (!map.has(tName)) {
        map.set(tName, {
          name: tName,
          studentCount: 0,
          sessions: 0,
          presentes: 0,
          ausentes: 0,
          rate: 0,
        });
      }
      map.get(tName)!.studentCount++;
    }

    for (const r of weeklyReconciledRecords) {
      const s = students.find((item) => item.id === r.studentId);
      const tName = s?.teamName?.trim() || 'Sin Equipo';
      const stat = map.get(tName);
      if (stat) {
        stat.sessions++;
        if (r.status === 'presente') stat.presentes++;
        else if (r.status === 'ausente') stat.ausentes++;
      }
    }

    const list = Array.from(map.values()).map((st) => {
      st.rate = st.sessions > 0 ? Math.round((st.presentes / st.sessions) * 100) : 0;
      return st;
    });

    list.sort((a, b) => b.rate - a.rate || b.studentCount - a.studentCount);
    return list;
  }, [students, weeklyReconciledRecords]);

  // =========================================================================
  // MONTHLY DATA COMPUTATIONS
  // =========================================================================
  const monthlyReconciledRecords = useMemo(() => {
    return reconcileAllTeachersStudentAttendanceForMonth({
      teachers,
      students,
      monthRange: selectedMonth,
      existingRecords: studentAttendanceRecords,
    });
  }, [teachers, students, selectedMonth, studentAttendanceRecords]);

  const monthlySummariesByTeacher = useMemo(() => {
    const map = new Map<string, ReturnType<typeof calculateStudentMonthlySummaries>>();
    for (const t of teachers) {
      const summs = calculateStudentMonthlySummaries({
        teacher: t,
        students,
        monthRange: selectedMonth,
        reconciledRecords: monthlyReconciledRecords,
      });
      map.set(t.id, summs);
    }
    return map;
  }, [teachers, students, selectedMonth, monthlyReconciledRecords]);

  const monthlyGlobalStats = useMemo(() => {
    let totalPresentes = 0;
    let totalAusentes = 0;
    let totalAutoAusentes = 0;
    let totalJustificados = 0;

    for (const r of monthlyReconciledRecords) {
      if (r.status === 'presente') totalPresentes++;
      else if (r.status === 'ausente') {
        totalAusentes++;
        if (r.isAutomatic) totalAutoAusentes++;
      } else if (r.status === 'justificado') {
        totalJustificados++;
      }
    }

    const totalEvals = monthlyReconciledRecords.length;
    const globalRate = totalEvals > 0 ? Math.round((totalPresentes / totalEvals) * 100) : 0;

    return {
      totalEvals,
      totalPresentes,
      totalAusentes,
      totalAutoAusentes,
      totalJustificados,
      globalRate,
    };
  }, [monthlyReconciledRecords]);

  const monthlyTeamRanking = useMemo(() => {
    interface TeamStat {
      name: string;
      studentCount: number;
      sessions: number;
      presentes: number;
      ausentes: number;
      rate: number;
    }
    const map = new Map<string, TeamStat>();

    for (const s of students) {
      const tName = s.teamName?.trim() || 'Sin Equipo';
      if (!map.has(tName)) {
        map.set(tName, {
          name: tName,
          studentCount: 0,
          sessions: 0,
          presentes: 0,
          ausentes: 0,
          rate: 0,
        });
      }
      map.get(tName)!.studentCount++;
    }

    for (const r of monthlyReconciledRecords) {
      const s = students.find((item) => item.id === r.studentId);
      const tName = s?.teamName?.trim() || 'Sin Equipo';
      const stat = map.get(tName);
      if (stat) {
        stat.sessions++;
        if (r.status === 'presente') stat.presentes++;
        else if (r.status === 'ausente') stat.ausentes++;
      }
    }

    const list = Array.from(map.values()).map((st) => {
      st.rate = st.sessions > 0 ? Math.round((st.presentes / st.sessions) * 100) : 0;
      return st;
    });

    list.sort((a, b) => b.rate - a.rate || b.studentCount - a.studentCount);
    return list;
  }, [students, monthlyReconciledRecords]);

  // Handle Export Downloads (Both Weekly & Monthly)
  const triggerExport = (type: 'all' | 'team' | 'teacher' | 'general') => {
    setIsExporting(true);

    setTimeout(() => {
      try {
        if (periodMode === 'semanal') {
          const opts = {
            teachers,
            students,
            studentRecords: studentAttendanceRecords,
            weekRange: selectedWeek,
            selectedTeacherId: teacherFilter !== 'all' ? teacherFilter : undefined,
          };

          if (type === 'all') {
            exportFullWeeklyReport(opts);
            setExportNotice('✅ Archivo Excel semanal completo (3 hojas) descargado.');
          } else if (type === 'team') {
            exportTeamTeacherReport(opts);
            setExportNotice('✅ Reporte semanal "Por Equipo y Profesor" descargado.');
          } else if (type === 'teacher') {
            exportTeacherStudentsReport(opts);
            setExportNotice('✅ Reporte semanal "Alumnos por Profesor" descargado.');
          } else if (type === 'general') {
            exportGeneralConsolidatedReport(opts);
            setExportNotice('✅ Reporte semanal "General Consolidado CBA" descargado.');
          }
        } else {
          // MONTHLY EXPORT
          const opts = {
            teachers,
            students,
            studentRecords: studentAttendanceRecords,
            monthRange: selectedMonth,
            selectedTeacherId: teacherFilter !== 'all' ? teacherFilter : undefined,
          };

          if (type === 'all') {
            exportFullMonthlyReport(opts);
            setExportNotice(
              `✅ Archivo Excel mensual (${selectedMonth.label}) con 3 hojas descargado.`
            );
          } else if (type === 'team') {
            exportMonthlyTeamTeacherReport(opts);
            setExportNotice('✅ Reporte mensual "Por Equipo y Profesor" descargado.');
          } else if (type === 'teacher') {
            exportMonthlyTeacherStudentsReport(opts);
            setExportNotice('✅ Reporte mensual "Alumnos por Profesor" descargado.');
          } else if (type === 'general') {
            exportMonthlyGeneralConsolidatedReport(opts);
            setExportNotice('✅ Reporte mensual "General Consolidado CBA" descargado.');
          }
        }
      } catch (err) {
        console.error('Error al generar Excel:', err);
        setExportNotice('❌ Error al exportar archivo Excel.');
      } finally {
        setIsExporting(false);
        setTimeout(() => setExportNotice(null), 4000);
      }
    }, 150);
  };

  const visibleTeachers = useMemo(() => {
    if (teacherFilter === 'all') return teachers;
    return teachers.filter((t) => t.id === teacherFilter);
  }, [teachers, teacherFilter]);

  return (
    <div className="space-y-6">
      {/* 1. Header Card with Period Mode Toggle & Selectors */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 rounded-xl text-2xl">
                {periodMode === 'semanal' ? '📊' : '🗓️'}
              </span>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  {periodMode === 'semanal'
                    ? 'Reportes Semanales y Exportación Excel'
                    : 'Reporte Mensual de Asistencias y Exportación Excel'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  {periodMode === 'semanal'
                    ? 'Consolidado semanal CBA con 3 informes oficiales y cierre automático de inasistencias.'
                    : 'Consolidado mensual CBA con 3 informes oficiales, evolución cronológica y desglose por semanas.'}
                </p>
              </div>
            </div>
          </div>

          {/* Period Mode Selector (Semanal / Mensual) & Dropdown */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Period Segmented Toggle */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setPeriodMode('semanal')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  periodMode === 'semanal'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>📊</span>
                <span>Semanal</span>
              </button>
              <button
                type="button"
                onClick={() => setPeriodMode('mensual')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  periodMode === 'mensual'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>🗓️</span>
                <span>Mensual</span>
              </button>
            </div>

            {/* Dropdown according to Period Mode */}
            {periodMode === 'semanal' ? (
              <div className="flex items-center gap-2">
                <select
                  id="week-select"
                  aria-label="Seleccionar semana del reporte"
                  value={selectedWeekLabel}
                  onChange={(e) => setSelectedWeekLabel(e.target.value)}
                  className="flex-1 sm:w-60 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs sm:text-sm rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                >
                  {availableWeeks.map((w) => {
                    const hasData = w.weekDays.some((d) => recordedDatesSet.has(d.dateStr));
                    const isCurrent = w.label === currentWeek.label;
                    return (
                      <option key={w.label} value={w.label}>
                        {w.label} {isCurrent ? '⭐ (Actual)' : ''} {hasData ? '📝 (Con datos)' : ''}
                      </option>
                    );
                  })}
                </select>

                <button
                  type="button"
                  onClick={() => setSelectedWeekLabel(currentWeek.label)}
                  className="text-xs font-semibold px-2.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition cursor-pointer border border-slate-200 dark:border-slate-700 whitespace-nowrap"
                  title="Volver a la semana en curso"
                >
                  Actual
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <select
                  id="month-select"
                  aria-label="Seleccionar mes del reporte"
                  value={selectedMonthLabel}
                  onChange={(e) => setSelectedMonthLabel(e.target.value)}
                  className="flex-1 sm:w-60 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs sm:text-sm rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                >
                  {availableMonths.map((m) => {
                    const prefix = `${m.year}-${String(m.month).padStart(2, '0')}`;
                    const hasData = recordedMonthPrefixes.has(prefix);
                    const isCurrent = m.label === currentMonthRange.label;
                    return (
                      <option key={m.label} value={m.label}>
                        {m.label} {isCurrent ? '⭐ (Actual)' : ''} {hasData ? '📝 (Con datos)' : ''}
                      </option>
                    );
                  })}
                </select>

                <button
                  type="button"
                  onClick={() => setSelectedMonthLabel(currentMonthRange.label)}
                  className="text-xs font-semibold px-2.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition cursor-pointer border border-slate-200 dark:border-slate-700 whitespace-nowrap"
                  title="Volver al mes en curso"
                >
                  Mes Actual
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Business Rule Banner */}
        <div className="mt-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
          <span className="text-base leading-none">⚡</span>
          <div>
            <strong className="font-semibold">
              {periodMode === 'semanal'
                ? 'Regla de Cierre de Semana Automático:'
                : 'Regla de Auditoría y Cierre Mensual:'}
            </strong>{' '}
            {periodMode === 'semanal'
              ? 'Todo alumno inscrito que no haya tenido registro explícito de asistencia en el día programado de su profesor es asignado automáticamente como '
              : 'Las sesiones transcurridas sin registro previo de asistencia se concilian automáticamente como '}
            <span className="inline-flex items-center px-1.5 py-0.2 rounded font-bold bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100">
              Ausente (Automático)
            </span>
            {periodMode === 'semanal'
              ? '. Las 3 hojas de cálculo y vistas previas reflejan este balance reconciliado.'
              : '. Los días futuros del mes no se penalizan. Las hojas de cálculo integran el desglose de todas las semanas del mes.'}
          </div>
        </div>

        {/* Download Buttons Bar */}
        <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-3">
          {/* Main Excel Export Button */}
          <button
            type="button"
            onClick={() => triggerExport('all')}
            disabled={isExporting}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/20 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
          >
            <span className="text-lg">📥</span>
            <span>
              {periodMode === 'semanal'
                ? 'Descargar Excel Semanal (.xlsx)'
                : `Descargar Excel Mensual (${selectedMonth.label})`}
            </span>
            <span className="text-xs bg-emerald-700/80 px-2 py-0.5 rounded-full font-normal">
              3 Hojas Integradas
            </span>
          </button>

          {/* Individual Report Downloads */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mr-1 hidden md:inline">
              Exportar individual:
            </span>
            <button
              type="button"
              onClick={() => triggerExport('team')}
              disabled={isExporting}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            >
              <span>📗</span>
              <span>Por Equipo</span>
            </button>
            <button
              type="button"
              onClick={() => triggerExport('teacher')}
              disabled={isExporting}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            >
              <span>📘</span>
              <span>Por Profesor</span>
            </button>
            <button
              type="button"
              onClick={() => triggerExport('general')}
              disabled={isExporting}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            >
              <span>📙</span>
              <span>General CBA</span>
            </button>
          </div>
        </div>

        {/* Export Notification Toast */}
        {exportNotice && (
          <div className="mt-3 p-2.5 rounded-xl text-xs font-medium bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center justify-between animate-fadeIn">
            <span>{exportNotice}</span>
            <button
              type="button"
              onClick={() => setExportNotice(null)}
              className="text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>

      {/* 2. Interactive Navigation Tabs for the 3 Reports */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav
          className="flex space-x-2 sm:space-x-4 overflow-x-auto pb-1"
          aria-label="Pestañas de Reportes"
        >
          <button
            type="button"
            onClick={() => setReportTab('equipo')}
            className={`py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition cursor-pointer border ${
              reportTab === 'equipo'
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            📗 1. Por Equipo y Profesor {periodMode === 'mensual' ? '(Mensual)' : ''}
          </button>
          <button
            type="button"
            onClick={() => setReportTab('profesor')}
            className={`py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition cursor-pointer border ${
              reportTab === 'profesor'
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            📘 2. Alumnos por Profesor {periodMode === 'mensual' ? '(Mensual)' : ''}
          </button>
          <button
            type="button"
            onClick={() => setReportTab('general')}
            className={`py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition cursor-pointer border ${
              reportTab === 'general'
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            📙 3. General Consolidado {periodMode === 'mensual' ? 'Mensual' : 'Semanal'} CBA
          </button>
        </nav>
      </div>

      {/* 3. Filters Bar for Report 1 & 2 */}
      {reportTab !== 'general' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <label
              htmlFor="filter-teacher"
              className="text-xs font-semibold text-slate-500 dark:text-slate-400"
            >
              Profesor:
            </label>
            <select
              id="filter-teacher"
              value={teacherFilter}
              onChange={(e) => setTeacherFilter(e.target.value)}
              className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-lg px-2.5 py-1.5 font-medium focus:outline-none"
            >
              <option value="all">Todos los Profesores ({teachers.length})</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {reportTab === 'equipo' && uniqueTeams.length > 0 && (
            <div className="flex items-center gap-2 flex-1 min-w-[180px]">
              <label
                htmlFor="filter-team"
                className="text-xs font-semibold text-slate-500 dark:text-slate-400"
              >
                Equipo:
              </label>
              <select
                id="filter-team"
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-lg px-2.5 py-1.5 font-medium focus:outline-none"
              >
                <option value="all">Todos los Equipos</option>
                {uniqueTeams.map((tm) => (
                  <option key={tm} value={tm}>
                    {tm}
                  </option>
                ))}
                <option value="Sin Equipo">Sin Equipo</option>
              </select>
            </div>
          )}

          <div className="flex items-center gap-2 flex-1 min-w-[180px]">
            <input
              type="text"
              placeholder="Buscar por nombre o cédula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none placeholder-slate-400"
            />
          </div>
        </div>
      )}

      {/* 4. CONTENT SECTIONS */}

      {/* ========================================================================= */}
      {/* TAB 1: POR EQUIPO Y PROFESOR */}
      {/* ========================================================================= */}
      {reportTab === 'equipo' && (
        <div className="space-y-6">
          {periodMode === 'semanal' ? (
            /* --- MODO SEMANAL --- */
            visibleTeachers.map((teacher) => {
              const rawSummaries = weeklySummariesByTeacher.get(teacher.id) || [];
              let summaries = rawSummaries;

              if (teamFilter !== 'all') {
                summaries = summaries.filter((s) => s.teamName === teamFilter);
              }
              if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase();
                summaries = summaries.filter(
                  (s) =>
                    s.student.fullName.toLowerCase().includes(term) ||
                    (s.student.identifier && s.student.identifier.toLowerCase().includes(term))
                );
              }

              if (summaries.length === 0) return null;

              const teamGroups = new Map<string, typeof summaries>();
              for (const item of summaries) {
                if (!teamGroups.has(item.teamName)) {
                  teamGroups.set(item.teamName, []);
                }
                teamGroups.get(item.teamName)!.push(item);
              }

              return (
                <div
                  key={teacher.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm"
                >
                  <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                      <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                        Profesor: {teacher.name}
                      </h3>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        ({teacher.scheduleDays.join(', ')})
                      </span>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                      {summaries.length} Alumnos evaluados
                    </span>
                  </div>

                  <div className="p-4 sm:p-6 space-y-6">
                    {Array.from(teamGroups.entries()).map(([teamName, teamMembers]) => (
                      <div
                        key={teamName}
                        className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
                      >
                        <div className="bg-slate-100/70 dark:bg-slate-800/50 px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                          <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                            🤖 Equipo: {teamName}
                          </span>
                          <span className="text-xs text-slate-500">
                            {teamMembers.length} Integrantes
                          </span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                            <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                              <tr>
                                <th className="py-2.5 px-3">Alumno</th>
                                <th className="py-2.5 px-2">Bloque / Horario</th>
                                <th className="py-2.5 px-2 text-center">Lun</th>
                                <th className="py-2.5 px-2 text-center">Mar</th>
                                <th className="py-2.5 px-2 text-center">Mié</th>
                                <th className="py-2.5 px-2 text-center">Jue</th>
                                <th className="py-2.5 px-2 text-center">Vie</th>
                                <th className="py-2.5 px-2 text-center">Pres.</th>
                                <th className="py-2.5 px-2 text-center">Aus.</th>
                                <th className="py-2.5 px-2 text-center">Just.</th>
                                <th className="py-2.5 px-3 text-center">% Asist.</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                              {teamMembers.map((item) => (
                                <tr
                                  key={item.student.id}
                                  className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
                                >
                                  <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                                    <div>{item.student.fullName}</div>
                                    {item.student.identifier && (
                                      <span className="text-[10px] text-slate-400">
                                        {item.student.identifier}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-2 text-slate-500 whitespace-nowrap">
                                    {item.blockLabel || teacher.blocks[0]?.label || 'Clase Regular'}
                                  </td>
                                  {selectedWeek.weekDays.map((day) => {
                                    const isClassDay = teacher.scheduleDays.includes(day.dayName);
                                    const rec = item.recordsByDate[day.dateStr];
                                    return (
                                      <td key={day.dateStr} className="py-2.5 px-2 text-center">
                                        <DayStatusBadge isClassDay={isClassDay} record={rec} />
                                      </td>
                                    );
                                  })}
                                  <td className="py-2.5 px-2 text-center font-bold text-emerald-600 dark:text-emerald-400">
                                    {item.presentes}
                                  </td>
                                  <td className="py-2.5 px-2 text-center font-bold text-rose-600 dark:text-rose-400">
                                    {item.ausentes}
                                  </td>
                                  <td className="py-2.5 px-2 text-center font-bold text-amber-600 dark:text-amber-400">
                                    {item.justificados}
                                  </td>
                                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                    <AttendanceRatePill rate={item.attendanceRate} />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            /* --- MODO MENSUAL --- */
            visibleTeachers.map((teacher) => {
              const rawSummaries = monthlySummariesByTeacher.get(teacher.id) || [];
              let summaries = rawSummaries;

              if (teamFilter !== 'all') {
                summaries = summaries.filter((s) => s.teamName === teamFilter);
              }
              if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase();
                summaries = summaries.filter(
                  (s) =>
                    s.student.fullName.toLowerCase().includes(term) ||
                    (s.student.identifier && s.student.identifier.toLowerCase().includes(term))
                );
              }

              if (summaries.length === 0) return null;

              const teamGroups = new Map<string, typeof summaries>();
              for (const item of summaries) {
                if (!teamGroups.has(item.teamName)) {
                  teamGroups.set(item.teamName, []);
                }
                teamGroups.get(item.teamName)!.push(item);
              }

              return (
                <div
                  key={teacher.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm"
                >
                  <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                      <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                        Profesor: {teacher.name} — Consolidado {selectedMonth.label}
                      </h3>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        ({teacher.scheduleDays.join(', ')})
                      </span>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                      {summaries.length} Alumnos en el Mes
                    </span>
                  </div>

                  <div className="p-4 sm:p-6 space-y-6">
                    {Array.from(teamGroups.entries()).map(([teamName, teamMembers]) => (
                      <div
                        key={teamName}
                        className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
                      >
                        <div className="bg-slate-100/70 dark:bg-slate-800/50 px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                          <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                            🤖 Equipo: {teamName}
                          </span>
                          <span className="text-xs text-slate-500">
                            {teamMembers.length} Integrantes
                          </span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                            <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                              <tr>
                                <th className="py-2.5 px-3">Alumno</th>
                                <th className="py-2.5 px-2">Horario / Bloque</th>
                                <th className="py-2.5 px-2 text-center">Clases Mes</th>
                                <th className="py-2.5 px-2 text-center">Pres.</th>
                                <th className="py-2.5 px-2 text-center">Aus.</th>
                                <th className="py-2.5 px-2 text-center">Just.</th>
                                <th className="py-2.5 px-2 text-center">% Mes</th>
                                {selectedMonth.weeks.map((_, wIdx) => (
                                  <th
                                    key={wIdx}
                                    className="py-2.5 px-2 text-center whitespace-nowrap"
                                  >
                                    Sem {wIdx + 1}
                                  </th>
                                ))}
                                <th className="py-2.5 px-3 text-center">Estado</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                              {teamMembers.map((item) => {
                                let badgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
                                let estado = 'Excelente';
                                if (item.attendanceRate < 50) {
                                  badgeColor = 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';
                                  estado = 'Crítico';
                                } else if (item.attendanceRate < 80) {
                                  badgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
                                  estado = 'Regular';
                                }

                                return (
                                  <tr
                                    key={item.student.id}
                                    className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
                                  >
                                    <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                                      <div>{item.student.fullName}</div>
                                      {item.student.identifier && (
                                        <span className="text-[10px] text-slate-400">
                                          {item.student.identifier}
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-2 text-slate-500 whitespace-nowrap">
                                      {item.blockLabel || teacher.blocks[0]?.label || 'Clase Regular'}
                                    </td>
                                    <td className="py-2.5 px-2 text-center font-bold">
                                      {item.totalClasses}
                                    </td>
                                    <td className="py-2.5 px-2 text-center font-bold text-emerald-600 dark:text-emerald-400">
                                      {item.presentes}
                                    </td>
                                    <td className="py-2.5 px-2 text-center font-bold text-rose-600 dark:text-rose-400">
                                      {item.ausentes}
                                    </td>
                                    <td className="py-2.5 px-2 text-center font-bold text-amber-600 dark:text-amber-400">
                                      {item.justificados}
                                    </td>
                                    <td className="py-2.5 px-2 text-center whitespace-nowrap">
                                      <AttendanceRatePill rate={item.attendanceRate} />
                                    </td>
                                    {item.weeklyBreakdown.map((wb, wbIdx) => (
                                      <td key={wbIdx} className="py-2.5 px-2 text-center">
                                        {wb.total > 0 ? (
                                          <span
                                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                              wb.rate >= 80
                                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                                : wb.rate >= 50
                                                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                                                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                                            }`}
                                            title={`${wb.presentes}/${wb.total} asistencias`}
                                          >
                                            {wb.rate}%
                                          </span>
                                        ) : (
                                          <span className="text-slate-300 dark:text-slate-600">—</span>
                                        )}
                                      </td>
                                    ))}
                                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                      <span
                                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeColor}`}
                                      >
                                        {estado}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ALUMNOS POR PROFESOR */}
      {/* ========================================================================= */}
      {reportTab === 'profesor' && (
        <div className="space-y-6">
          {periodMode === 'semanal' ? (
            /* --- MODO SEMANAL --- */
            visibleTeachers.map((teacher) => {
              const rawSummaries = weeklySummariesByTeacher.get(teacher.id) || [];
              let summaries = rawSummaries;

              if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase();
                summaries = summaries.filter(
                  (s) =>
                    s.student.fullName.toLowerCase().includes(term) ||
                    (s.student.identifier && s.student.identifier.toLowerCase().includes(term))
                );
              }

              if (summaries.length === 0) return null;

              return (
                <div
                  key={teacher.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm"
                >
                  <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                        {teacher.name} — Lista Oficial de Alumnos
                      </h3>
                      <p className="text-xs text-slate-500">
                        Días: {teacher.scheduleDays.join(' y ')} • Horario:{' '}
                        {teacher.blocks.map((b) => b.label).join(' | ')}
                      </p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                      {summaries.length} Alumnos
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Alumno</th>
                          <th className="py-2.5 px-2">Equipo</th>
                          <th className="py-2.5 px-2">Bloque</th>
                          <th className="py-2.5 px-2 text-center">Lun</th>
                          <th className="py-2.5 px-2 text-center">Mar</th>
                          <th className="py-2.5 px-2 text-center">Mié</th>
                          <th className="py-2.5 px-2 text-center">Jue</th>
                          <th className="py-2.5 px-2 text-center">Vie</th>
                          <th className="py-2.5 px-2 text-center">Pres.</th>
                          <th className="py-2.5 px-2 text-center">Aus.</th>
                          <th className="py-2.5 px-2 text-center">Just.</th>
                          <th className="py-2.5 px-3 text-center">% Asist.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                        {summaries.map((item, idx) => (
                          <tr
                            key={item.student.id}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
                          >
                            <td className="py-2.5 px-3 text-slate-400 font-bold">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                              <div>{item.student.fullName}</div>
                              {item.student.identifier && (
                                <span className="text-[10px] text-slate-400 font-normal">
                                  {item.student.identifier}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-2 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                              {item.teamName}
                            </td>
                            <td className="py-2.5 px-2 text-slate-500 whitespace-nowrap">
                              {item.blockLabel || teacher.blocks[0]?.label || 'Clase Regular'}
                            </td>
                            {selectedWeek.weekDays.map((day) => {
                              const isClassDay = teacher.scheduleDays.includes(day.dayName);
                              const rec = item.recordsByDate[day.dateStr];
                              return (
                                <td key={day.dateStr} className="py-2.5 px-2 text-center">
                                  <DayStatusBadge isClassDay={isClassDay} record={rec} />
                                </td>
                              );
                            })}
                            <td className="py-2.5 px-2 text-center font-bold text-emerald-600 dark:text-emerald-400">
                              {item.presentes}
                            </td>
                            <td className="py-2.5 px-2 text-center font-bold text-rose-600 dark:text-rose-400">
                              {item.ausentes}
                            </td>
                            <td className="py-2.5 px-2 text-center font-bold text-amber-600 dark:text-amber-400">
                              {item.justificados}
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <AttendanceRatePill rate={item.attendanceRate} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          ) : (
            /* --- MODO MENSUAL --- */
            visibleTeachers.map((teacher) => {
              const rawSummaries = monthlySummariesByTeacher.get(teacher.id) || [];
              let summaries = rawSummaries;

              if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase();
                summaries = summaries.filter(
                  (s) =>
                    s.student.fullName.toLowerCase().includes(term) ||
                    (s.student.identifier && s.student.identifier.toLowerCase().includes(term))
                );
              }

              if (summaries.length === 0) return null;

              return (
                <div
                  key={teacher.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm"
                >
                  <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                        {teacher.name} — Consolidado Mensual ({selectedMonth.label})
                      </h3>
                      <p className="text-xs text-slate-500">
                        Días: {teacher.scheduleDays.join(' y ')} • Horario:{' '}
                        {teacher.blocks.map((b) => b.label).join(' | ')}
                      </p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                      {summaries.length} Alumnos en el Mes
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Alumno</th>
                          <th className="py-2.5 px-2">Cédula / Teléfono</th>
                          <th className="py-2.5 px-2">Equipo</th>
                          <th className="py-2.5 px-2">Bloque</th>
                          <th className="py-2.5 px-2 text-center">Clases Mes</th>
                          <th className="py-2.5 px-2 text-center">Pres.</th>
                          <th className="py-2.5 px-2 text-center">Aus.</th>
                          <th className="py-2.5 px-2 text-center">Just.</th>
                          <th className="py-2.5 px-3 text-center">% Mes</th>
                          <th className="py-2.5 px-3 text-center">Desempeño</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                        {summaries.map((item, idx) => {
                          let desempeno = 'Excelente';
                          let badgeClasses = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
                          if (item.attendanceRate < 50) {
                            desempeno = 'Crítico';
                            badgeClasses = 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';
                          } else if (item.attendanceRate < 80) {
                            desempeno = 'Regular';
                            badgeClasses = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
                          }

                          return (
                            <tr
                              key={item.student.id}
                              className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
                            >
                              <td className="py-2.5 px-3 text-slate-400 font-bold">{idx + 1}</td>
                              <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                                {item.student.fullName}
                              </td>
                              <td className="py-2.5 px-2 text-slate-500 whitespace-nowrap text-[11px]">
                                <div>{item.student.identifier || '—'}</div>
                                {item.student.contactPhone && (
                                  <div className="text-[10px] text-slate-400">
                                    {item.student.contactPhone}
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-2 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                {item.teamName}
                              </td>
                              <td className="py-2.5 px-2 text-slate-500 whitespace-nowrap">
                                {item.blockLabel || teacher.blocks[0]?.label || 'Clase Regular'}
                              </td>
                              <td className="py-2.5 px-2 text-center font-bold">
                                {item.totalClasses}
                              </td>
                              <td className="py-2.5 px-2 text-center font-bold text-emerald-600 dark:text-emerald-400">
                                {item.presentes}
                              </td>
                              <td className="py-2.5 px-2 text-center font-bold text-rose-600 dark:text-rose-400">
                                {item.ausentes}
                              </td>
                              <td className="py-2.5 px-2 text-center font-bold text-amber-600 dark:text-amber-400">
                                {item.justificados}
                              </td>
                              <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                <AttendanceRatePill rate={item.attendanceRate} />
                              </td>
                              <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                <span
                                  className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badgeClasses}`}
                                >
                                  {desempeno}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: GENERAL CONSOLIDADO CBA */}
      {/* ========================================================================= */}
      {reportTab === 'general' && (
        <div className="space-y-6">
          {/* KPI Cards Grid */}
          {(() => {
            const stats = periodMode === 'semanal' ? weeklyGlobalStats : monthlyGlobalStats;
            const teams = periodMode === 'semanal' ? weeklyTeamRanking : monthlyTeamRanking;

            return (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Global Rate */}
                  <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl p-5 shadow-md shadow-blue-500/20">
                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-100">
                      Asistencia Global {periodMode === 'semanal' ? 'Semanal' : 'Mensual'}
                    </span>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-4xl font-black">{stats.globalRate}%</span>
                      <span className="text-xs text-blue-200">promedio CBA</span>
                    </div>
                    <div className="mt-3 w-full bg-blue-950/40 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-white h-full rounded-full transition-all duration-500"
                        style={{ width: `${stats.globalRate}%` }}
                      />
                    </div>
                  </div>

                  {/* Total Students */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Alumnos Matriculados
                      </span>
                      <span className="p-2 bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 rounded-xl text-lg">
                        👥
                      </span>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-3xl font-black text-slate-900 dark:text-white">
                        {students.length}
                      </span>
                      <span className="text-xs text-slate-500">en {teachers.length} profesores</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      {stats.totalEvals} sesiones convocadas en el período
                    </p>
                  </div>

                  {/* Total Presentes */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Asistencias Efectivas
                      </span>
                      <span className="p-2 bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 rounded-xl text-lg">
                        ✅
                      </span>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                        {stats.totalPresentes}
                      </span>
                      <span className="text-xs text-slate-500">presentes</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      {stats.totalJustificados} permisos justificados
                    </p>
                  </div>

                  {/* Total Ausencias */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Inasistencias Totales
                      </span>
                      <span className="p-2 bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 rounded-xl text-lg">
                        ⚠️
                      </span>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-3xl font-black text-rose-600 dark:text-rose-400">
                        {stats.totalAusentes}
                      </span>
                      <span className="text-xs text-slate-500">ausencias</span>
                    </div>
                    <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
                      {stats.totalAutoAusentes} por cierre automático
                    </p>
                  </div>
                </div>

                {/* Robotics Teams Ranking Section */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🏆</span>
                      <h3 className="font-bold text-base text-slate-900 dark:text-white">
                        Ranking y Desempeño por Equipos de Robótica (
                        {periodMode === 'semanal' ? 'Semana' : selectedMonth.label})
                      </h3>
                    </div>
                    <span className="text-xs text-slate-500">Ordenado por % de Asistencia</span>
                  </div>

                  <div className="space-y-3">
                    {teams.map((team, index) => {
                      const rankColor =
                        index === 0
                          ? 'text-amber-500 bg-amber-100 dark:bg-amber-950'
                          : index === 1
                          ? 'text-slate-400 bg-slate-200 dark:bg-slate-800'
                          : index === 2
                          ? 'text-amber-700 bg-amber-100 dark:bg-amber-950'
                          : 'text-slate-500 bg-slate-100 dark:bg-slate-800';

                      return (
                        <div
                          key={team.name}
                          className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${rankColor}`}
                            >
                              #{index + 1}
                            </span>
                            <div>
                              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                                {team.name}
                              </h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {team.studentCount} Alumnos • {team.sessions} Sesiones •{' '}
                                {team.presentes} Presentes • {team.ausentes} Ausentes
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 min-w-[200px]">
                            <div className="flex-1">
                              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    team.rate >= 80
                                      ? 'bg-emerald-500'
                                      : team.rate >= 60
                                      ? 'bg-amber-500'
                                      : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${team.rate}%` }}
                                />
                              </div>
                            </div>
                            <span className="font-extrabold text-sm text-slate-900 dark:text-white w-12 text-right">
                              {team.rate}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Breakdown by Teacher Table */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <span>👨‍🏫</span>
                    <span>
                      Rendimiento por Profesor CBA ({periodMode === 'semanal' ? 'Semana' : 'Mes'})
                    </span>
                  </h3>

                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">Profesor</th>
                          <th className="py-2.5 px-2">Días de Clase</th>
                          <th className="py-2.5 px-2">Horario</th>
                          <th className="py-2.5 px-2 text-center">Alumnos</th>
                          <th className="py-2.5 px-2 text-center">Sesiones</th>
                          <th className="py-2.5 px-2 text-center text-emerald-600 dark:text-emerald-400">
                            Presentes
                          </th>
                          <th className="py-2.5 px-2 text-center text-rose-600 dark:text-rose-400">
                            Ausentes
                          </th>
                          <th className="py-2.5 px-2 text-center text-amber-600 dark:text-amber-400">
                            Justificados
                          </th>
                          <th className="py-2.5 px-3 text-center">% Asistencia</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                        {teachers.map((t) => {
                          const records =
                            periodMode === 'semanal'
                              ? weeklyReconciledRecords.filter((r) => r.teacherId === t.id)
                              : monthlyReconciledRecords.filter((r) => r.teacherId === t.id);

                          const tStudents = students.filter((s) => s.teacherId === t.id);

                          let tPres = 0;
                          let tAus = 0;
                          let tJust = 0;
                          for (const r of records) {
                            if (r.status === 'presente') tPres++;
                            else if (r.status === 'ausente') tAus++;
                            else if (r.status === 'justificado') tJust++;
                          }

                          const tTotal = records.length;
                          const tRate = tTotal > 0 ? Math.round((tPres / tTotal) * 100) : 0;

                          return (
                            <tr
                              key={t.id}
                              className="hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                            >
                              <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                                {t.name}
                              </td>
                              <td className="py-2.5 px-2 text-slate-500 whitespace-nowrap">
                                {t.scheduleDays.join(' y ')}
                              </td>
                              <td className="py-2.5 px-2 text-slate-500 whitespace-nowrap">
                                {t.blocks.map((b) => b.label).join(' | ')}
                              </td>
                              <td className="py-2.5 px-2 text-center font-bold">
                                {tStudents.length}
                              </td>
                              <td className="py-2.5 px-2 text-center font-bold">{tTotal}</td>
                              <td className="py-2.5 px-2 text-center font-bold text-emerald-600 dark:text-emerald-400">
                                {tPres}
                              </td>
                              <td className="py-2.5 px-2 text-center font-bold text-rose-600 dark:text-rose-400">
                                {tAus}
                              </td>
                              <td className="py-2.5 px-2 text-center font-bold text-amber-600 dark:text-amber-400">
                                {tJust}
                              </td>
                              <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                <AttendanceRatePill rate={tRate} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Evolution Section: Daily (Weekly Mode) or Weekly Evolution (Monthly Mode) */}
                {periodMode === 'semanal' ? (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                      <span>📅</span>
                      <span>Desglose Diario de Asistencia (Lunes a Viernes)</span>
                    </h3>

                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                      <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                        <thead className="bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                          <tr>
                            <th className="py-2.5 px-3">Día</th>
                            <th className="py-2.5 px-2">Fecha</th>
                            <th className="py-2.5 px-2">Profesores Activos</th>
                            <th className="py-2.5 px-2 text-center">Convocados</th>
                            <th className="py-2.5 px-2 text-center text-emerald-600 dark:text-emerald-400">
                              Presentes
                            </th>
                            <th className="py-2.5 px-2 text-center text-rose-600 dark:text-rose-400">
                              Ausentes
                            </th>
                            <th className="py-2.5 px-2 text-center text-amber-600 dark:text-amber-400">
                              Justificados
                            </th>
                            <th className="py-2.5 px-3 text-center">% Asistencia del Día</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                          {selectedWeek.weekDays.map((day) => {
                            const dayRecs = weeklyReconciledRecords.filter(
                              (r) => r.classDate === day.dateStr
                            );
                            const activeProfs = teachers.filter((t) =>
                              t.scheduleDays.includes(day.dayName)
                            );

                            let dPres = 0;
                            let dAus = 0;
                            let dJust = 0;
                            for (const r of dayRecs) {
                              if (r.status === 'presente') dPres++;
                              else if (r.status === 'ausente') dAus++;
                              else if (r.status === 'justificado') dJust++;
                            }

                            const dRate =
                              dayRecs.length > 0 ? Math.round((dPres / dayRecs.length) * 100) : 0;
                            const dayCapitalized =
                              day.dayName.charAt(0).toUpperCase() + day.dayName.slice(1);

                            return (
                              <tr
                                key={day.dateStr}
                                className="hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                              >
                                <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                                  {dayCapitalized}
                                </td>
                                <td className="py-2.5 px-2 text-slate-500">{day.dateStr}</td>
                                <td className="py-2.5 px-2 text-slate-600 dark:text-slate-300">
                                  {activeProfs.map((t) => t.shortName).join(', ') || 'Ninguno'}
                                </td>
                                <td className="py-2.5 px-2 text-center font-bold">
                                  {dayRecs.length}
                                </td>
                                <td className="py-2.5 px-2 text-center font-bold text-emerald-600 dark:text-emerald-400">
                                  {dPres}
                                </td>
                                <td className="py-2.5 px-2 text-center font-bold text-rose-600 dark:text-rose-400">
                                  {dAus}
                                </td>
                                <td className="py-2.5 px-2 text-center font-bold text-amber-600 dark:text-amber-400">
                                  {dJust}
                                </td>
                                <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                  {dayRecs.length > 0 ? (
                                    <AttendanceRatePill rate={dRate} />
                                  ) : (
                                    <span className="text-slate-400">Sin clases</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  /* Monthly Evolution by Weeks */
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                      <span>📈</span>
                      <span>Evolución Semanal del Mes ({selectedMonth.label})</span>
                    </h3>

                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                      <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                        <thead className="bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                          <tr>
                            <th className="py-2.5 px-3">Semana</th>
                            <th className="py-2.5 px-2">Rango de Fechas</th>
                            <th className="py-2.5 px-2 text-center">Sesiones Evaluadas</th>
                            <th className="py-2.5 px-2 text-center text-emerald-600 dark:text-emerald-400">
                              Presentes
                            </th>
                            <th className="py-2.5 px-2 text-center text-rose-600 dark:text-rose-400">
                              Ausentes
                            </th>
                            <th className="py-2.5 px-2 text-center text-amber-600 dark:text-amber-400">
                              Justificados
                            </th>
                            <th className="py-2.5 px-3 text-center">% Asistencia Semanal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                          {selectedMonth.weeks.map((week, idx) => {
                            const weekDates = new Set(week.weekDays.map((d) => d.dateStr));
                            const weekRecords = monthlyReconciledRecords.filter((r) =>
                              weekDates.has(r.classDate)
                            );

                            let wPres = 0;
                            let wAus = 0;
                            let wJust = 0;
                            for (const r of weekRecords) {
                              if (r.status === 'presente') wPres++;
                              else if (r.status === 'ausente') wAus++;
                              else if (r.status === 'justificado') wJust++;
                            }

                            const wTotal = weekRecords.length;
                            const wRate = wTotal > 0 ? Math.round((wPres / wTotal) * 100) : 0;

                            return (
                              <tr
                                key={week.label}
                                className="hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                              >
                                <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                                  Semana {idx + 1}
                                </td>
                                <td className="py-2.5 px-2 text-slate-500">
                                  {week.startDate} al {week.endDate}
                                </td>
                                <td className="py-2.5 px-2 text-center font-bold">{wTotal}</td>
                                <td className="py-2.5 px-2 text-center font-bold text-emerald-600 dark:text-emerald-400">
                                  {wPres}
                                </td>
                                <td className="py-2.5 px-2 text-center font-bold text-rose-600 dark:text-rose-400">
                                  {wAus}
                                </td>
                                <td className="py-2.5 px-2 text-center font-bold text-amber-600 dark:text-amber-400">
                                  {wJust}
                                </td>
                                <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                  {wTotal > 0 ? (
                                    <AttendanceRatePill rate={wRate} />
                                  ) : (
                                    <span className="text-slate-400">Sin clases evaluadas</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

/**
 * Small badge rendering attendance status for a given day in the weekly table
 */
function DayStatusBadge({
  isClassDay,
  record,
}: {
  isClassDay: boolean;
  record?: StudentAttendanceRecord;
}) {
  if (!isClassDay) {
    return <span className="text-slate-300 dark:text-slate-600 font-bold">—</span>;
  }

  if (!record || record.status === 'ausente') {
    const isAuto = record?.isAutomatic;
    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
          isAuto
            ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
            : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300'
        }`}
        title={isAuto ? 'Ausente Automático (sin registro al cierre)' : 'Ausente'}
      >
        <span>❌</span>
        <span>{isAuto ? 'Auto' : 'Aus.'}</span>
      </span>
    );
  }

  if (record.status === 'presente') {
    return (
      <span
        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300"
        title="Presente"
      >
        <span>✅</span>
        <span>Pres.</span>
      </span>
    );
  }

  if (record.status === 'justificado') {
    return (
      <span
        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300"
        title={record.notes || 'Justificado'}
      >
        <span>📝</span>
        <span>Just.</span>
      </span>
    );
  }

  return <span className="text-slate-400">—</span>;
}

/**
 * Progress pill showing attendance percentage
 */
function AttendanceRatePill({ rate }: { rate: number }) {
  let badgeClasses =
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
  if (rate < 50) {
    badgeClasses =
      'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800';
  } else if (rate < 80) {
    badgeClasses =
      'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800';
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black border ${badgeClasses}`}
    >
      {rate}%
    </span>
  );
}

export default WeeklyReportsView;
