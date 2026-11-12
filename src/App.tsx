import { useState, useEffect } from 'react';
import { teachers } from './data/teachers';
import type { AttendanceRecord, TeacherWithBlocks, Student, StudentAttendanceRecord } from './types';
import Header from './components/layout/Header';
import Navigation from './components/layout/Navigation';
import PinLogin from './components/attendance/PinLogin';
import AttendanceForm, { type NewAttendanceRecordData } from './components/attendance/AttendanceForm';
import CalendarView from './components/attendance/CalendarView';
import SummaryCard from './components/reports/SummaryCard';
import StudentsManager from './components/students/StudentsManager';
import WeeklyReportsView from './components/reports/WeeklyReportsView';
import WeeklyReportsModal from './components/reports/WeeklyReportsModal';
import { formatDate } from './utils/schedule';
import {
  getStudents,
  addStudent as dbAddStudent,
  updateStudent as dbUpdateStudent,
  deleteStudent as dbDeleteStudent,
  getStudentAttendances,
  recordBulkStudentAttendance,
  deleteStudentAttendanceByTeacherAndDate,
  getTeachers,
  updateTeacherSchedule as dbUpdateTeacherSchedule,
} from './services/supabaseService';
import { EditScheduleModal } from './components/attendance/EditScheduleModal';
import { isSupabaseConfigured } from './lib/supabase';

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

// Sample initial students data with teams and blocks
const INITIAL_STUDENTS: Student[] = [
  // Miguelangel Contreras's students
  {
    id: 'stu-1',
    teacherId: 'teacher-miguelangel',
    fullName: 'Alejandro Morales Vera',
    identifier: 'V-29401234',
    teamName: 'RoboTitans',
    contactPhone: '0414-5551234',
    createdAt: '2026-11-01T10:00:00Z',
  },
  {
    id: 'stu-2',
    teacherId: 'teacher-miguelangel',
    fullName: 'Valeria Sofía Rivas',
    identifier: 'V-30112445',
    teamName: 'RoboTitans',
    contactPhone: '0424-7778899',
    createdAt: '2026-11-01T10:15:00Z',
  },
  {
    id: 'stu-6',
    teacherId: 'teacher-miguelangel',
    fullName: 'Matías David Silva',
    identifier: 'V-31220455',
    teamName: 'CyberBot',
    contactPhone: '0412-8881122',
    createdAt: '2026-11-01T10:30:00Z',
  },
  {
    id: 'stu-7',
    teacherId: 'teacher-miguelangel',
    fullName: 'Isabella Sofía Castro',
    identifier: 'V-29883441',
    teamName: 'CyberBot',
    contactPhone: '0416-2223344',
    createdAt: '2026-11-01T10:45:00Z',
  },

  // Luis Reyes's students
  {
    id: 'stu-3',
    teacherId: 'teacher-luis',
    fullName: 'Gabriel Isaac Peña',
    identifier: 'V-28900112',
    teamName: 'TechWarriors',
    contactPhone: '0412-3334455',
    createdAt: '2026-11-01T11:00:00Z',
  },
  {
    id: 'stu-8',
    teacherId: 'teacher-luis',
    fullName: 'Diego Alejandro Rangel',
    identifier: 'V-30441290',
    teamName: 'TechWarriors',
    contactPhone: '0424-6667788',
    createdAt: '2026-11-01T11:15:00Z',
  },
  {
    id: 'stu-9',
    teacherId: 'teacher-luis',
    fullName: 'Lucía Elena Morales',
    identifier: 'V-31552011',
    teamName: 'RoboTitans',
    contactPhone: '0414-3339900',
    createdAt: '2026-11-01T11:20:00Z',
  },

  // Mayuli Contreras's students (Split blocks)
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
    id: 'stu-10',
    teacherId: 'teacher-mayuli',
    blockId: 'block-mayuli-1',
    fullName: 'Sebastián Andrés Ruiz',
    identifier: 'V-30771892',
    contactPhone: '0414-1122334',
    createdAt: '2026-11-01T11:45:00Z',
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
  {
    id: 'stu-11',
    teacherId: 'teacher-mayuli',
    blockId: 'block-mayuli-2',
    fullName: 'Valentina Paula Méndez',
    identifier: 'V-29661445',
    contactPhone: '0426-5544332',
    createdAt: '2026-11-01T12:15:00Z',
  },
];

