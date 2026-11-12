import React, { useState } from 'react';
import type {
  TeacherWithBlocks,
  AttendanceStatus,
  AttendanceRecord,
  DayOfWeek,
  Block,
} from '../../types';
import { isTeachingDay, formatDate, getDayName, formatTimeRange12h } from '../../utils/schedule';
import { StatusBadge } from './StatusBadge';

export interface NewAttendanceRecordData {
  teacherId: string;
  blockId: string | null;
  classDate: string;
  dayName: DayOfWeek;
  status: AttendanceStatus;
  notes: string;
}

interface AttendanceFormProps {
  teacher: TeacherWithBlocks;
  date: Date;
  existingRecords?: AttendanceRecord[];
  onSubmit: (records: NewAttendanceRecordData[]) => void;
  onDeleteAttendance?: (teacherId: string, classDate: string) => void;
}

interface BlockState {
  status: AttendanceStatus;
  notes: string;
}

export const AttendanceForm: React.FC<AttendanceFormProps> = ({
  teacher,
  date,
  existingRecords = [],
  onSubmit,
  onDeleteAttendance,
}) => {
  const dateStr = formatDate(date);
  const isValidClassDay = isTeachingDay(teacher, date);

  // Format date display for user: e.g. "Martes, 10 de noviembre de 2026"
  const formattedDateTitle = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
  const capitalizedDateTitle =
    formattedDateTitle.charAt(0).toUpperCase() + formattedDateTitle.slice(1);

  // Map each block of the teacher to local state or existing record
  const [blockStates, setBlockStates] = useState<Record<string, BlockState>>(() => {
    const initialStates: Record<string, BlockState> = {};
    teacher.blocks.forEach((block) => {
      const found = existingRecords.find(
        (r) =>
          r.teacherId === teacher.id &&
          r.classDate === dateStr &&
          (r.blockId === block.id || (!r.blockId && teacher.blocks.length === 1)),
      );

      initialStates[block.id] = {
        status: found ? found.status : 'presente',
        notes: found ? found.notes : '',
      };
    });
    return initialStates;
  });

  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);

  if (!isValidClassDay) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm text-center transition-colors">
        <div className="w-14 h-14 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl">
          📅
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">
          No hay clase programada para hoy
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-3">
          El profesor <strong className="text-slate-700 dark:text-slate-200">{teacher.name}</strong> imparte
          clases los días{' '}
          <strong className="text-blue-600 dark:text-blue-400">
            {teacher.scheduleDays.join(' y ')}
          </strong>
          .
        </p>
        <span className="inline-block text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
          Fecha seleccionada: {capitalizedDateTitle}
        </span>
      </div>
    );
  }

  // Check if all blocks already have a saved record
  const existingRecordsForDay = existingRecords.filter(
    (r) => r.teacherId === teacher.id && r.classDate === dateStr,
  );
  const isAlreadyRegistered =
    teacher.blocks.length > 0 &&
    teacher.blocks.every((b) =>
      existingRecordsForDay.some(
        (r) => r.blockId === b.id || (!r.blockId && teacher.blocks.length === 1),
      ),
    );

  const handleStatusChange = (blockId: string, status: AttendanceStatus) => {
    setBlockStates((prev) => ({
      ...prev,
      [blockId]: {
        notes: '',
        status,
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAlreadyRegistered) return;

    const dayName = getDayName(date);
    const recordsToSave: NewAttendanceRecordData[] = teacher.blocks.map((block) => {
      const state = blockStates[block.id] || { status: 'presente', notes: '' };
      return {
        teacherId: teacher.id,
        blockId: block.id,
        classDate: dateStr,
        dayName,
        status: state.status,
        notes: '',
      };
    });

    onSubmit(recordsToSave);
    setIsSubmittedSuccess(true);
  };

  const isSplit = teacher.blockType === 'split';

  const renderStatusRadioOptions = (block: Block, currentStatus: AttendanceStatus) => {
    const options: {
      status: AttendanceStatus;
      label: string;
      activeClass: string;
      icon: string;
    }[] = [
      {
        status: 'presente',
        label: 'Presente',
        activeClass:
          'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-200',
        icon: '✓',
      },
      {
        status: 'ausente',
        label: 'Ausente',
        activeClass:
          'bg-rose-500 text-white border-rose-500 shadow-sm shadow-rose-200',
        icon: '✗',
      },
      {
        status: 'justificado',
        label: 'Justificado',
        activeClass:
          'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-200',
        icon: '!',
      },
    ];

    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
        {options.map((opt) => {
          const isChecked = currentStatus === opt.status;
          return (
            <label
              key={opt.status}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 min-h-[44px] rounded-xl border text-xs sm:text-sm font-semibold transition cursor-pointer select-none touch-manipulation active:scale-[0.98] ${
                isChecked
                  ? opt.activeClass
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 hover:border-slate-300 dark:hover:border-slate-600'
              } ${isAlreadyRegistered ? 'opacity-80 cursor-not-allowed' : ''}`}
            >
              <input
                type="radio"
                name={`status-${block.id}`}
                value={opt.status}
                checked={isChecked}
                disabled={isAlreadyRegistered}
                onChange={() => handleStatusChange(block.id, opt.status)}
                className="sr-only"
              />
              <span className="font-bold text-sm shrink-0">{opt.icon}</span>
              <span className="truncate">{opt.label}</span>
            </label>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3.5 sm:pb-4 mb-4 sm:mb-5 border-b border-slate-100 dark:border-slate-800 gap-2.5">
        <div>
          <span className="text-[11px] sm:text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            Registro de Asistencia
          </span>
          <h3 className="text-base sm:text-xl font-bold text-slate-800 dark:text-white">
            {capitalizedDateTitle}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Prof. {teacher.name} — Modalidad:{' '}
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {isSplit ? 'Dos bloques divididos (1h c/u)' : 'Bloque continuo (2h)'}
            </span>
          </p>
        </div>

        {isAlreadyRegistered && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-bold">
              <span>✓</span>
              <span>Registrado</span>
            </span>
            {onDeleteAttendance && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`¿Estás seguro de eliminar el registro de asistencia del ${capitalizedDateTitle}?`)) {
                    onDeleteAttendance(teacher.id, dateStr);
                  }
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 min-h-[32px] rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition cursor-pointer touch-manipulation"
                title="Eliminar asistencia de esta fecha"
              >
                <span>🗑️</span>
                <span>Eliminar</span>
              </button>
            )}
          </div>
        )}
      </div>

      {isSubmittedSuccess && (
        <div className="mb-4 sm:mb-5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-medium flex items-center gap-2">
          <span>✓</span>
          <span>¡Asistencia guardada correctamente para esta fecha!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {teacher.blocks.map((block, idx) => {
          const blockState = blockStates[block.id] || {
            status: 'presente',
            notes: '',
          };

          return (
            <div
              key={block.id}
              className={`rounded-xl p-3.5 sm:p-5 border transition ${
                isSplit
                  ? 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 hover:border-blue-200 dark:hover:border-blue-500/30'
                  : 'bg-white dark:bg-slate-900 border-transparent p-0 sm:p-0'
              }`}
            >
              {isSplit && (
                <div className="flex flex-col min-[420px]:flex-row min-[420px]:items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-700/80 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm sm:text-base">
                      {block.label}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {isAlreadyRegistered && (
                      <StatusBadge status={blockState.status} size="sm" />
                    )}
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                      🕒 {formatTimeRange12h(block.startTime, block.endTime)}
                    </span>
                  </div>
                </div>
              )}

              {!isSplit && (
                <div className="flex flex-col min-[420px]:flex-row min-[420px]:items-center justify-between mb-3 gap-1.5">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Estado de asistencia:
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {isAlreadyRegistered && (
                      <StatusBadge status={blockState.status} size="sm" />
                    )}
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                      🕒 {formatTimeRange12h(block.startTime, block.endTime)}
                    </span>
                  </div>
                </div>
              )}

              {/* Radio Group */}
              <div>
                {renderStatusRadioOptions(block, blockState.status)}
              </div>
            </div>
          );
        })}

        {/* Action Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400 dark:text-slate-500 text-center sm:text-left">
            {isAlreadyRegistered
              ? 'Puedes eliminar el registro arriba si necesitas volver a registrar.'
              : 'Verifique los datos antes de registrar.'}
          </div>

          <button
            type="submit"
            disabled={isAlreadyRegistered}
            className={`w-full sm:w-auto px-6 py-3 sm:py-2.5 min-h-[44px] rounded-xl text-sm font-semibold transition cursor-pointer shadow-sm touch-manipulation flex items-center justify-center ${
              isAlreadyRegistered
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed shadow-none'
                : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-blue-500/20'
            }`}
          >
            {isAlreadyRegistered ? 'Asistencia registrada' : 'Guardar Asistencia'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AttendanceForm;
