import React, { useState } from 'react';
import type { TeacherWithBlocks, AttendanceRecord, AttendanceStatus } from '../../types';
import { isTeachingDay, formatDate } from '../../utils/schedule';

interface CalendarViewProps {
  teacher: TeacherWithBlocks;
  attendanceRecords: AttendanceRecord[];
  onSelectDate: (date: Date) => void;
  selectedDate?: Date;
  initialMonth?: Date;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  teacher,
  attendanceRecords,
  onSelectDate,
  selectedDate,
  initialMonth,
}) => {
  const [currentViewDate, setCurrentViewDate] = useState<Date>(() =>
    initialMonth ? new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1) : new Date(),
  );

  const [today] = useState(() => new Date());
  const year = currentViewDate.getFullYear();
  const month = currentViewDate.getMonth(); // 0-indexed

  const todayStr = formatDate(today);
  const selectedStr = selectedDate ? formatDate(selectedDate) : null;

  // Month navigation
  const prevMonth = () => {
    setCurrentViewDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentViewDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
    onSelectDate(now);
  };

  // Month title formatted in Spanish (e.g. "Noviembre de 2026")
  const rawMonthName = new Intl.DateTimeFormat('es-ES', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month, 1));
  const monthTitle = rawMonthName.charAt(0).toUpperCase() + rawMonthName.slice(1);

  // Calendar math (Monday to Sunday)
  // getDay(): Sunday=0, Monday=1, ..., Saturday=6
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  // Monday = 0 offset, Sunday = 6 offset
  const mondayOffset = (firstDayOfWeek + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const isSplit = teacher.blockType === 'split';

  const renderStatusSymbol = (status: AttendanceStatus) => {
    switch (status) {
      case 'presente':
        return (
          <span
            className="w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-full bg-emerald-500 text-white text-[9px] sm:text-[11px] font-bold flex items-center justify-center shadow-2xs shrink-0"
            title="Presente"
          >
            ✓
          </span>
        );
      case 'ausente':
        return (
          <span
            className="w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-full bg-rose-500 text-white text-[9px] sm:text-[11px] font-bold flex items-center justify-center shadow-2xs shrink-0"
            title="Ausente"
          >
            ✗
          </span>
        );
      case 'justificado':
        return (
          <span
            className="w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-full bg-amber-500 text-white text-[9px] sm:text-[11px] font-bold flex items-center justify-center shadow-2xs shrink-0"
            title="Justificado"
          >
            !
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-2.5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
      {/* Month Header and Navigation Controls */}
      <div className="flex items-center justify-between mb-3 sm:mb-4 px-0.5 sm:px-0">
        <div>
          <h2 className="text-base sm:text-xl font-bold text-slate-800 dark:text-white">
            {monthTitle}
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500">
            Días asignados: <span className="font-medium text-slate-600 dark:text-slate-300">{teacher.scheduleDays.join(', ')}</span>
          </p>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={goToToday}
            className="px-2 sm:px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg border border-blue-200 dark:border-blue-800 transition cursor-pointer min-h-[34px] flex items-center justify-center touch-manipulation"
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={prevMonth}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs sm:text-sm transition cursor-pointer touch-manipulation"
            aria-label="Mes anterior"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs sm:text-sm transition cursor-pointer touch-manipulation"
            aria-label="Mes siguiente"
          >
            ▶
          </button>
        </div>
      </div>

      {/* Weekday headers: L M X J V S D */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1.5 sm:mb-2 text-center">
        {[
          { key: 'L', label: 'Lunes' },
          { key: 'M', label: 'Martes' },
          { key: 'X', label: 'Miércoles' },
          { key: 'J', label: 'Jueves' },
          { key: 'V', label: 'Viernes' },
          { key: 'S', label: 'Sábado' },
          { key: 'D', label: 'Domingo' },
        ].map((day, idx) => {
          const isWeekend = idx >= 5;
          return (
            <div
              key={day.key}
              title={day.label}
              className={`text-[10px] sm:text-xs font-bold py-1 sm:py-1.5 rounded-md ${
                isWeekend
                  ? 'text-slate-400 dark:text-slate-600 bg-slate-50 dark:bg-slate-800/40'
                  : 'text-slate-700 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-800'
              }`}
            >
              {day.key}
            </div>
          );
        })}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {/* Leading empty cells */}
        {Array.from({ length: mondayOffset }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="aspect-square min-h-[44px] sm:min-h-[64px] rounded-lg sm:rounded-xl bg-slate-50/40 dark:bg-slate-800/20 border border-transparent"
          />
        ))}

        {/* Month days */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNumber = i + 1;
          const dayDate = new Date(year, month, dayNumber);
          const dateStr = formatDate(dayDate);
          const isTeaching = isTeachingDay(teacher, dayDate);
          const isCurrentToday = dateStr === todayStr;
          const isCurrentSelected = dateStr === selectedStr;

          // Records for this day & teacher
          const dayRecords = attendanceRecords.filter(
            (r) => r.teacherId === teacher.id && r.classDate === dateStr,
          );

          return (
            <button
              key={`day-${dayNumber}`}
              type="button"
              onClick={() => onSelectDate(dayDate)}
              className={`relative aspect-square min-h-[44px] sm:min-h-[68px] p-0.5 sm:p-1.5 rounded-lg sm:rounded-xl border flex flex-col justify-between transition-all cursor-pointer text-left touch-manipulation ${
                isTeaching
                  ? isCurrentSelected
                    ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-600 dark:border-blue-500 ring-2 ring-blue-500/40 shadow-sm'
                    : 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50 hover:bg-blue-100/60 dark:hover:bg-blue-900/40 hover:border-blue-300 dark:hover:border-blue-700'
                  : isCurrentSelected
                  ? 'bg-slate-100 dark:bg-slate-800 border-slate-400 dark:border-slate-600 ring-2 ring-slate-300 dark:ring-slate-700'
                  : 'bg-white dark:bg-slate-900/50 border-slate-100 dark:border-slate-800/60 text-slate-400 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              } ${isCurrentToday ? 'ring-2 ring-blue-500 font-bold' : ''}`}
            >
              {/* Day Number and Today Marker */}
              <div className="flex items-center justify-between w-full px-0.5">
                <span
                  className={`text-[11px] sm:text-sm font-semibold leading-none ${
                    isTeaching
                      ? 'text-slate-900 dark:text-slate-100 font-bold'
                      : 'text-slate-400 dark:text-slate-600 font-normal'
                  }`}
                >
                  {dayNumber}
                </span>

                {isCurrentToday && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"
                    title="Hoy"
                  />
                )}
              </div>

              {/* Status Indicator */}
              <div className="flex items-center justify-center w-full py-0.5">
                {isTeaching ? (
                  isSplit ? (
                    // Split blocks: show indicators for each block
                    <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                      {teacher.blocks.map((b) => {
                        const rec = dayRecords.find((r) => r.blockId === b.id);
                        if (rec) {
                          return (
                            <span
                              key={b.id}
                              className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full text-[8px] sm:text-[9px] font-bold text-white flex items-center justify-center shrink-0 ${
                                rec.status === 'presente'
                                  ? 'bg-emerald-500'
                                  : rec.status === 'ausente'
                                  ? 'bg-rose-500'
                                  : 'bg-amber-500'
                              }`}
                              title={`${b.label}: ${rec.status}`}
                            >
                              {rec.status === 'presente'
                                ? '✓'
                                : rec.status === 'ausente'
                                ? '✗'
                                : '!'}
                            </span>
                          );
                        }
                        // Scheduled but no record yet
                        return (
                          <span
                            key={b.id}
                            className="w-3 h-3 sm:w-4 sm:h-4 rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 shrink-0"
                            title={`${b.label}: Pendiente`}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    // Continuous block: single indicator
                    dayRecords.length > 0 ? (
                      renderStatusSymbol(dayRecords[0].status)
                    ) : (
                      <span
                        className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 shrink-0"
                        title="Programado - Sin registro"
                      />
                    )
                  )
                ) : (
                  // Blank for non-teaching days
                  <span className="h-3.5 sm:h-4" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-center gap-2 sm:gap-5 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1 sm:gap-1.5">
          <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-emerald-500 text-white font-bold text-[9px] sm:text-[10px] flex items-center justify-center shrink-0">
            ✓
          </span>
          <span>Presente</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-1.5">
          <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-rose-500 text-white font-bold text-[9px] sm:text-[10px] flex items-center justify-center shrink-0">
            ✗
          </span>
          <span>Ausente</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-1.5">
          <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-amber-500 text-white font-bold text-[9px] sm:text-[10px] flex items-center justify-center shrink-0">
            !
          </span>
          <span>Justificado</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-1.5">
          <span className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 shrink-0" />
          <span>Pendiente</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-1.5">
          <span className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-md border-2 border-blue-500 bg-white dark:bg-slate-800 shrink-0" />
          <span>Hoy</span>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
