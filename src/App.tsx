import { useState, useEffect } from 'react';
import { teachers } from './data/teachers';
import type { AttendanceRecord, TeacherWithBlocks } from './types';
import Header from './components/layout/Header';
import Navigation from './components/layout/Navigation';
import PinLogin from './components/attendance/PinLogin';
import AttendanceForm, { type NewAttendanceRecordData } from './components/attendance/AttendanceForm';
import CalendarView from './components/attendance/CalendarView';
import SummaryCard from './components/reports/SummaryCard';
import { formatDate } from './utils/schedule';

// Sample initial records for demo/testing
const INITIAL_RECORDS: AttendanceRecord[] = [
  {
    id: 'rec-1',
    teacherId: 'teacher-miguelangel',
    blockId: 'block-miguelangel-1',
    classDate: '2026-11-03',
    dayName: 'martes',
    status: 'presente',
    notes: 'Clase iniciada a tiempo, unidad 4 concluida.',
    createdAt: '2026-11-03T18:05:00Z',
  },
  {
    id: 'rec-2',
    teacherId: 'teacher-miguelangel',
    blockId: 'block-miguelangel-1',
    classDate: '2026-11-05',
    dayName: 'jueves',
    status: 'presente',
    notes: 'Taller conversacional participativo.',
    createdAt: '2026-11-05T18:00:00Z',
  },
  {
    id: 'rec-3',
    teacherId: 'teacher-miguelangel',
    blockId: 'block-miguelangel-1',
    classDate: '2026-11-10',
    dayName: 'martes',
    status: 'justificado',
    notes: 'Permiso académico por capacitación institucional CBA.',
    createdAt: '2026-11-10T12:00:00Z',
  },
  {
    id: 'rec-4',
    teacherId: 'teacher-luis',
    blockId: 'block-luis-1',
    classDate: '2026-11-02',
    dayName: 'lunes',
    status: 'presente',
    notes: 'Sesión de listening y pronunciación.',
    createdAt: '2026-11-02T18:00:00Z',
  },
  {
    id: 'rec-5',
    teacherId: 'teacher-luis',
    blockId: 'block-luis-1',
    classDate: '2026-11-06',
    dayName: 'viernes',
    status: 'ausente',
    notes: 'Inasistencia sin notificación previa.',
    createdAt: '2026-11-06T18:30:00Z',
  },
  {
    id: 'rec-6',
    teacherId: 'teacher-mayuli',
    blockId: 'block-mayuli-1',
    classDate: '2026-11-03',
    dayName: 'martes',
    status: 'presente',
    notes: 'Bloque gramática avanzada.',
    createdAt: '2026-11-03T17:00:00Z',
  },
  {
    id: 'rec-7',
    teacherId: 'teacher-mayuli',
    blockId: 'block-mayuli-2',
    classDate: '2026-11-03',
    dayName: 'martes',
    status: 'presente',
    notes: 'Bloque comprensión lectora.',
    createdAt: '2026-11-03T18:00:00Z',
  },
  {
    id: 'rec-8',
    teacherId: 'teacher-mayuli',
    blockId: 'block-mayuli-1',
    classDate: '2026-11-05',
    dayName: 'jueves',
    status: 'presente',
    notes: 'Primer bloque cumplido sin novedades.',
    createdAt: '2026-11-05T17:00:00Z',
  },
  {
    id: 'rec-9',
    teacherId: 'teacher-mayuli',
    blockId: 'block-mayuli-2',
    classDate: '2026-11-05',
    dayName: 'jueves',
    status: 'justificado',
    notes: 'Permiso médico programado para el segundo bloque.',
    createdAt: '2026-11-05T18:00:00Z',
  },
];

export function App() {
  const [teacherList] = useState<TeacherWithBlocks[]>(teachers);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(teachers[0].id);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(INITIAL_RECORDS);
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());
  const [authenticatedTeachers, setAuthenticatedTeachers] = useState<Record<string, boolean>>({});

  // Dark mode state with localStorage persistence
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('cba-theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('cba-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('cba-theme', 'light');
    }
  }, [darkMode]);

  const activeTeacher =
    teacherList.find((t) => t.id === selectedTeacherId) || teacherList[0];
  const isAuthenticated = !!authenticatedTeachers[activeTeacher.id];

  const handleSelectTeacher = (id: string) => {
    setSelectedTeacherId(id);
  };

  const handleLoginSuccess = () => {
    setAuthenticatedTeachers((prev) => ({
      ...prev,
      [activeTeacher.id]: true,
    }));
  };

  const handleLogout = () => {
    setAuthenticatedTeachers((prev) => ({
      ...prev,
      [activeTeacher.id]: false,
    }));
  };

  const handleAddAttendance = (newRecords: NewAttendanceRecordData[]) => {
    const formattedSelectedDate = formatDate(selectedDate);
    const createdRecords: AttendanceRecord[] = newRecords.map((item, idx) => ({
      id: `record-${Date.now()}-${idx}`,
      ...item,
      createdAt: new Date().toISOString(),
    }));

    setAttendanceRecords((prev) => {
      // Remove any previous entry for this teacher on this day for the submitted blocks
      const cleanPrev = prev.filter(
        (r) =>
          !(
            r.teacherId === activeTeacher.id &&
            r.classDate === formattedSelectedDate &&
            createdRecords.some((cr) => cr.blockId === r.blockId)
          ),
      );
      return [...cleanPrev, ...createdRecords];
    });
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* 1. Header with Dark Mode Toggle */}
      <Header
        teacherName={isAuthenticated ? activeTeacher.name : undefined}
        onLogout={isAuthenticated ? handleLogout : undefined}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((prev) => !prev)}
      />

      {/* 2. Teacher Navigation Bar */}
      <Navigation
        teachers={teacherList}
        activeTeacherId={selectedTeacherId}
        onSelectTeacher={handleSelectTeacher}
        authenticatedTeachers={authenticatedTeachers}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {!isAuthenticated ? (
          /* 3. PIN Authentication Screen */
          <div className="py-6">
            <PinLogin
              teacherName={activeTeacher.name}
              expectedPin={activeTeacher.pin}
              onSuccess={handleLoginSuccess}
            />
          </div>
        ) : (
          /* Authenticated Dashboard */
          <div className="space-y-6">
            {/* Top Stats Summary */}
            <section aria-label="Resumen de asistencias">
              <SummaryCard
                teacher={activeTeacher}
                records={attendanceRecords}
                month={currentMonth}
              />
            </section>

            {/* Grid: Calendar View (left/top) + Attendance Form (right/bottom) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Calendar Column */}
              <div className="lg:col-span-7">
                <CalendarView
                  teacher={activeTeacher}
                  attendanceRecords={attendanceRecords}
                  onSelectDate={(date) => {
                    setSelectedDate(date);
                    setCurrentMonth(date);
                  }}
                  selectedDate={selectedDate}
                  initialMonth={currentMonth}
                />
              </div>

              {/* Attendance Form Column */}
              <div className="lg:col-span-5">
                <AttendanceForm
                  key={`${activeTeacher.id}-${formatDate(selectedDate)}`}
                  teacher={activeTeacher}
                  date={selectedDate}
                  existingRecords={attendanceRecords}
                  onSubmit={handleAddAttendance}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-4 text-center text-xs text-slate-500 dark:text-slate-400 transition-colors">
        <p>Centro Bolivariano Americano (CBA) — Sistema de Control de Asistencias Docente</p>
      </footer>
    </div>
  );
}

export default App;
