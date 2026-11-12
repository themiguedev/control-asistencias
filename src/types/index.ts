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
  createdAt: string;
}

export interface TeacherWithBlocks extends Teacher {
  blocks: Block[];
}
