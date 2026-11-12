import React, { useState } from 'react';
import type {
  TeacherWithBlocks,
  AttendanceStatus,
  AttendanceRecord,
  DayOfWeek,
  Block,
} from '../../types';
import { isTeachingDay, formatDate, getDayName } from '../../utils/schedule';
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
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-sm text-center">
        <div className="w-14 h-14 bg-amber-50 border border-amber-200 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl">
          📅
        </div>
        <h3 className="text-lg font-bold text-gray-800 mb-1">
          No hay clase programada para hoy
        </h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto mb-3">
          El profesor <strong className="text-gray-700">{teacher.name}</strong> imparte
          clases los días{' '}
          <strong className="text-indigo-600">
            {teacher.scheduleDays.join(' y ')}
          </strong>
          .
        </p>
        <span className="inline-block text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
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
        ...(prev[blockId] || { notes: '' }),
        status,
      },
    }));
  };

  const handleNotesChange = (blockId: string, notes: string) => {
    setBlockStates((prev) => ({
      ...prev,
      [blockId]: {
        ...(prev[blockId] || { status: 'presente' }),
        notes,
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
        notes: state.notes,
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
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {options.map((opt) => {
          const isChecked = currentStatus === opt.status;
          return (
            <label
              key={opt.status}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-semibold transition cursor-pointer select-none ${
                isChecked
                  ? opt.activeClass
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
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
              <span className="font-bold">{opt.icon}</span>
              <span>{opt.label}</span>
            </label>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-7 border border-gray-200 shadow-sm">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 mb-5 border-b border-gray-100 gap-2">
        <div>
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
            Registro de Asistencia
          </span>
          <h3 className="text-lg sm:text-xl font-bold text-gray-800">
            {capitalizedDateTitle}
          </h3>
          <p className="text-xs text-gray-500">
            Prof. {teacher.name} — Modalidad:{' '}
            <span className="font-medium text-gray-700">
              {isSplit ? 'Dos bloques divididos (1h c/u)' : 'Bloque continuo (2h)'}
            </span>
          </p>
        </div>

        {isAlreadyRegistered && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
              <span>✓</span>
              <span>Ya registrado</span>
            </span>
          </div>
        )}
      </div>

      {isSubmittedSuccess && (
        <div className="mb-5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs sm:text-sm font-medium flex items-center gap-2">
          <span>✓</span>
          <span>¡Asistencia guardada correctamente para esta fecha!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {teacher.blocks.map((block, idx) => {
          const blockState = blockStates[block.id] || {
            status: 'presente',
            notes: '',
          };

          return (
            <div
              key={block.id}
              className={`rounded-xl p-4 sm:p-5 border transition ${
                isSplit
                  ? 'bg-gray-50/70 border-gray-200 hover:border-indigo-200'
                  : 'bg-white border-transparent'
              }`}
            >
              {isSplit && (
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <h4 className="font-bold text-gray-800 text-sm sm:text-base">
                      {block.label}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAlreadyRegistered && (
                      <StatusBadge status={blockState.status} size="sm" />
                    )}
                    <span className="text-xs font-medium text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
                      🕒 {block.startTime} - {block.endTime}
                    </span>
                  </div>
                </div>
              )}

              {!isSplit && (
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Estado de asistencia:
                  </span>
                  <div className="flex items-center gap-2">
                    {isAlreadyRegistered && (
                      <StatusBadge status={blockState.status} size="sm" />
                    )}
                    <span className="text-xs font-medium text-gray-500">
                      🕒 {block.startTime} - {block.endTime}
                    </span>
                  </div>
                </div>
              )}

              {/* Radio Group */}
              <div className="mb-3">
                {renderStatusRadioOptions(block, blockState.status)}
              </div>

              {/* Notes Field */}
              <div>
                <label
                  htmlFor={`notes-${block.id}`}
                  className="block text-xs font-medium text-gray-600 mb-1"
                >
                  Observaciones / Justificación{' '}
                  <span className="text-gray-400 font-normal">(opcional)</span>:
                </label>
                <textarea
                  id={`notes-${block.id}`}
                  rows={2}
                  disabled={isAlreadyRegistered}
                  value={blockState.notes}
                  onChange={(e) => handleNotesChange(block.id, e.target.value)}
                  placeholder={
                    blockState.status === 'justificado'
                      ? 'Motivo del permiso, incapacidad médica o reprogramación...'
                      : 'Notas adicionales sobre la sesión...'
                  }
                  className={`w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none ${
                    isAlreadyRegistered ? 'bg-gray-100/60 text-gray-600 cursor-not-allowed' : ''
                  }`}
                />
              </div>
            </div>
          );
        })}

        {/* Action Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-gray-400">
            {isAlreadyRegistered
              ? 'Para modificar asistencias pasadas contacte a administración.'
              : 'Verifique los datos antes de registrar.'}
          </div>

          <button
            type="submit"
            disabled={isAlreadyRegistered}
            className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer shadow-sm ${
              isAlreadyRegistered
                ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed shadow-none'
                : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-indigo-200'
            }`}
          >
            {isAlreadyRegistered ? 'Asistencia ya registrada' : 'Guardar Asistencia'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AttendanceForm;
