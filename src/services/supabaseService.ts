import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type {
  Student,
  StudentAttendanceRecord,
  AttendanceRecord,
  TeacherWithBlocks,
} from '../types';
import { teachers as localTeachers } from '../data/teachers';

// LocalStorage Keys for fallback
const STORAGE_KEYS = {
  STUDENTS: 'cba-students',
  STUDENT_ATTENDANCE: 'cba-student-attendance',
  ATTENDANCE_RECORDS: 'cba-attendance-records',
  TEACHERS: 'cba-teachers',
} as const;

// Helper to safely read from localStorage
function getLocal<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    return JSON.parse(item) as T;
  } catch (error) {
    console.warn(`[supabaseService] Error reading localStorage key "${key}":`, error);
    return fallback;
  }
}

// Helper to safely write to localStorage
function setLocal<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn(`[supabaseService] Error saving to localStorage key "${key}":`, error);
  }
}

// Database Row Types for Supabase
interface StudentRow {
  id: string;
  teacher_id: string;
  block_id: string | null;
  team_name: string | null;
  full_name: string;
  identifier: string | null;
  contact_phone: string | null;
  created_at: string;
}

interface StudentAttendanceRow {
  id: string;
  student_id: string;
  teacher_id: string;
  block_id: string | null;
  date: string;
  status: 'presente' | 'ausente' | 'justificado';
  observations: string | null;
  is_automatic: boolean;
  created_at: string;
}

interface TeacherRow {
  id: string;
  name: string;
  pin: string;
  schedule_days: string[];
  blocks: any;
}

// Map from Supabase Row to Student interface
function mapStudentRow(row: StudentRow): Student {
  return {
    id: row.id,
    teacherId: row.teacher_id,
    blockId: row.block_id,
    teamName: row.team_name,
    fullName: row.full_name,
    identifier: row.identifier ?? undefined,
    contactPhone: row.contact_phone ?? undefined,
    createdAt: row.created_at,
  };
}

// Map from Student interface to Supabase Row
function mapStudentToRow(student: Student): StudentRow {
  return {
    id: student.id,
    teacher_id: student.teacherId,
    block_id: student.blockId ?? null,
    team_name: student.teamName ?? null,
    full_name: student.fullName,
    identifier: student.identifier ?? null,
    contact_phone: student.contactPhone ?? null,
    created_at: student.createdAt || new Date().toISOString(),
  };
}

// Map from Supabase Row to StudentAttendanceRecord
function mapStudentAttendanceRow(row: StudentAttendanceRow): StudentAttendanceRecord {
  return {
    id: row.id,
    studentId: row.student_id,
    teacherId: row.teacher_id,
    blockId: row.block_id,
    classDate: row.date,
    status: row.status,
    notes: row.observations ?? undefined,
    isAutomatic: row.is_automatic ?? false,
    createdAt: row.created_at,
  };
}

// Map from StudentAttendanceRecord to Supabase Row
function mapStudentAttendanceToRow(record: StudentAttendanceRecord): StudentAttendanceRow {
  return {
    id: record.id,
    student_id: record.studentId,
    teacher_id: record.teacherId,
    block_id: record.blockId ?? null,
    date: record.classDate,
    status: record.status,
    observations: record.notes ?? null,
    is_automatic: record.isAutomatic ?? false,
    created_at: record.createdAt || new Date().toISOString(),
  };
}

/**
 * Hybrid Persistence Service (Supabase + LocalStorage Fallback)
 */
