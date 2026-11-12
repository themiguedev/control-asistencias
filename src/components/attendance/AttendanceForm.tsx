import React, { useState } from 'react';
import type {
  TeacherWithBlocks,
  AttendanceStatus,
  AttendanceRecord,
  StudentAttendanceRecord,
  Student,
  DayOfWeek,
} from '../../types';
import { isTeachingDay, formatDate, getDayName, formatTimeRange12h } from '../../utils/schedule';

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
  students?: Student[];
  existingRecords?: AttendanceRecord[];
  existingStudentRecords?: StudentAttendanceRecord[];
  onSubmit: (records: NewAttendanceRecordData[]) => void;
  onSubmitStudentAttendance?: (records: StudentAttendanceRecord[]) => void;
  onDeleteAttendance?: (teacherId: string, classDate: string) => void;
  onOpenEditSchedule?: () => void;
}

interface BlockState {
  status: AttendanceStatus;
  notes: string;
}

interface StudentState {
  status: AttendanceStatus;
  notes?: string;
}

export const AttendanceForm: React.FC<AttendanceFormProps> = ({
  teacher,
  date,
  students = [],
  existingRecords = [],
  existingStudentRecords = [],
  onSubmit,
  onSubmitStudentAttendance,
  onDeleteAttendance,
  onOpenEditSchedule,
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

  // Filter students belonging to this teacher
  const teacherStudents = students.filter((s) => s.teacherId === teacher.id);

  // Teacher blocks state
  const [blockStates] = useState<Record<string, BlockState>>(() => {
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

  // Students attendance state
  const [studentStates, setStudentStates] = useState<Record<string, StudentState>>(() => {
    const initial: Record<string, StudentState> = {};
    teacherStudents.forEach((student) => {
      const found = existingStudentRecords.find(
        (r) =>
          r.studentId === student.id &&
          r.teacherId === teacher.id &&
          r.classDate === dateStr &&
          (r.blockId === student.blockId || (!r.blockId && !student.blockId))
      );
      initial[student.id] = {
        status: found ? found.status : 'presente',
        notes: found?.notes || '',
      };
    });
    return initial;
  });

  // Track which students have been marked/interacted with in this session or already saved
  const [markedStudentIds, setMarkedStudentIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    existingStudentRecords
      .filter((r) => r.teacherId === teacher.id && r.classDate === dateStr)
      .forEach((r) => initial.add(r.studentId));
    return initial;
  });

  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

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

  // Check if teacher attendance is already recorded for this day
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

  const canEdit = !isAlreadyRegistered || isEditMode;

  const handleStudentStatusChange = (studentId: string, status: AttendanceStatus) => {
    setStudentStates((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
    setMarkedStudentIds((prev) => new Set(prev).add(studentId));
  };

  const handleMarkAllStudents = (status: AttendanceStatus, targetBlockId?: string) => {
    setStudentStates((prev) => {
      const next = { ...prev };
      teacherStudents.forEach((st) => {
        if (!targetBlockId || st.blockId === targetBlockId) {
          next[st.id] = {
            ...next[st.id],
            status,
          };
        }
      });
      return next;
    });
    setMarkedStudentIds((prev) => {
      const next = new Set(prev);
      teacherStudents.forEach((st) => {
        if (!targetBlockId || st.blockId === targetBlockId) {
          next.add(st.id);
        }
      });
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAlreadyRegistered && !isEditMode) return;

    const dayName = getDayName(date);

    // 1. Save Teacher Attendance
    const recordsToSave: NewAttendanceRecordData[] = teacher.blocks.map((block) => {
      const state = blockStates[block.id] || { status: 'presente', notes: '' };
      return {
        teacherId: teacher.id,
        blockId: block.id,
        classDate: dateStr,
        dayName,
        status: state.status,
        notes: state.notes || '',
      };
    });
    onSubmit(recordsToSave);

    // 2. Save Student Attendance
    if (onSubmitStudentAttendance && teacherStudents.length > 0) {
      const studentRecordsToSave: StudentAttendanceRecord[] = teacherStudents.map(
        (student) => {
          const state = studentStates[student.id] || { status: 'presente' };
          const existing = existingStudentRecords.find(
            (r) =>
              r.studentId === student.id &&
              r.teacherId === teacher.id &&
              r.classDate === dateStr &&
              (r.blockId === student.blockId || (!r.blockId && !student.blockId))
          );

          const resolvedBlockId =
            teacher.blockType === 'split'
              ? student.blockId || teacher.blocks[0]?.id || null
              : teacher.blocks[0]?.id || null;

          return {
            id: existing ? existing.id : `sturec-${Date.now()}-${student.id}`,
            studentId: student.id,
            teacherId: teacher.id,
            blockId: resolvedBlockId,
            classDate: dateStr,
            status: state.status,
            notes: state.notes,
            isAutomatic: false,
            createdAt: existing ? existing.createdAt : new Date().toISOString(),
          };
        }
      );

      onSubmitStudentAttendance(studentRecordsToSave);
    }

    setIsSubmittedSuccess(true);
    setIsEditMode(false);
  };

  const isSplit = teacher.blockType === 'split';

  // Stats calculation for enrolled students for this day
  const studentStats = teacherStudents.reduce(
    (acc, s) => {
      const status = studentStates[s.id]?.status || 'presente';
      if (status === 'presente') acc.presentes++;
      else if (status === 'ausente') acc.ausentes++;
      else if (status === 'justificado') acc.justificados++;
      return acc;
    },
    { presentes: 0, ausentes: 0, justificados: 0 }
  );

  const renderStudentRow = (student: Student) => {
    const currentStatus = studentStates[student.id]?.status || 'presente';
    const isMarked = markedStudentIds.has(student.id);

    return (
      <div
        key={student.id}
        className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border gap-2.5 transition-all ${
          isMarked
            ? 'bg-blue-50/40 dark:bg-slate-800/80 border-emerald-500/60 dark:border-emerald-500/50 shadow-sm'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Ganchito indicador con color dinamico segun la seleccion */}
            <span
              className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-all shrink-0 ${
                !isMarked
                  ? 'border border-dashed border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800'
                  : currentStatus === 'presente'
                  ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                  : currentStatus === 'ausente'
                  ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/30'
                  : 'bg-amber-500 text-white shadow-sm shadow-amber-500/30'
              }`}
              title={
                !isMarked
                  ? 'Pendiente de registrar'
                  : `Marcado como: ${currentStatus.toUpperCase()}`
              }
            >
              {!isMarked ? '—' : currentStatus === 'presente' ? '✓' : currentStatus === 'ausente' ? '✗' : '!'}
            </span>

            <span className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm truncate">
              {student.fullName}
            </span>
            {student.teamName && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                <span>🤖</span>
                <span>{student.teamName}</span>
              </span>
            )}
          </div>
          {student.identifier && (
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono block mt-0.5 ml-8.5">
              {student.identifier}
            </span>
          )}
        </div>

        {/* 3 Status Toggle Buttons with enhanced selected contrast */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => handleStudentStatusChange(student.id, 'presente')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 touch-manipulation min-h-[38px] ${
              currentStatus === 'presente'
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 scale-[1.02]'
                : 'bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-750 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-600 opacity-60 hover:opacity-100'
            } ${!canEdit ? 'cursor-not-allowed opacity-85' : 'cursor-pointer active:scale-95'}`}
            title="Presente"
          >
            <span className="text-sm">✓</span>
            <span className="hidden sm:inline">Presente</span>
          </button>

          <button
            type="button"
            disabled={!canEdit}
            onClick={() => handleStudentStatusChange(student.id, 'ausente')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 touch-manipulation min-h-[38px] ${
              currentStatus === 'ausente'
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30 ring-2 ring-rose-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 scale-[1.02]'
                : 'bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-750 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-600 opacity-60 hover:opacity-100'
            } ${!canEdit ? 'cursor-not-allowed opacity-85' : 'cursor-pointer active:scale-95'}`}
            title="Ausente"
          >
            <span className="text-sm">✗</span>
            <span className="hidden sm:inline">Ausente</span>
          </button>

          <button
            type="button"
            disabled={!canEdit}
            onClick={() => handleStudentStatusChange(student.id, 'justificado')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 touch-manipulation min-h-[38px] ${
              currentStatus === 'justificado'
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/30 ring-2 ring-amber-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 scale-[1.02]'
                : 'bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-750 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-600 opacity-60 hover:opacity-100'
            } ${!canEdit ? 'cursor-not-allowed opacity-85' : 'cursor-pointer active:scale-95'}`}
            title="Justificado"
          >
            <span className="text-sm">!</span>
            <span className="hidden sm:inline">Justif.</span>
          </button>
        </div>
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
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Prof. {teacher.name} — Modalidad:{' '}
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {isSplit
                  ? `Por Bloques (${teacher.blocks.length} turnos)`
                  : 'Horario Continuo'}
              </span>{' '}
              ({teacher.blocks.map((b) => formatTimeRange12h(b.startTime, b.endTime)).join(' | ')})
            </p>
            {onOpenEditSchedule && (
              <button
                type="button"
                onClick={onOpenEditSchedule}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 border border-blue-200 dark:border-blue-900/50 transition cursor-pointer"
                title="Editar horario y bloques de este profesor"
              >
                <span>⏰</span>
                <span>Editar Horario</span>
              </button>
            )}
          </div>
        </div>

        {isAlreadyRegistered && (
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-bold">
              <span>✓</span>
              <span>Registrado</span>
            </span>

            <button
              type="button"
              onClick={() => setIsEditMode((prev) => !prev)}
              className="inline-flex items-center gap-1 px-2.5 py-1 min-h-[32px] rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition cursor-pointer touch-manipulation"
              title="Modificar asistencias de esta fecha"
            >
              <span>✏️</span>
              <span>{isEditMode ? 'Cancelar' : 'Modificar'}</span>
            </button>

            {onDeleteAttendance && (
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      `¿Estás seguro de eliminar el registro de asistencia del ${capitalizedDateTitle}?`
                    )
                  ) {
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
          <span>¡Asistencia de profesor y alumnos guardada correctamente!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
        {/* 2. SECCIÓN: ASISTENCIA DE ALUMNOS */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span>👥</span>
                <span>Asistencia de Alumnos</span>
              </h4>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                {teacherStudents.length}
              </span>
            </div>

            {/* Quick Summary Badges */}
            {teacherStudents.length > 0 && (
              <div className="flex items-center gap-2 text-[11px] font-semibold flex-wrap">
                <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                  {studentStats.presentes} Pres.
                </span>
                <span className="text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                  {studentStats.ausentes} Aus.
                </span>
                <span className="text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                  {studentStats.justificados} Just.
                </span>
              </div>
            )}
          </div>

          {teacherStudents.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No hay alumnos registrados para este profesor aún.
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Puedes inscribir alumnos en la pestaña <strong>Alumnos</strong> en la parte superior.
              </p>
            </div>
          ) : isSplit ? (
            /* Split Blocks Display (like Mayuli) */
            <div className="space-y-4">
              {teacher.blocks.map((block) => {
                const blockStudents = teacherStudents.filter(
                  (s) => s.blockId === block.id || !s.blockId
                );

                return (
                  <div
                    key={block.id}
                    className="p-3.5 rounded-xl bg-slate-50/60 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/60 space-y-2.5"
                  >
                    <div className="flex flex-col min-[420px]:flex-row min-[420px]:items-center justify-between gap-1.5 pb-2 border-b border-slate-200 dark:border-slate-700/60">
                      <div>
                        <h5 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                          {block.label}{' '}
                          <span className="text-slate-400 font-normal">
                            ({formatTimeRange12h(block.startTime, block.endTime)})
                          </span>
                        </h5>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {blockStudents.length} alumno(s) inscritos
                        </span>
                      </div>

                      {canEdit && blockStudents.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleMarkAllStudents('presente', block.id)}
                            className="px-2 py-1 rounded text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition cursor-pointer"
                          >
                            ✓ Todos P
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMarkAllStudents('ausente', block.id)}
                            className="px-2 py-1 rounded text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 transition cursor-pointer"
                          >
                            ✗ Todos A
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      {blockStudents.map(renderStudentRow)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Continuous Block Display (Miguelangel, Luis) */
            <div className="space-y-2.5">
              {canEdit && teacherStudents.length > 0 && (
                <div className="flex items-center justify-end gap-2 pb-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Acción rápida:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleMarkAllStudents('presente')}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition cursor-pointer active:scale-95 touch-manipulation"
                  >
                    ✓ Todos Presentes
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMarkAllStudents('ausente')}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition cursor-pointer active:scale-95 touch-manipulation"
                  >
                    ✗ Todos Ausentes
                  </button>
                </div>
              )}

              <div className="space-y-2">
                {teacherStudents.map(renderStudentRow)}
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
          <div className="text-xs text-slate-400 dark:text-slate-500 text-center sm:text-left">
            {isAlreadyRegistered && !isEditMode
              ? 'Asistencia guardada. Haz clic en "Modificar" arriba para cambiar notas.'
              : 'Se registrará la asistencia del docente y de los alumnos para esta fecha.'}
          </div>

          {canEdit && (
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 sm:py-2.5 min-h-[44px] rounded-xl text-sm font-semibold transition cursor-pointer shadow-sm touch-manipulation flex items-center justify-center bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-blue-500/20 active:scale-[0.98]"
            >
              {isEditMode ? 'Actualizar Asistencias' : 'Guardar Asistencia'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default AttendanceForm;
