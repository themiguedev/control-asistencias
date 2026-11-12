import { useState, useEffect } from 'react';
import { teachers } from './data/teachers';
import type { AttendanceRecord, TeacherWithBlocks, Student } from './types';
import Header from './components/layout/Header';
import Navigation from './components/layout/Navigation';
import PinLogin from './components/attendance/PinLogin';
import AttendanceForm, { type NewAttendanceRecordData } from './components/attendance/AttendanceForm';
import CalendarView from './components/attendance/CalendarView';
import SummaryCard from './components/reports/SummaryCard';
import StudentsManager from './components/students/StudentsManager';
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

// Sample initial students data
const INITIAL_STUDENTS: Student[] = [
  {
    id: 'stu-1',
    teacherId: 'teacher-miguelangel',
    fullName: 'Alejandro Morales Vera',
    identifier: 'V-29401234',
    contactPhone: '0414-5551234',
    createdAt: '2026-11-01T10:00:00Z',
  },
  {
    id: 'stu-2',
    teacherId: 'teacher-miguelangel',
    fullName: 'Valeria Sofía Rivas',
    identifier: 'V-30112445',
    contactPhone: '0424-7778899',
    createdAt: '2026-11-01T10:15:00Z',
  },
  {
    id: 'stu-3',
    teacherId: 'teacher-luis',
    fullName: 'Gabriel Isaac Peña',
    identifier: 'V-28900112',
    contactPhone: '0412-3334455',
    createdAt: '2026-11-01T11:00:00Z',
  },
  {
    id: 'stu-4',
    teacherId: 'teacher-mayuli',
    blockId: 'block-mayuli-1',
    fullName: 'Camila Andrea Gómez',
    identifier: 'V-31002334',
    contactPhone: '0416-8889900',
    createdAt: '2026-11-01T11:30:00Z',
  },
  {
    id: 'stu-5',
    teacherId: 'teacher-mayuli',
    blockId: 'block-mayuli-2',
    fullName: 'Santiago José Torres',
    identifier: 'V-30889123',
    contactPhone: '0414-9990011',
    createdAt: '2026-11-01T12:00:00Z',
  },
];

export function App() {
  const [teacherList] = useState<TeacherWithBlocks[]>(teachers);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(teachers[0].id);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(INITIAL_RECORDS);
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());
  const [authenticatedTeachers, setAuthenticatedTeachers] = useState<Record<string, boolean>>({});

  // Active view tab: 'asistencias' or 'alumnos'
  const [activeTab, setActiveTab] = useState<'asistencias' | 'alumnos'>('asistencias');

  // Students list with localStorage persistence
  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('cba-students');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_STUDENTS;
      }
    }
    return INITIAL_STUDENTS;
  });

  useEffect(() => {
    localStorage.setItem('cba-students', JSON.stringify(students));
  }, [students]);

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

  const handleDeleteAttendance = (teacherId: string, classDate: string) => {
    setAttendanceRecords((prev) =>
      prev.filter((r) => !(r.teacherId === teacherId && r.classDate === classDate))
    );
  };

  const handleAddStudent = (newStudentData: Omit<Student, 'id' | 'createdAt'>) => {
    const newStudent: Student = {
      ...newStudentData,
      id: `stu-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setStudents((prev) => [newStudent, ...prev]);
  };

  const handleDeleteStudent = (studentId: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== studentId));
  };

  const handleUpdateStudent = (updatedStudent: Student) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === updatedStudent.id ? updatedStudent : s))
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200 overflow-x-hidden">
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 pb-8 sm:pb-12">
        {!isAuthenticated ? (
          /* 3. PIN Authentication Screen */
          <div className="py-4 sm:py-6">
            <PinLogin
              teacherName={activeTeacher.name}
              expectedPin={activeTeacher.pin}
              onSuccess={handleLoginSuccess}
            />
          </div>
        ) : (
          /* Authenticated Dashboard */
          <div className="space-y-5 sm:space-y-6">
            {/* View Switcher: Control Asistencias vs Nómina de Alumnos */}
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('asistencias')}
                  className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer border touch-manipulation active:scale-[0.98] ${
                    activeTab === 'asistencias'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850'
                  }`}
                >
                  <span className="text-base sm:text-sm">📅</span>
                  <span className="hidden sm:inline">Control de Asistencias</span>
                  <span className="sm:hidden">Asistencias</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('alumnos')}
                  className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer border touch-manipulation active:scale-[0.98] ${
                    activeTab === 'alumnos'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850'
                  }`}
                >
                  <span className="text-base sm:text-sm">👥</span>
                  <span className="hidden sm:inline">Registrar / Ver Alumnos</span>
                  <span className="sm:hidden">Alumnos</span>
                  <span className={`text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded-full font-semibold ${
                    activeTab === 'alumnos'
                      ? 'bg-blue-500/80 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}>
                    {students.filter((s) => s.teacherId === activeTeacher.id).length}
                  </span>
                </button>
              </div>
            </div>

            {activeTab === 'alumnos' ? (
              /* Sección de Gestión de Alumnos */
              <StudentsManager
                teacher={activeTeacher}
                students={students}
                onAddStudent={handleAddStudent}
                onDeleteStudent={handleDeleteStudent}
                onUpdateStudent={handleUpdateStudent}
              />
            ) : (
              /* Sección de Control de Asistencias */
              <div className="space-y-5 sm:space-y-6">
                {/* Top Stats Summary */}
                <section aria-label="Resumen de asistencias">
                  <SummaryCard
                    teacher={activeTeacher}
                    records={attendanceRecords}
                    month={currentMonth}
                  />
                </section>

                {/* Grid: Calendar View (left/top) + Attendance Form (right/bottom) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
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
                      onDeleteAttendance={handleDeleteAttendance}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-4 text-center text-xs text-slate-500 dark:text-slate-400 transition-colors">
        <p>Sistema de Control de Asistencias Docente — CBA</p>
      </footer>
    </div>
  );
}

export default App;