export const supabaseService = {
  /**
   * Check if Supabase is properly configured and reachable
   */
  isConfigured(): boolean {
    return isSupabaseConfigured;
  },

  // ==========================================
  // ESTUDIANTES (STUDENTS) CRUD
  // ==========================================

  /**
   * Cargar todos los estudiantes (o por profesor)
   */
  async getStudents(teacherId?: string): Promise<Student[]> {
    if (isSupabaseConfigured) {
      try {
        let query = supabase.from('students').select('*').order('full_name', { ascending: true });
        if (teacherId) {
          query = query.eq('teacher_id', teacherId);
        }
        const { data, error } = await query;
        if (error) throw error;
        if (data && data.length > 0) {
          const mapped = (data as StudentRow[]).map(mapStudentRow);
          // Mirror in localStorage for offline availability
          setLocal(STORAGE_KEYS.STUDENTS, mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('[supabaseService] Error fetching students from Supabase, falling back to localStorage:', err);
      }
    }

    // Fallback LocalStorage
    const local = getLocal<Student[]>(STORAGE_KEYS.STUDENTS, []);
    return teacherId ? local.filter((s) => s.teacherId === teacherId) : local;
  },

  /**
   * Agregar un nuevo estudiante
   */
  async addStudent(student: Student): Promise<Student> {
    const studentWithTimestamp: Student = {
      ...student,
      createdAt: student.createdAt || new Date().toISOString(),
    };

    // Update LocalStorage first to guarantee immediate offline/synchronous consistency
    const local = getLocal<Student[]>(STORAGE_KEYS.STUDENTS, []);
    const updated = [...local.filter((s) => s.id !== student.id), studentWithTimestamp];
    setLocal(STORAGE_KEYS.STUDENTS, updated);

    if (isSupabaseConfigured) {
      try {
        const row = mapStudentToRow(studentWithTimestamp);
        const { error } = await supabase.from('students').insert(row);
        if (error) {
          console.warn('[supabaseService] Error inserting student in Supabase:', error);
        }
      } catch (err) {
        console.warn('[supabaseService] Supabase insert failed, stored in localStorage:', err);
      }
    }

    return studentWithTimestamp;
  },

  /**
   * Actualizar equipo o bloque o datos de un estudiante
   */
  async updateStudent(studentId: string, updates: Partial<Student>): Promise<Student | null> {
    const local = getLocal<Student[]>(STORAGE_KEYS.STUDENTS, []);
    const index = local.findIndex((s) => s.id === studentId);
    let updatedStudent: Student | null = null;

    if (index !== -1) {
      local[index] = { ...local[index], ...updates };
      updatedStudent = local[index];
      setLocal(STORAGE_KEYS.STUDENTS, local);
    }

    if (isSupabaseConfigured) {
      try {
        const payload: Partial<StudentRow> = {};
        if (updates.fullName !== undefined) payload.full_name = updates.fullName;
        if (updates.teamName !== undefined) payload.team_name = updates.teamName ?? null;
        if (updates.blockId !== undefined) payload.block_id = updates.blockId ?? null;
        if (updates.teacherId !== undefined) payload.teacher_id = updates.teacherId;
        if (updates.identifier !== undefined) payload.identifier = updates.identifier ?? null;
        if (updates.contactPhone !== undefined) payload.contact_phone = updates.contactPhone ?? null;

        const { error } = await supabase.from('students').update(payload).eq('id', studentId);
        if (error) {
          console.warn('[supabaseService] Error updating student in Supabase:', error);
        }
      } catch (err) {
        console.warn('[supabaseService] Supabase update failed:', err);
      }
    }

    return updatedStudent;
  },

  /**
   * Eliminar un estudiante
   */
  async deleteStudent(studentId: string): Promise<boolean> {
    const local = getLocal<Student[]>(STORAGE_KEYS.STUDENTS, []);
    const filtered = local.filter((s) => s.id !== studentId);
    setLocal(STORAGE_KEYS.STUDENTS, filtered);

    if (isSupabaseConfigured) {
      try {
        // Also delete related student attendance records if not cascaded
        await supabase.from('attendance_records').delete().eq('student_id', studentId);
        const { error } = await supabase.from('students').delete().eq('id', studentId);
        if (error) {
          console.warn('[supabaseService] Error deleting student from Supabase:', error);
          return false;
        }
      } catch (err) {
        console.warn('[supabaseService] Supabase delete failed:', err);
      }
    }

    return true;
  },

  // ==========================================
  // ASISTENCIAS (STUDENT ATTENDANCE) CRUD
  // ==========================================

  /**
   * Cargar asistencias de estudiantes (todas, por rango de fechas o por profesor)
   */
  async getStudentAttendances(options?: {
    teacherId?: string;
    startDate?: string;
    endDate?: string;
    studentId?: string;
  }): Promise<StudentAttendanceRecord[]> {
    if (isSupabaseConfigured) {
      try {
        let query = supabase.from('attendance_records').select('*').order('date', { ascending: false });

        if (options?.teacherId) {
          query = query.eq('teacher_id', options.teacherId);
        }
        if (options?.studentId) {
          query = query.eq('student_id', options.studentId);
        }
        if (options?.startDate) {
          query = query.gte('date', options.startDate);
        }
        if (options?.endDate) {
          query = query.lte('date', options.endDate);
        }

        const { data, error } = await query;
        if (error) throw error;
        if (data && data.length > 0) {
          const mapped = (data as StudentAttendanceRow[]).map(mapStudentAttendanceRow);
          return mapped;
        }
      } catch (err) {
        console.warn('[supabaseService] Error fetching attendances from Supabase, falling back to localStorage:', err);
      }
    }

    // Fallback LocalStorage
    let records = getLocal<StudentAttendanceRecord[]>(STORAGE_KEYS.STUDENT_ATTENDANCE, []);
    if (options?.teacherId) {
      records = records.filter((r) => r.teacherId === options.teacherId);
    }
    if (options?.studentId) {
      records = records.filter((r) => r.studentId === options.studentId);
    }
    if (options?.startDate) {
      records = records.filter((r) => r.classDate >= options.startDate!);
    }
    if (options?.endDate) {
      records = records.filter((r) => r.classDate <= options.endDate!);
    }

    return records;
  },

  /**
   * Registrar o actualizar asistencia de un estudiante (Upsert)
   */
  async recordStudentAttendance(record: StudentAttendanceRecord): Promise<StudentAttendanceRecord> {
    const recordWithTimestamp: StudentAttendanceRecord = {
      ...record,
      createdAt: record.createdAt || new Date().toISOString(),
    };

    // Update LocalStorage
    const local = getLocal<StudentAttendanceRecord[]>(STORAGE_KEYS.STUDENT_ATTENDANCE, []);
    // Replace if same student and same date and same block, otherwise add
    const existingIndex = local.findIndex(
      (r) =>
        r.studentId === record.studentId &&
        r.classDate === record.classDate &&
        (r.blockId || null) === (record.blockId || null)
    );

    if (existingIndex >= 0) {
      local[existingIndex] = recordWithTimestamp;
    } else {
      local.push(recordWithTimestamp);
    }
    setLocal(STORAGE_KEYS.STUDENT_ATTENDANCE, local);

    if (isSupabaseConfigured) {
      try {
        const row = mapStudentAttendanceToRow(recordWithTimestamp);
        // Supabase upsert on primary key or unique index
        const { error } = await supabase.from('attendance_records').upsert(row, { onConflict: 'id' });
        if (error) {
          console.warn('[supabaseService] Error recording attendance in Supabase:', error);
        }
      } catch (err) {
        console.warn('[supabaseService] Supabase record attendance failed:', err);
      }
    }

    return recordWithTimestamp;
  },

  /**
   * Registrar múltiples asistencias en lote (bulk upsert)
   */
  async recordBulkStudentAttendance(
    records: StudentAttendanceRecord[]
  ): Promise<StudentAttendanceRecord[]> {
    if (records.length === 0) return [];

    const local = getLocal<StudentAttendanceRecord[]>(STORAGE_KEYS.STUDENT_ATTENDANCE, []);
    const localMap = new Map<string, StudentAttendanceRecord>();
    local.forEach((r) => localMap.set(`${r.studentId}_${r.classDate}_${r.blockId || ''}`, r));

    records.forEach((r) => {
      localMap.set(`${r.studentId}_${r.classDate}_${r.blockId || ''}`, r);
    });

    const updatedList = Array.from(localMap.values());
    setLocal(STORAGE_KEYS.STUDENT_ATTENDANCE, updatedList);

    if (isSupabaseConfigured) {
      try {
        const rows = records.map(mapStudentAttendanceToRow);
        const { error } = await supabase.from('attendance_records').upsert(rows, { onConflict: 'id' });
        if (error) {
          console.warn('[supabaseService] Error in bulk upsert to Supabase:', error);
        }
      } catch (err) {
        console.warn('[supabaseService] Supabase bulk upsert failed:', err);
      }
    }

    return records;
  },

  /**
   * Eliminar un registro de asistencia
   */
  async deleteStudentAttendance(recordId: string): Promise<boolean> {
    const local = getLocal<StudentAttendanceRecord[]>(STORAGE_KEYS.STUDENT_ATTENDANCE, []);
    const filtered = local.filter((r) => r.id !== recordId);
    setLocal(STORAGE_KEYS.STUDENT_ATTENDANCE, filtered);

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('attendance_records').delete().eq('id', recordId);
        if (error) {
          console.warn('[supabaseService] Error deleting attendance record in Supabase:', error);
          return false;
        }
      } catch (err) {
        console.warn('[supabaseService] Supabase delete attendance failed:', err);
      }
    }

    return true;
  },

  // ==========================================
  // PROFESORES (TEACHERS) CRUD & SYNC
  // ==========================================

  /**
   * Cargar profesores (de Supabase o de config local)
   */
  async getTeachers(): Promise<TeacherWithBlocks[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('teachers').select('*');
        if (error) throw error;
        if (data && data.length > 0) {
          const mappedTeachers: TeacherWithBlocks[] = (data as TeacherRow[]).map((row) => ({
            id: row.id,
            name: row.name,
            shortName: row.name.split(' ')[0] || row.name,
            scheduleDays: row.schedule_days as any,
            blockType: row.blocks && row.blocks.length > 1 ? 'split' : 'continuous',
            pin: row.pin,
            blocks: Array.isArray(row.blocks) ? row.blocks : [],
          }));
          return mappedTeachers;
        }
      } catch (err) {
        console.warn('[supabaseService] Error fetching teachers from Supabase, using local defaults:', err);
      }
    }

    return localTeachers;
  },

  /**
   * Sincronizar profesores locales a Supabase (si no existen o para inicializar)
   */
  async syncTeachers(teachersList: TeacherWithBlocks[] = localTeachers): Promise<boolean> {
    if (!isSupabaseConfigured) return false;

    try {
      const rows: TeacherRow[] = teachersList.map((t) => ({
        id: t.id,
        name: t.name,
        pin: t.pin,
        schedule_days: t.scheduleDays,
        blocks: t.blocks,
      }));

      const { error } = await supabase.from('teachers').upsert(rows, { onConflict: 'id' });
      if (error) {
        console.warn('[supabaseService] Error syncing teachers to Supabase:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[supabaseService] Supabase syncTeachers exception:', err);
      return false;
    }
  },

  // ==========================================
  // ASISTENCIAS DE PROFESORES (TEACHER ATTENDANCE)
  // ==========================================

  /**
   * Cargar asistencias de profesores
   */
  async getTeacherAttendanceRecords(): Promise<AttendanceRecord[]> {
    return getLocal<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE_RECORDS, []);
  },

  /**
   * Guardar asistencias de profesores
   */
  async saveTeacherAttendanceRecords(records: AttendanceRecord[]): Promise<void> {
    setLocal(STORAGE_KEYS.ATTENDANCE_RECORDS, records);
  },
};
