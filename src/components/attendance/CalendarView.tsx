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
            className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center shadow-2xs"
            title="Presente"
          >
            ✓
          </span>
        );
      case 'ausente':
        return (
          <span
            className="w-5 h-5 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center shadow-2xs"
            title="Ausente"
          >
            ✗
          </span>
        );
      case 'justificado':
        return (
          <span
            className="w-5 h-5 rounded-full bg-amber-500 text-white text-[11px] font-bold flex items-center justify-center shadow-2xs"
            title="Justificado"
          >
            !
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-sm">
      {/* Month Header and Navigation Controls */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-800">
            {monthTitle}
          </h2>
          <p className="text-xs text-gray-400">
            Días asignados: {teacher.scheduleDays.join(', ')}
          </p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={goToToday}
            className="px-2.5 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition cursor-pointer"
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={prevMonth}
            className="w-8 h-8 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 flex items-center justify-center text-sm transition cursor-pointer"
            aria-label="Mes anterior"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="w-8 h-8 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 flex items-center justify-center text-sm transition cursor-pointer"
            aria-label="Mes siguiente"
          >
            ▶
          </button>
        </div>
      </div>

      {/* Weekday headers: L M X J V S D */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center">
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
              className={`text-xs font-bold py-1.5 rounded-md ${
                isWeekend ? 'text-gray-400 bg-gray-50' : 'text-gray-700 bg-gray-100/80'
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
            className="aspect-square min-h-[50px] sm:min-h-[64px] rounded-xl bg-gray-50/40 border border-transparent"
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
              className={`relative aspect-square min-h-[52px] sm:min-h-[68px] p-1 sm:p-1.5 rounded-xl border flex flex-col justify-between transition-all cursor-pointer text-left ${
                isTeaching
                  ? isCurrentSelected
                    ? 'bg-indigo-50 border-indigo-600 ring-2 ring-indigo-500/40 shadow-sm'
                    : 'bg-indigo-50/40 border-indigo-200 hover:bg-indigo-100/60 hover:border-indigo-300'
                  : isCurrentSelected
                  ? 'bg-gray-100 border-gray-400 ring-2 ring-gray-300'
                  : 'bg-white border-gray-100 text-gray-400 hover:bg-gray-50'
              } ${isCurrentToday ? 'ring-2 ring-blue-600 font-bold' : ''}`}
            >
              {/* Day Number and Today Marker */}
              <div className="flex items-center justify-between w-full">
                <span
                  className={`text-xs sm:text-sm font-semibold ${
                    isTeaching
                      ? 'text-gray-900 font-bold'
                      : 'text-gray-400 font-normal'
                  }`}
                >
                  {dayNumber}
                </span>

                {isCurrentToday && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-blue-600"
                    title="Hoy"
                  />
                )}
              </div>

              {/* Status Indicator */}
              <div className="flex items-center justify-center w-full py-0.5">
                {isTeaching ? (
                  isSplit ? (
                    // Split blocks: show indicators for each block
                    <div className="flex items-center justify-center gap-1">
                      {teacher.blocks.map((b) => {
                        const rec = dayRecords.find((r) => r.blockId === b.id);
                        if (rec) {
                          return (
                            <span
                              key={b.id}
                              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center ${
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
                            className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 border-gray-300 bg-white"
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
                        className="w-4 h-4 rounded-full border-2 border-gray-300 bg-white"
                        title="Programado - Sin registro"
                      />
                    )
                  )
                ) : (
                  // Blank for non-teaching days
                  <span className="h-4" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-center gap-3 sm:gap-5 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-full bg-emerald-500 text-white font-bold text-[10px] flex items-center justify-center">
            ✓
          </span>
          <span>Presente</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-full bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center">
            ✗
          </span>
          <span>Ausente</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-full bg-amber-500 text-white font-bold text-[10px] flex items-center justify-center">
            !
          </span>
          <span>Justificado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 bg-white" />
          <span>Pendiente</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-md border-2 border-blue-600 bg-white" />
          <span>Hoy</span>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
