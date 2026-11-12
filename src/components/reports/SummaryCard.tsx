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
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 mb-4 border-b border-gray-100 gap-2">
        <div>
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
            Resumen Mensual
          </span>
          <h3 className="text-lg sm:text-xl font-bold text-gray-800">
            {formattedMonth}
          </h3>
          <p className="text-xs text-gray-500">
            Estadísticas de cumplimiento para {teacher.name}
          </p>
        </div>

        {/* Big percentage pill */}
        <div className="flex items-center gap-3 bg-indigo-50/80 px-4 py-2 rounded-2xl border border-indigo-100 self-start sm:self-auto">
          <div className="text-right">
            <div className="text-2xl sm:text-3xl font-extrabold text-indigo-700 leading-none">
              {attendanceRate}%
            </div>
            <span className="text-[10px] uppercase font-semibold text-indigo-500">
              Asistencia efectiva
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar Visualizer */}
      <div className="mb-5">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5 font-medium">
          <span>Progreso mensual de clases ({registeredTotal} de {totalSessionsExpected} sesiones)</span>
          <span>{pctPresent}% asistidas</span>
        </div>
        <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden flex shadow-inner">
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Scheduled classes */}
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
          <div className="text-xs text-gray-500 font-medium flex items-center gap-1 mb-1">
            <span>📅</span>
            <span>Clases prog.</span>
          </div>
          <div className="text-xl font-bold text-gray-800">
            {scheduledDaysCount}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            {teacher.blockType === 'split'
              ? `${totalSessionsExpected} sesiones (2x día)`
              : 'días programados'}
          </div>
        </div>

        {/* Present */}
        <div className="bg-emerald-50/60 rounded-xl p-3 border border-emerald-100">
          <div className="text-xs text-emerald-700 font-medium flex items-center gap-1 mb-1">
            <span>✓</span>
            <span>Asistencias</span>
          </div>
          <div className="text-xl font-bold text-emerald-700">
            {presentCount}
          </div>
          <div className="text-[10px] text-emerald-600/80 mt-0.5">
            sesiones presentes
          </div>
        </div>

        {/* Absent */}
        <div className="bg-rose-50/60 rounded-xl p-3 border border-rose-100">
          <div className="text-xs text-rose-700 font-medium flex items-center gap-1 mb-1">
            <span>✗</span>
            <span>Ausencias</span>
          </div>
          <div className="text-xl font-bold text-rose-700">
            {absentCount}
          </div>
          <div className="text-[10px] text-rose-600/80 mt-0.5">
            inasistencias
          </div>
        </div>

        {/* Justified */}
        <div className="bg-amber-50/60 rounded-xl p-3 border border-amber-100">
          <div className="text-xs text-amber-700 font-medium flex items-center gap-1 mb-1">
            <span>!</span>
            <span>Justificadas</span>
          </div>
          <div className="text-xl font-bold text-amber-700">
            {justifiedCount}
          </div>
          <div className="text-[10px] text-amber-600/80 mt-0.5">
            permisos validados
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryCard;
