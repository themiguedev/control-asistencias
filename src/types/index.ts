export type DayOfWeek = 'lunes' | 'martes' | 'miércoles' | 'jueves' | 'viernes';
export type AttendanceStatus = 'presente' | 'ausente' | 'justificado';
export type BlockType = 'continuous' | 'split';

export interface Teacher {
  id: string;
  name: string;
  shortName: string;
  scheduleDays: DayOfWeek[];
  blockType: BlockType;
  pin: string; // 4-digit PIN for basic auth
}

export interface Block {
  id: string;
  teacherId: string;
  label: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
}

export interface AttendanceRecord {
  id: string;
  teacherId: string;
  blockId: string | null;
  classDate: string;  // YYYY-MM-DD
  dayName: DayOfWeek;
  status: AttendanceStatus;
  notes: string;
  createdAt: string;
}

export interface Student {
  id: string;
  teacherId: string;
  blockId?: string | null; // For teachers with split blocks (like Mayuli)
  teamName?: string | null; // Optional robotics team name (for Miguelangel and Luis)
  fullName: string;
  identifier?: string; // DNI / Cédula / Código de estudiante
  contactPhone?: string;
  createdAt: string;
}

export interface StudentAttendanceRecord {
  id: string;
  studentId: string;
  teacherId: string;
  blockId: string | null;
  classDate: string; // YYYY-MM-DD
  status: AttendanceStatus;
  notes?: string;
  isAutomatic?: boolean; // Flag indicating auto-assigned 'ausente' at week end / reconciliation
  createdAt: string;
}

export interface TeacherWithBlocks extends Teacher {
  blocks: Block[];
}

export interface WeekRange {
  startDate: string; // YYYY-MM-DD (Monday)
  endDate: string;   // YYYY-MM-DD (Friday)
  fridayDate: string; // YYYY-MM-DD (Friday)
  sundayDate: string; // YYYY-MM-DD (Sunday)
  start: Date;
  end: Date;
  weekNumber: number;
  year: number;
  label: string; // e.g. "Semana 45 (02 Nov - 06 Nov 2026)"
  weekDays: { date: Date; dateStr: string; dayName: DayOfWeek }[];
}

export interface StudentAttendanceSummary {
  student: Student;
  teacher: TeacherWithBlocks;
  teamName: string;
  blockLabel?: string;
  totalClasses: number;
  presentes: number;
  ausentes: number;
  justificados: number;
  attendanceRate: number; // 0 - 100 percentage
  recordsByDate: Record<string, StudentAttendanceRecord>;
}
