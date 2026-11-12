import * as XLSX from 'xlsx';
import { teachers } from '../src/data/teachers';
import type { Student, StudentAttendanceRecord } from '../src/types';
import {
  getWeekRange,
  reconcileAllTeachersStudentAttendance,
  reconcileStudentAttendance,
  calculateStudentWeeklySummaries,
} from '../src/utils/weeklyReports';
import {
  buildTeamTeacherSheet,
  buildTeacherStudentsSheet,
  buildGeneralConsolidatedSheet,
} from '../src/utils/excelExport';

console.log('=== TEST 1: Schedule & WeekRange ===');
const week = getWeekRange(new Date('2026-11-04')); // Wednesday
console.log('Week label:', week.label);
console.log('Week start/end:', week.startDate, 'to', week.endDate);
console.log('Days:', week.weekDays.map(d => `${d.dayName} (${d.dateStr})`).join(', '));
if (week.weekDays.length !== 5) throw new Error('Weekdays should have 5 days');

console.log('\n=== TEST 2: Business Rule - Auto-absence Reconciliation ===');
const mockStudents: Student[] = [
  {
    id: 's-miguel-1',
    teacherId: 'teacher-miguelangel',
    fullName: 'Alumno Miguelangel Uno',
    identifier: 'V-001',
    teamName: 'RoboTitans',
    createdAt: '2026-11-01',
  },
  {
    id: 's-miguel-2',
    teacherId: 'teacher-miguelangel',
    fullName: 'Alumno Miguelangel Dos',
    identifier: 'V-002',
    teamName: 'CyberBot',
    createdAt: '2026-11-01',
  },
  {
    id: 's-mayuli-1',
    teacherId: 'teacher-mayuli',
    blockId: 'block-mayuli-1',
    fullName: 'Alumno Mayuli Bloque1',
    identifier: 'V-003',
    teamName: 'TechWarriors',
    createdAt: '2026-11-01',
  },
];

// Student 1 attended Tuesday (2026-11-03), but Thursday (2026-11-05) has NO registration
// Student 2 has NO attendance records at all in the entire week
// Student 3 attended Tuesday (2026-11-03) justificado, Thursday has NO registration
const existingRecords: StudentAttendanceRecord[] = [
  {
    id: 'rec-1',
    studentId: 's-miguel-1',
    teacherId: 'teacher-miguelangel',
    blockId: 'block-miguelangel-1',
    classDate: '2026-11-03',
    status: 'presente',
    createdAt: '2026-11-03T18:00:00Z',
  },
  {
    id: 'rec-2',
    studentId: 's-mayuli-1',
    teacherId: 'teacher-mayuli',
    blockId: 'block-mayuli-1',
    classDate: '2026-11-03',
    status: 'justificado',
    createdAt: '2026-11-03T17:00:00Z',
  },
];

const reconciled = reconcileAllTeachersStudentAttendance({
  teachers,
  students: mockStudents,
  weekRange: week,
  existingRecords,
});

console.log('Total reconciled records:', reconciled.length);

// Teacher Miguelangel teaches Martes + Jueves (2 days). With 2 students = 4 evaluations.
// Teacher Mayuli teaches Martes + Jueves (2 days). With 1 student = 2 evaluations.
// Total expected = 6 evaluations.
if (reconciled.length !== 6) {
  throw new Error(`Expected 6 reconciled records, got ${reconciled.length}`);
}

const s1Records = reconciled.filter(r => r.studentId === 's-miguel-1');
const s1Tue = s1Records.find(r => r.classDate === '2026-11-03');
const s1Thu = s1Records.find(r => r.classDate === '2026-11-05');
if (s1Tue?.status !== 'presente' || s1Tue?.isAutomatic) {
  throw new Error('s-miguel-1 on Tuesday should be explicit "presente"');
}
if (s1Thu?.status !== 'ausente' || !s1Thu?.isAutomatic) {
  throw new Error('s-miguel-1 on Thursday should be auto "ausente" (isAutomatic: true)');
}
console.log('✓ s-miguel-1 Tuesday: presente (explicit), Thursday: ausente (automatic)');