// Sample initial student attendance records
const INITIAL_STUDENT_ATTENDANCE: StudentAttendanceRecord[] = [
  // 2026-11-03 (Martes) - Miguelangel (Block 1)
  {
    id: 'sa-1',
    studentId: 'stu-1',
    teacherId: 'teacher-miguelangel',
    blockId: 'block-miguelangel-1',
    classDate: '2026-11-03',
    status: 'presente',
    createdAt: '2026-11-03T18:05:00Z',
  },
  {
    id: 'sa-2',
    studentId: 'stu-2',
    teacherId: 'teacher-miguelangel',
    blockId: 'block-miguelangel-1',
    classDate: '2026-11-03',
    status: 'presente',
    createdAt: '2026-11-03T18:05:00Z',
  },
  {
    id: 'sa-3',
    studentId: 'stu-6',
    teacherId: 'teacher-miguelangel',
    blockId: 'block-miguelangel-1',
    classDate: '2026-11-03',
    status: 'presente',
    createdAt: '2026-11-03T18:05:00Z',
  },
  {
    id: 'sa-4',
    studentId: 'stu-7',
    teacherId: 'teacher-miguelangel',
    blockId: 'block-miguelangel-1',
    classDate: '2026-11-03',
    status: 'ausente',
    notes: 'No asistió a la sesión de robótica',
    createdAt: '2026-11-03T18:05:00Z',
  },

  // 2026-11-05 (Jueves) - Miguelangel (Block 1)
  {
    id: 'sa-5',
    studentId: 'stu-1',
    teacherId: 'teacher-miguelangel',
    blockId: 'block-miguelangel-1',
    classDate: '2026-11-05',
    status: 'presente',
    createdAt: '2026-11-05T18:00:00Z',
  },
  {
    id: 'sa-6',
    studentId: 'stu-2',
    teacherId: 'teacher-miguelangel',
    blockId: 'block-miguelangel-1',
    classDate: '2026-11-05',
    status: 'justificado',
    notes: 'Reposo médico justificado',
    createdAt: '2026-11-05T18:00:00Z',
  },
  {
    id: 'sa-7',
    studentId: 'stu-6',
    teacherId: 'teacher-miguelangel',
    blockId: 'block-miguelangel-1',
    classDate: '2026-11-05',
    status: 'presente',
    createdAt: '2026-11-05T18:00:00Z',
  },
  {
    id: 'sa-8',
    studentId: 'stu-7',
    teacherId: 'teacher-miguelangel',
    blockId: 'block-miguelangel-1',
    classDate: '2026-11-05',
    status: 'presente',
    createdAt: '2026-11-05T18:00:00Z',
  },

  // 2026-11-02 (Lunes) - Luis (Block 1)
  {
    id: 'sa-9',
    studentId: 'stu-3',
    teacherId: 'teacher-luis',
    blockId: 'block-luis-1',
    classDate: '2026-11-02',
    status: 'presente',
    createdAt: '2026-11-02T18:00:00Z',
  },
  {
    id: 'sa-10',
    studentId: 'stu-8',
    teacherId: 'teacher-luis',
    blockId: 'block-luis-1',
    classDate: '2026-11-02',
    status: 'presente',
    createdAt: '2026-11-02T18:00:00Z',
  },
  {
    id: 'sa-11',
    studentId: 'stu-9',
    teacherId: 'teacher-luis',
    blockId: 'block-luis-1',
    classDate: '2026-11-02',
    status: 'presente',
    createdAt: '2026-11-02T18:00:00Z',
  },

  // 2026-11-06 (Viernes) - Luis (Block 1)
  {
    id: 'sa-12',
    studentId: 'stu-3',
    teacherId: 'teacher-luis',
    blockId: 'block-luis-1',
    classDate: '2026-11-06',
    status: 'ausente',
    createdAt: '2026-11-06T18:30:00Z',
  },
  {
    id: 'sa-13',
    studentId: 'stu-8',
    teacherId: 'teacher-luis',
    blockId: 'block-luis-1',
    classDate: '2026-11-06',
    status: 'justificado',
    notes: 'Permiso deportivo',
    createdAt: '2026-11-06T18:30:00Z',
  },
  // Note: stu-9 (Lucía Elena Morales) is intentionally left unrecorded on 2026-11-06
  // so the auto-absence business rule assigns her 'ausente' automatically!

  // 2026-11-03 (Martes) - Mayuli (Split blocks 1 & 2)
  {
    id: 'sa-14',
    studentId: 'stu-4',
    teacherId: 'teacher-mayuli',
    blockId: 'block-mayuli-1',
    classDate: '2026-11-03',
    status: 'presente',
    createdAt: '2026-11-03T17:00:00Z',
  },
  {
    id: 'sa-15',
    studentId: 'stu-10',
    teacherId: 'teacher-mayuli',
    blockId: 'block-mayuli-1',
    classDate: '2026-11-03',
    status: 'presente',
    createdAt: '2026-11-03T17:00:00Z',
  },
  {
    id: 'sa-16',
    studentId: 'stu-5',
    teacherId: 'teacher-mayuli',
    blockId: 'block-mayuli-2',
    classDate: '2026-11-03',
    status: 'presente',
    createdAt: '2026-11-03T18:00:00Z',
  },
  {
    id: 'sa-17',
    studentId: 'stu-11',
    teacherId: 'teacher-mayuli',
    blockId: 'block-mayuli-2',
    classDate: '2026-11-03',
    status: 'justificado',
    notes: 'Cita odontológica',
    createdAt: '2026-11-03T18:00:00Z',
  },

  // 2026-11-05 (Jueves) - Mayuli (Split blocks 1 & 2)
  {
    id: 'sa-18',
    studentId: 'stu-4',
    teacherId: 'teacher-mayuli',
    blockId: 'block-mayuli-1',
    classDate: '2026-11-05',
    status: 'presente',
    createdAt: '2026-11-05T17:00:00Z',
  },
  {
    id: 'sa-19',
    studentId: 'stu-10',
    teacherId: 'teacher-mayuli',
    blockId: 'block-mayuli-1',
    classDate: '2026-11-05',
    status: 'ausente',
    createdAt: '2026-11-05T17:00:00Z',
  },
  {
    id: 'sa-20',
    studentId: 'stu-5',
    teacherId: 'teacher-mayuli',
    blockId: 'block-mayuli-2',
    classDate: '2026-11-05',
    status: 'justificado',
    notes: 'Fiebre',
    createdAt: '2026-11-05T18:00:00Z',
  },
  {
    id: 'sa-21',
    studentId: 'stu-11',
    teacherId: 'teacher-mayuli',
    blockId: 'block-mayuli-2',
    classDate: '2026-11-05',
    status: 'presente',
    createdAt: '2026-11-05T18:00:00Z',
  },
];

