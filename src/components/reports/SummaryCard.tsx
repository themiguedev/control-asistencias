import React from 'react';
import type { TeacherWithBlocks, AttendanceRecord } from '../../types';
import { getMonthDays, isTeachingDay } from '../../utils/schedule';

interface SummaryCardProps {
  teacher: TeacherWithBlocks;
  records: AttendanceRecord[];
  month: Date;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  teacher,
  records,
  month,
}) => {
  const year = month.getFullYear();
  const monthIndex = month.getMonth(); // 0-indexed
  const monthNumber = monthIndex + 1; // 1-indexed for schedule.ts getMonthDays

  // Get month label in Spanish
  const rawMonthName = new Intl.DateTimeFormat('es-ES', {
    month: 'long',
    year: 'numeric',
  }).format(month);
  const formattedMonth =
    rawMonthName.charAt(0).toUpperCase() + rawMonthName.slice(1);

  // Teaching days scheduled for this month
  const monthDays = getMonthDays(year, monthNumber);
  const scheduledDays = monthDays.filter((d) => isTeachingDay(teacher, d));
  const scheduledDaysCount = scheduledDays.length;

  // Expected total class sessions (each block is a session)
  const totalSessionsExpected =
    teacher.blockType === 'split'
      ? scheduledDaysCount * teacher.blocks.length
      : scheduledDaysCount;

  // Filter attendance records for this teacher in this month
  const monthPrefix = `${year}-${String(monthNumber).padStart(2, '0')}`;
  const monthRecords = records.filter(
    (r) => r.teacherId === teacher.id && r.classDate.startsWith(monthPrefix),
  );

  const presentCount = monthRecords.filter((r) => r.status === 'presente').length;
  const absentCount = monthRecords.filter((r) => r.status === 'ausente').length;
  const justifiedCount = monthRecords.filter((r) => r.status === 'justificado').length;

  const registeredTotal = presentCount + absentCount + justifiedCount;

  // Calculate percentage:
  // Attendance percentage based on registered classes (or total scheduled if desired)
  const attendanceRate =
    registeredTotal > 0
      ? Math.round((presentCount / registeredTotal) * 100)
      : 0;

  // Visual bar percentages relative to expected total
  const baseTotal = totalSessionsExpected > 0 ? totalSessionsExpected : 1;
  const pctPresent = Math.min(100, Math.round((presentCount / baseTotal) * 100));
  const pctJustified = Math.min(100 - pctPresent, Math.round((justifiedCount / baseTotal) * 100));
  const pctAbsent = Math.min(100 - pctPresent - pctJustified, Math.round((absentCount / baseTotal) * 100));

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3.5 sm:pb-4 mb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
        <div>
          <span className="text-[11px] sm:text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            Resumen Mensual
          </span>
          <h3 className="text-base sm:text-xl font-bold text-slate-800 dark:text-white">
            {formattedMonth}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Estadísticas para {teacher.name}
          </p>
        </div>

        {/* Big percentage pill */}
        <div className="flex items-center justify-between sm:justify-end gap-3 bg-blue-50 dark:bg-blue-950/40 px-3.5 py-2 sm:px-4 sm:py-2 rounded-2xl border border-blue-100 dark:border-blue-900/40 w-full sm:w-auto">
          <div className="sm:text-right flex items-center sm:block gap-2 sm:gap-0 justify-between w-full sm:w-auto">
            <span className="text-xs sm:hidden font-semibold text-blue-700 dark:text-blue-400">
              Asistencia efectiva:
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-blue-700 dark:text-blue-400 leading-none">
              {attendanceRate}%
            </div>
            <span className="hidden sm:inline-block text-[10px] uppercase font-semibold text-blue-500 dark:text-blue-400 mt-0.5">
              Asistencia efectiva
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar Visualizer */}
      <div className="mb-4 sm:mb-5">
        <div className="flex flex-col min-[380px]:flex-row min-[380px]:items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium gap-1">
          <span>
            Progreso <span className="hidden sm:inline">mensual</span> ({registeredTotal} de {totalSessionsExpected} sesiones)
          </span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">{pctPresent}% asistidas</span>
        </div>
        <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex shadow-inner">
          <div
            style={{ width: `${pctPresent}%` }}
            className="bg-emerald-500 transition-all duration-500"
            title={`Presente: ${presentCount}`}
          />
          <div
            style={{ width: `${pctJustified}%` }}
            className="bg-amber-400 transition-all duration-500"
            title={`Justificado: ${justifiedCount}`}
          />
          <div
            style={{ width: `${pctAbsent}%` }}
            className="bg-rose-500 transition-all duration-500"
            title={`Ausente: ${absentCount}`}
          />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {/* Scheduled classes */}
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5 sm:p-3 border border-slate-100 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1 mb-1 truncate">
            <span>📅</span>
            <span>Clases prog.</span>
          </div>
          <div className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white">
            {scheduledDaysCount}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
            {teacher.blockType === 'split'
              ? `${totalSessionsExpected} sesiones (2x día)`
              : 'días programados'}
          </div>
        </div>

        {/* Present */}
        <div className="bg-emerald-50/60 dark:bg-emerald-950/20 rounded-xl p-2.5 sm:p-3 border border-emerald-100 dark:border-emerald-900/30">
          <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1 mb-1 truncate">
            <span>✓</span>
            <span>Asistencias</span>
          </div>
          <div className="text-lg sm:text-xl font-bold text-emerald-700 dark:text-emerald-400">
            {presentCount}
          </div>
          <div className="text-[10px] text-emerald-600/80 dark:text-emerald-500/80 mt-0.5 truncate">
            sesiones presentes
          </div>
        </div>

        {/* Absent */}
        <div className="bg-rose-50/60 dark:bg-rose-950/20 rounded-xl p-2.5 sm:p-3 border border-rose-100 dark:border-rose-900/30">
          <div className="text-xs text-rose-700 dark:text-rose-400 font-medium flex items-center gap-1 mb-1 truncate">
            <span>✗</span>
            <span>Ausencias</span>
          </div>
          <div className="text-lg sm:text-xl font-bold text-rose-700 dark:text-rose-400">
            {absentCount}
          </div>
          <div className="text-[10px] text-rose-600/80 dark:text-rose-500/80 mt-0.5 truncate">
            inasistencias
          </div>
        </div>

        {/* Justified */}
        <div className="bg-amber-50/60 dark:bg-amber-950/20 rounded-xl p-2.5 sm:p-3 border border-amber-100 dark:border-amber-900/30">
          <div className="text-xs text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1 mb-1 truncate">
            <span>!</span>
            <span>Justificadas</span>
          </div>
          <div className="text-lg sm:text-xl font-bold text-amber-700 dark:text-amber-400">
            {justifiedCount}
          </div>
          <div className="text-[10px] text-amber-600/80 dark:text-amber-500/80 mt-0.5 truncate">
            permisos validados
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryCard;
