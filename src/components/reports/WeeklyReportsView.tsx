import { useState, useMemo } from 'react';
import type { TeacherWithBlocks, Student, StudentAttendanceRecord, WeekRange } from '../../types';
import {
  getWeekRange,
  getAvailableWeeks,
  reconcileAllTeachersStudentAttendance,
  calculateStudentWeeklySummaries,
} from '../../utils/weeklyReports';
import {
  exportFullWeeklyReport,
  exportTeamTeacherReport,
  exportTeacherStudentsReport,
  exportGeneralConsolidatedReport,
} from '../../utils/excelExport';

interface WeeklyReportsViewProps {
  teachers: TeacherWithBlocks[];
  students: Student[];
  studentAttendanceRecords: StudentAttendanceRecord[];
  activeTeacher?: TeacherWithBlocks;
}

export function WeeklyReportsView({
  teachers,
  students,
  studentAttendanceRecords,
  activeTeacher,
}: WeeklyReportsViewProps) {
  const [today] = useState<Date>(() => new Date());

  // Available weeks list (8 past weeks, 2 future weeks)
  const availableWeeks = useMemo(() => getAvailableWeeks(today, 8, 2), [today]);
  const currentWeek = useMemo(() => getWeekRange(today), [today]);

  // Selected week state (defaults to current week)
  const [selectedWeekLabel, setSelectedWeekLabel] = useState<string>(currentWeek.label);

  const selectedWeek: WeekRange = useMemo(() => {
    return availableWeeks.find((w) => w.label === selectedWeekLabel) || currentWeek;
  }, [availableWeeks, selectedWeekLabel, currentWeek]);

  // Active preview tab: 'equipo' | 'profesor' | 'general'
  const [reportTab, setReportTab] = useState<'equipo' | 'profesor' | 'general'>('equipo');

  // Filters
  const [teacherFilter, setTeacherFilter] = useState<string>(activeTeacher ? activeTeacher.id : 'all');
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

  // Reconciled attendance records across all teachers for the selected week
  // CRITICAL RULE: Unregistered student attendance becomes 'ausente' with isAutomatic = true
  const reconciledRecords = useMemo(() => {
    return reconcileAllTeachersStudentAttendance({
      teachers,
      students,
      weekRange: selectedWeek,
      existingRecords: studentAttendanceRecords,
    });
  }, [teachers, students, selectedWeek, studentAttendanceRecords]);

  // Summaries per teacher
  const summariesByTeacher = useMemo(() => {
    const map = new Map<string, ReturnType<typeof calculateStudentWeeklySummaries>>();
    for (const t of teachers) {
      const summs = calculateStudentWeeklySummaries({
        teacher: t,
        students,
        weekRange: selectedWeek,
        reconciledRecords,
      });
      map.set(t.id, summs);
    }
    return map;
  }, [teachers, students, selectedWeek, reconciledRecords]);

  // Global consolidated KPIs
  const globalStats = useMemo(() => {
    let totalPresentes = 0;
    let totalAusentes = 0;
    let totalAutoAusentes = 0;
    let totalJustificados = 0;

    for (const r of reconciledRecords) {
      if (r.status === 'presente') totalPresentes++;
      else if (r.status === 'ausente') {
        totalAusentes++;
        if (r.isAutomatic) totalAutoAusentes++;
      } else if (r.status === 'justificado') {
        totalJustificados++;
      }
    }

    const totalEvals = reconciledRecords.length;
    const globalRate = totalEvals > 0 ? Math.round((totalPresentes / totalEvals) * 100) : 0;

    return {
      totalEvals,
      totalPresentes,
      totalAusentes,
      totalAutoAusentes,
      totalJustificados,
      globalRate,
    };
  }, [reconciledRecords]);

  // Robotics Teams Ranking
  const teamRanking = useMemo(() => {
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

    for (const r of reconciledRecords) {
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
  }, [students, reconciledRecords]);

  // Handle Export Downloads
  const triggerExport = (type: 'all' | 'team' | 'teacher' | 'general') => {
    setIsExporting(true);
    const opts = {
      teachers,
      students,
      studentRecords: studentAttendanceRecords,
      weekRange: selectedWeek,
      selectedTeacherId: teacherFilter !== 'all' ? teacherFilter : undefined,
    };

    setTimeout(() => {
      try {
        if (type === 'all') {
          exportFullWeeklyReport(opts);
          setExportNotice('✅ Archivo Excel completo con 3 hojas descargado con éxito.');
        } else if (type === 'team') {
          exportTeamTeacherReport(opts);
          setExportNotice('✅ Reporte "Por Equipo y Profesor" descargado.');
        } else if (type === 'teacher') {
          exportTeacherStudentsReport(opts);
          setExportNotice('✅ Reporte "Alumnos por Profesor" descargado.');
        } else if (type === 'general') {
          exportGeneralConsolidatedReport(opts);
          setExportNotice('✅ Reporte "General Consolidado CBA" descargado.');
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

  // Filtered teachers list for Report 1 & 2
  const visibleTeachers = useMemo(() => {
    if (teacherFilter === 'all') return teachers;
    return teachers.filter((t) => t.id === teacherFilter);
  }, [teachers, teacherFilter]);

  return (
    <div className="space-y-6">
      {/* 1. Header Card with Week Selector & Primary Excel Export Button */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 rounded-xl text-xl">
                📊
              </span>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  Reportes Semanales y Exportación Excel
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Consolidado semanal CBA con 3 informes oficiales y cierre automático de inasistencias.
                </p>
              </div>
            </div>
          </div>

          {/* Week Selector Dropdown + Current Week Button */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label
                htmlFor="week-select"
                className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap"
              >
                Semana:
              </label>
              <select
                id="week-select"
                value={selectedWeekLabel}
                onChange={(e) => setSelectedWeekLabel(e.target.value)}
                className="flex-1 sm:w-64 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs sm:text-sm rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              >
                {availableWeeks.map((w) => (
                  <option key={w.label} value={w.label}>
                    {w.label} {w.label === currentWeek.label ? '⭐ (Actual)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setSelectedWeekLabel(currentWeek.label)}
              className="text-xs font-semibold px-2.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition cursor-pointer border border-slate-200 dark:border-slate-700"
              title="Volver a la semana en curso"
            >
              Semana Actual
            </button>
          </div>
        </div>

        {/* Business Rule Banner */}
        <div className="mt-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
          <span className="text-base leading-none">⚡</span>
          <div>
            <strong className="font-semibold">Regla de Cierre de Semana Automático:</strong> Todo alumno
            inscrito que no haya tenido registro explícito de asistencia en el día programado de su
            profesor es asignado automáticamente como{' '}
            <span className="inline-flex items-center px-1.5 py-0.2 rounded font-bold bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100">
              Ausente (Automático)
            </span>
            . Las 3 hojas de cálculo y vistas previas reflejan este balance reconciliado.
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
            <span>Descargar Excel Completo (.xlsx)</span>
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
              className="text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>

      {/* 2. Interactive Navigation Tabs for the 3 Reports */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto pb-1" aria-label="Pestañas de Reportes">
          <button
            type="button"
            onClick={() => setReportTab('equipo')}
            className={`py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition cursor-pointer border ${
              reportTab === 'equipo'
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850'
            }`}
          >
            📗 1. Por Equipo y Profesor
          </button>
          <button
            type="button"
            onClick={() => setReportTab('profesor')}
            className={`py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition cursor-pointer border ${
              reportTab === 'profesor'
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850'
            }`}
          >
            📘 2. Alumnos por Profesor
          </button>
          <button
            type="button"
            onClick={() => setReportTab('general')}
            className={`py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition cursor-pointer border ${
              reportTab === 'general'
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850'
            }`}
          >
            📙 3. General Semanal CBA
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
          {visibleTeachers.map((teacher) => {
            const rawSummaries = summariesByTeacher.get(teacher.id) || [];
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

            if (summaries.length === 0) {
              return null;
            }

            // Group by teamName
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
                {/* Teacher Group Header */}
                <div className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
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

                {/* Teams Subsections */}
                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                  {Array.from(teamGroups.entries()).map(([teamName, studentItems]) => (
                    <div key={teamName} className="p-4 sm:p-6 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">🤖</span>
                          <h4 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                            Equipo: <span className="text-blue-600 dark:text-blue-400">{teamName}</span>
                          </h4>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            ({studentItems.length} integrantes)
                          </span>
                        </div>
                      </div>

                      {/* Responsive Table */}
                      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                        <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                          <thead className="bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                            <tr>
                              <th className="py-2.5 px-3">Alumno</th>
                              <th className="py-2.5 px-2">Cédula</th>
                              <th className="py-2.5 px-2">Horario / Bloque</th>
                              {selectedWeek.weekDays.map((d) => (
                                <th key={d.dateStr} className="py-2.5 px-2 text-center">
                                  {d.dayName.slice(0, 3)} {d.dateStr.slice(8)}
                                </th>
                              ))}
                              <th className="py-2.5 px-2 text-center">Clases</th>
                              <th className="py-2.5 px-2 text-center text-emerald-600 dark:text-emerald-400">
                                Asist.
                              </th>
                              <th className="py-2.5 px-2 text-center text-rose-600 dark:text-rose-400">
                                Inasist.
                              </th>
                              <th className="py-2.5 px-3 text-center">% Asistencia</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                            {studentItems.map((item) => (
                              <tr
                                key={item.student.id}
                                className="hover:bg-slate-50/80 dark:hover:bg-slate-850/60 transition"
                              >
                                <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                                  {item.student.fullName}
                                </td>
                                <td className="py-2.5 px-2 text-slate-500 whitespace-nowrap">
                                  {item.student.identifier || '—'}
                                </td>
                                <td className="py-2.5 px-2 text-slate-500 whitespace-nowrap">
                                  {item.blockLabel || teacher.blocks[0]?.label || 'Regular'}
                                </td>
                                {selectedWeek.weekDays.map((d) => {
                                  const isClassDay = teacher.scheduleDays.includes(d.dayName);
                                  const rec = item.recordsByDate[d.dateStr];
                                  return (
                                    <td key={d.dateStr} className="py-2.5 px-2 text-center">
                                      <DayStatusBadge
                                        isClassDay={isClassDay}
                                        record={rec}
                                      />
                                    </td>
                                  );
                                })}
                                <td className="py-2.5 px-2 text-center font-bold">
                                  {item.totalClasses}
                                </td>
                                <td className="py-2.5 px-2 text-center font-bold text-emerald-600 dark:text-emerald-400">
                                  {item.presentes}
                                </td>
                                <td className="py-2.5 px-2 text-center font-bold text-rose-600 dark:text-rose-400">
                                  {item.ausentes}
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
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ALUMNOS POR PROFESOR */}
      {/* ========================================================================= */}
      {reportTab === 'profesor' && (
        <div className="space-y-6">
          {visibleTeachers.map((teacher) => {
            const rawSummaries = summariesByTeacher.get(teacher.id) || [];
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
                {/* Teacher Header */}
                <div className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                      <span>👨‍🏫</span>
                      <span>{teacher.name}</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Días programados: {teacher.scheduleDays.join(' y ')} • Horario:{' '}
                      {teacher.blocks.map((b) => b.label).join(' | ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {summaries.length} Alumnos
                    </span>
                  </div>
                </div>

                {/* Table of all students under this teacher */}
                <div className="p-4 sm:p-6">
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">Alumno</th>
                          <th className="py-2.5 px-2">Cédula</th>
                          <th className="py-2.5 px-2">Equipo</th>
                          <th className="py-2.5 px-2">Bloque / Turno</th>
                          {selectedWeek.weekDays.map((d) => (
                            <th key={d.dateStr} className="py-2.5 px-2 text-center">
                              {d.dayName.slice(0, 3)} {d.dateStr.slice(8)}
                            </th>
                          ))}
                          <th className="py-2.5 px-2 text-center">Total Clases</th>
                          <th className="py-2.5 px-2 text-center text-emerald-600 dark:text-emerald-400">
                            Presentes
                          </th>
                          <th className="py-2.5 px-2 text-center text-rose-600 dark:text-rose-400">
                            Ausencias
                          </th>
                          <th className="py-2.5 px-2 text-center text-amber-600 dark:text-amber-400">
                            Justif.
                          </th>
                          <th className="py-2.5 px-3 text-center">% Cumplimiento</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                        {summaries.map((item) => (
                          <tr
                            key={item.student.id}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-850/60 transition"
                          >
                            <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                              {item.student.fullName}
                            </td>
                            <td className="py-2.5 px-2 text-slate-500 whitespace-nowrap">
                              {item.student.identifier || '—'}
                            </td>
                            <td className="py-2.5 px-2 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {item.teamName}
                              </span>
                            </td>
                            <td className="py-2.5 px-2 text-slate-500 whitespace-nowrap">
                              {item.blockLabel || teacher.blocks[0]?.label || 'Regular'}
                            </td>
                            {selectedWeek.weekDays.map((d) => {
                              const isClassDay = teacher.scheduleDays.includes(d.dayName);
                              const rec = item.recordsByDate[d.dateStr];
                              return (
                                <td key={d.dateStr} className="py-2.5 px-2 text-center">
                                  <DayStatusBadge isClassDay={isClassDay} record={rec} />
                                </td>
                              );
                            })}
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
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: GENERAL SEMANAL (CONSOLIDADO CBA) */}
      {/* ========================================================================= */}
      {reportTab === 'general' && (
        <div className="space-y-6">
          {/* Top KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Global Attendance Rate */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Asistencia Global CBA
                </span>
                <span className="p-2 bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 rounded-xl text-lg">
                  🎯
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 dark:text-white">
                  {globalStats.globalRate}%
                </span>
                <span className="text-xs text-slate-500">en la semana</span>
              </div>
              <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    globalStats.globalRate >= 80
                      ? 'bg-emerald-500'
                      : globalStats.globalRate >= 60
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${globalStats.globalRate}%` }}
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
                {globalStats.totalEvals} sesiones/clases evaluadas
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
                  {globalStats.totalPresentes}
                </span>
                <span className="text-xs text-slate-500">presentes</span>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                {globalStats.totalJustificados} justificados registrados
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
                  {globalStats.totalAusentes}
                </span>
                <span className="text-xs text-slate-500">ausencias</span>
              </div>
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
                {globalStats.totalAutoAusentes} por cierre automático
              </p>
            </div>
          </div>

          {/* Robotics Teams Ranking Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏆</span>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Ranking y Desempeño por Equipos de Robótica
                </h3>
              </div>
              <span className="text-xs text-slate-500">Ordenado por % de Asistencia</span>
            </div>

            <div className="space-y-3">
              {teamRanking.map((team, index) => {
                const rankColor =
                  index === 0
                    ? 'text-amber-500 bg-amber-100 dark:bg-amber-950'
                    : index === 1
                    ? 'text-slate-400 bg-slate-200 dark:bg-slate-800'
                    : index === 2
                    ? 'text-amber-700 bg-amber-100 dark:bg-amber-950'
                    : 'text-slate-500 bg-slate-100 dark:bg-slate-850';

                return (
                  <div
                    key={team.name}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
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
                          {team.studentCount} Alumnos • {team.sessions} Sesiones • {team.presentes}{' '}
                          Presentes • {team.ausentes} Ausentes
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
              <span>Rendimiento por Profesor CBA</span>
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
                    <th className="py-2.5 px-3 text-center">% Asistencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {teachers.map((teacher) => {
                    const tRecs = reconciledRecords.filter((r) => r.teacherId === teacher.id);
                    const tStudents = students.filter((s) => s.teacherId === teacher.id);
                    let tPres = 0;
                    let tAus = 0;
                    for (const r of tRecs) {
                      if (r.status === 'presente') tPres++;
                      else if (r.status === 'ausente') tAus++;
                    }
                    const tRate = tRecs.length > 0 ? Math.round((tPres / tRecs.length) * 100) : 0;

                    return (
                      <tr key={teacher.id} className="hover:bg-slate-50 dark:hover:bg-slate-850 transition">
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                          {teacher.name}
                        </td>
                        <td className="py-2.5 px-2 text-slate-500">
                          {teacher.scheduleDays.join(' y ')}
                        </td>
                        <td className="py-2.5 px-2 text-slate-500">
                          {teacher.blocks.map((b) => b.label).join(' | ')}
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold">
                          {tStudents.length}
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold">
                          {tRecs.length}
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-emerald-600 dark:text-emerald-400">
                          {tPres}
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-rose-600 dark:text-rose-400">
                          {tAus}
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

          {/* Daily Breakdown (Lunes a Viernes) */}
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
                    const dayRecs = reconciledRecords.filter((r) => r.classDate === day.dateStr);
                    const activeProfs = teachers.filter((t) => t.scheduleDays.includes(day.dayName));

                    let dPres = 0;
                    let dAus = 0;
                    let dJust = 0;
                    for (const r of dayRecs) {
                      if (r.status === 'presente') dPres++;
                      else if (r.status === 'ausente') dAus++;
                      else if (r.status === 'justificado') dJust++;
                    }

                    const dRate = dayRecs.length > 0 ? Math.round((dPres / dayRecs.length) * 100) : 0;
                    const dayCapitalized =
                      day.dayName.charAt(0).toUpperCase() + day.dayName.slice(1);

                    return (
                      <tr key={day.dateStr} className="hover:bg-slate-50 dark:hover:bg-slate-850 transition">
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                          {dayCapitalized}
                        </td>
                        <td className="py-2.5 px-2 text-slate-500">{day.dateStr}</td>
                        <td className="py-2.5 px-2 text-slate-600 dark:text-slate-300">
                          {activeProfs.map((t) => t.shortName).join(', ') || 'Ninguno'}
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold">{dayRecs.length}</td>
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
  let badgeClasses = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
  if (rate < 50) {
    badgeClasses = 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800';
  } else if (rate < 80) {
    badgeClasses = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800';
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