export function App() {
  const [teacherList, setTeacherList] = useState<TeacherWithBlocks[]>(() => {
    const saved = localStorage.getItem('cba-teachers');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return teachers;
      }
    }
    return teachers;
  });
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(teachers[0].id);
  const [isEditScheduleModalOpen, setIsEditScheduleModalOpen] = useState<boolean>(false);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem('cba-attendance-records');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_RECORDS;
      }
    }
    return INITIAL_RECORDS;
  });

  useEffect(() => {
    localStorage.setItem('cba-attendance-records', JSON.stringify(attendanceRecords));
  }, [attendanceRecords]);
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());
  const [authenticatedTeachers, setAuthenticatedTeachers] = useState<Record<string, boolean>>({});

  // Active view tab: 'asistencias' | 'alumnos' | 'reportes'
  const [activeTab, setActiveTab] = useState<'asistencias' | 'alumnos' | 'reportes'>('asistencias');
  const [isReportsModalOpen, setIsReportsModalOpen] = useState<boolean>(false);

  // Students list with Supabase + localStorage persistence
  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('cba-students');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return Array.from(new Map(parsed.map((item: Student) => [item.id, item])).values());
        }
      } catch {
        return INITIAL_STUDENTS;
      }
    }
    return INITIAL_STUDENTS;
  });

  // Student Attendance Records with Supabase + localStorage persistence
  const [studentAttendanceRecords, setStudentAttendanceRecords] = useState<StudentAttendanceRecord[]>(() => {
    const saved = localStorage.getItem('cba-student-attendance');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_STUDENT_ATTENDANCE;
      }
    }
    return INITIAL_STUDENT_ATTENDANCE;
  });

  // On mount or tab change: refresh students & attendances from Supabase if configured
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let isMounted = true;
    async function loadCloudData() {
      try {
        const cloudTeachers = await getTeachers();
        if (isMounted && cloudTeachers && cloudTeachers.length > 0) {
          setTeacherList(cloudTeachers);
        }
        const cloudStudents = await getStudents();
        if (isMounted && cloudStudents && cloudStudents.length > 0) {
          const unique = Array.from(new Map(cloudStudents.map((item: Student) => [item.id, item])).values());
          setStudents(unique);
        }
        const cloudAttendances = await getStudentAttendances();
        if (isMounted && cloudAttendances) {
          setStudentAttendanceRecords(cloudAttendances);
        }
      } catch (err) {
        console.warn('[App] Error sincronizando con Supabase:', err);
      }
    }

    loadCloudData();
    return () => {
      isMounted = false;
    };
  }, [activeTab, isReportsModalOpen]);

  useEffect(() => {
    localStorage.setItem('cba-students', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem('cba-student-attendance', JSON.stringify(studentAttendanceRecords));
  }, [studentAttendanceRecords]);

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

  const handleSaveStudentAttendance = (records: StudentAttendanceRecord[]) => {
    setStudentAttendanceRecords((prev) => {
      const keysToReplace = new Set(
        records.map((r) => `${r.studentId}-${r.classDate}-${r.blockId}`)
      );
      const cleanPrev = prev.filter(
        (r) => !keysToReplace.has(`${r.studentId}-${r.classDate}-${r.blockId}`)
      );
      return [...cleanPrev, ...records];
    });

    if (isSupabaseConfigured) {
      recordBulkStudentAttendance(records).catch((err: unknown) =>
        console.warn('[App] Error guardando asistencia en Supabase:', err)
      );
    }
  };

  const handleDeleteAttendance = (teacherId: string, classDate: string) => {
    // 1. Eliminar de estado reactivo inmediato
    setAttendanceRecords((prev) => {
      const updated = prev.filter((r) => !(r.teacherId === teacherId && r.classDate === classDate));
      localStorage.setItem('cba-attendance-records', JSON.stringify(updated));
      return updated;
    });

    setStudentAttendanceRecords((prev) => {
      const updated = prev.filter((r) => !(r.teacherId === teacherId && r.classDate === classDate));
      localStorage.setItem('cba-student-attendance', JSON.stringify(updated));
      return updated;
    });

    // 2. Eliminar en Supabase directamente por teacherId y fecha
    if (isSupabaseConfigured) {
      deleteStudentAttendanceByTeacherAndDate(teacherId, classDate).catch((err: unknown) =>
        console.warn('[App] Error borrando asistencias del día en Supabase:', err)
      );
    }
  };

  const handleAddStudent = (newStudentData: Omit<Student, 'id' | 'createdAt'>) => {
    const newStudent: Student = {
      ...newStudentData,
      id: `stu-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setStudents((prev) => [newStudent, ...prev]);

    if (isSupabaseConfigured) {
      dbAddStudent(newStudent).catch((err: unknown) =>
        console.warn('[App] Error agregando estudiante en Supabase:', err)
      );
    }
  };

  const handleDeleteStudent = (studentId: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== studentId));
    // Also remove any attendance records for deleted student
    setStudentAttendanceRecords((prev) => prev.filter((r) => r.studentId !== studentId));

    if (isSupabaseConfigured) {
      dbDeleteStudent(studentId).catch((err: unknown) =>
        console.warn('[App] Error eliminando estudiante en Supabase:', err)
      );
    }
  };

  const handleUpdateStudent = (updatedStudent: Student) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === updatedStudent.id ? updatedStudent : s))
    );

    if (isSupabaseConfigured) {
      dbUpdateStudent(updatedStudent.id, updatedStudent).catch((err: unknown) =>
        console.warn('[App] Error actualizando estudiante en Supabase:', err)
      );
    }
  };

  const handleUpdateTeacherSchedule = (updatedTeacher: TeacherWithBlocks) => {
    setTeacherList((prev) => {
      const updated = prev.map((t) => (t.id === updatedTeacher.id ? updatedTeacher : t));
      localStorage.setItem('cba-teachers', JSON.stringify(updated));
      return updated;
    });

    if (isSupabaseConfigured) {
      dbUpdateTeacherSchedule(updatedTeacher).catch((err: unknown) =>
        console.warn('[App] Error guardando horario de profesor en Supabase:', err)
      );
    }
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
            {/* View Switcher: Control Asistencias vs Nómina de Alumnos vs Reportes Excel */}
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar scroll-smooth touch-pan-x py-0.5">
                  <button
                    type="button"
                    onClick={() => setActiveTab('asistencias')}
                    className={`shrink-0 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer border touch-manipulation active:scale-[0.98] whitespace-nowrap ${
                      activeTab === 'asistencias'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-base sm:text-sm">📅</span>
                    <span className="hidden sm:inline">Control de Asistencias</span>
                    <span className="sm:hidden">Asistencias</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('alumnos')}
                    className={`shrink-0 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer border touch-manipulation active:scale-[0.98] whitespace-nowrap ${
                      activeTab === 'alumnos'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-base sm:text-sm">👥</span>
                    <span className="hidden sm:inline">Registrar / Ver Alumnos</span>
                    <span className="sm:hidden">Alumnos</span>
                    <span
                      className={`text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded-full font-semibold ${
                        activeTab === 'alumnos'
                          ? 'bg-blue-500/80 text-white'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {students.filter((s) => s.teacherId === activeTeacher.id).length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('reportes')}
                    className={`shrink-0 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer border touch-manipulation active:scale-[0.98] whitespace-nowrap ${
                      activeTab === 'reportes'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-base sm:text-sm">📊</span>
                    <span className="hidden sm:inline">Reportes Semanales (Excel)</span>
                    <span className="sm:hidden">Reportes</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      Excel
                    </span>
                  </button>
                </div>

                {/* Quick Reports Modal Trigger Button */}
                <button
                  type="button"
                  onClick={() => setIsReportsModalOpen(true)}
                  className="hidden md:inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-600 transition cursor-pointer shadow-sm"
                  title="Abrir Centro de Reportes en ventana flotante"
                >
                  <span>📑</span>
                  <span className="font-semibold">Ventana de Reportes</span>
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
            ) : activeTab === 'reportes' ? (
              /* Sección de Reportes Semanales y Exportación Excel */
              <WeeklyReportsView
                teachers={teacherList}
                students={students}
                studentAttendanceRecords={studentAttendanceRecords}
                activeTeacher={activeTeacher}
                selectedDate={selectedDate}
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

                  {/* Attendance Form Column (Docente + Alumnos) */}
                  <div className="lg:col-span-5">
                    <AttendanceForm
                      key={`${activeTeacher.id}-${formatDate(selectedDate)}`}
                      teacher={activeTeacher}
                      date={selectedDate}
                      students={students}
                      existingRecords={attendanceRecords}
                      existingStudentRecords={studentAttendanceRecords}
                      onSubmit={handleAddAttendance}
                      onSubmitStudentAttendance={handleSaveStudentAttendance}
                      onDeleteAttendance={handleDeleteAttendance}
                      onOpenEditSchedule={() => setIsEditScheduleModalOpen(true)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Weekly Reports Center Modal */}
      <WeeklyReportsModal
        isOpen={isReportsModalOpen}
        onClose={() => setIsReportsModalOpen(false)}
        teachers={teacherList}
        students={students}
        studentAttendanceRecords={studentAttendanceRecords}
        activeTeacher={activeTeacher}
        selectedDate={selectedDate}
      />

      {/* Modal para Editar Horario y Bloques del Profesor */}
      <EditScheduleModal
        isOpen={isEditScheduleModalOpen}
        onClose={() => setIsEditScheduleModalOpen(false)}
        teacher={activeTeacher}
        onSave={handleUpdateTeacherSchedule}
      />

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-4 text-center text-xs text-slate-500 dark:text-slate-400 transition-colors">
        <p>Sistema de Control de Asistencias Docente — CBA</p>
      </footer>
    </div>
  );
}

export default App;
