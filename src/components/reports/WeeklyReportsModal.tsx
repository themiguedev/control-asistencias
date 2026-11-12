import { useEffect } from 'react';
import type { TeacherWithBlocks, Student, StudentAttendanceRecord } from '../../types';
import WeeklyReportsView from './WeeklyReportsView';

interface WeeklyReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  teachers: TeacherWithBlocks[];
  students: Student[];
  studentAttendanceRecords: StudentAttendanceRecord[];
  activeTeacher?: TeacherWithBlocks;
  selectedDate?: Date;
}

export function WeeklyReportsModal({
  isOpen,
  onClose,
  teachers,
  students,
  studentAttendanceRecords,
  activeTeacher,
  selectedDate,
}: WeeklyReportsModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reports-modal-title"
    >
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-slate-100 dark:bg-slate-950 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Modal Header */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl text-lg">
              📑
            </span>
            <div>
              <h2
                id="reports-modal-title"
                className="text-base sm:text-lg font-bold text-slate-900 dark:text-white"
              >
                Centro de Reportes Semanales CBA
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Informes oficiales y descargas en formato Excel (.xlsx)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Cerrar ventana"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto p-4 sm:p-6 flex-1">
          <WeeklyReportsView
            teachers={teachers}
            students={students}
            studentAttendanceRecords={studentAttendanceRecords}
            activeTeacher={activeTeacher}
            selectedDate={selectedDate}
          />
        </div>

        {/* Modal Footer */}
        <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
          >
            Cerrar Reportes
          </button>
        </div>
      </div>
    </div>
  );
}

export default WeeklyReportsModal;