const s2Records = reconciled.filter(r => r.studentId === 's-miguel-2');
if (s2Records.length !== 2 || !s2Records.every(r => r.status === 'ausente' && r.isAutomatic)) {
  throw new Error('s-miguel-2 should have 2 automatic ausente records');
}
console.log('✓ s-miguel-2 (unregistered) assigned to "Ausente (Automático)" for all class dates');

console.log('\n=== TEST 3: Summary Calculations ===');
const miguelTeacher = teachers.find(t => t.id === 'teacher-miguelangel')!;
const miguelOnlyReconciled = reconcileStudentAttendance({
  teacher: miguelTeacher,
  students: mockStudents,
  weekRange: week,
  existingRecords,
});
if (miguelOnlyReconciled.length !== 4) {
  throw new Error(`Expected 4 reconciled records for Miguelangel, got ${miguelOnlyReconciled.length}`);
}
console.log('✓ reconcileStudentAttendance verified for individual teacher');
const summaries = calculateStudentWeeklySummaries({
  teacher: miguelTeacher,
  students: mockStudents,
  weekRange: week,
  reconciledRecords: reconciled,
});

const s1Summ = summaries.find(s => s.student.id === 's-miguel-1')!;
console.log('s1 summary: Rate:', s1Summ.attendanceRate, '%, Presentes:', s1Summ.presentes, 'Ausentes:', s1Summ.ausentes);
if (s1Summ.attendanceRate !== 50 || s1Summ.presentes !== 1 || s1Summ.ausentes !== 1) {
  throw new Error('s1 summary calculation failed');
}

const s2Summ = summaries.find(s => s.student.id === 's-miguel-2')!;
console.log('s2 summary: Rate:', s2Summ.attendanceRate, '%, Presentes:', s2Summ.presentes, 'Ausentes:', s2Summ.ausentes);
if (s2Summ.attendanceRate !== 0 || s2Summ.presentes !== 0 || s2Summ.ausentes !== 2) {
  throw new Error('s2 summary calculation failed');
}
console.log('✓ Summaries and percentages accurately calculated');

console.log('\n=== TEST 4: Excel Sheet Building & Workbook Creation ===');
const wb = XLSX.utils.book_new();

// Sheet 1
const ws1 = buildTeamTeacherSheet(teachers, mockStudents, reconciled, week);
XLSX.utils.book_append_sheet(wb, ws1, 'Por Equipo y Profesor');
console.log('✓ Sheet 1 "Por Equipo y Profesor" appended');

// Sheet 2
const ws2 = buildTeacherStudentsSheet(teachers, mockStudents, reconciled, week);
XLSX.utils.book_append_sheet(wb, ws2, 'Alumnos por Profesor');
console.log('✓ Sheet 2 "Alumnos por Profesor" appended');

// Sheet 3
const ws3 = buildGeneralConsolidatedSheet(teachers, mockStudents, reconciled, week);
XLSX.utils.book_append_sheet(wb, ws3, 'General por Semana');
console.log('✓ Sheet 3 "General por Semana" appended');

console.log('Workbook sheet names:', wb.SheetNames);
if (wb.SheetNames.length !== 3) {
  throw new Error(`Expected 3 sheets, found ${wb.SheetNames.length}`);
}

// Test writing to buffer
const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
console.log('✓ Generated XLSX buffer size:', buf.length, 'bytes');

// Read back the buffer to verify integrity
const readWb = XLSX.read(buf, { type: 'buffer' });
console.log('✓ Re-read XLSX workbook successfully. Sheets:', readWb.SheetNames);
if (readWb.SheetNames.length !== 3) {
  throw new Error('Failed to parse all 3 sheets from generated buffer');
}

console.log('\nALL VERIFICATION CHECKS PASSED SUCCESSFULLY!');
