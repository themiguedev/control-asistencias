import React, { useState } from 'react';
import type { TeacherWithBlocks, Student } from '../../types';
import { formatTimeRange12h } from '../../utils/schedule';

interface StudentsManagerProps {
  teacher: TeacherWithBlocks;
  students: Student[];
  onAddStudent: (student: Omit<Student, 'id' | 'createdAt'>) => void;
  onDeleteStudent: (studentId: string) => void;
  onUpdateStudent?: (student: Student) => void;
}

export const StudentsManager: React.FC<StudentsManagerProps> = ({
  teacher,
  students,
  onAddStudent,
  onDeleteStudent,
  onUpdateStudent,
}) => {
  const [fullName, setFullName] = useState('');
  const [selectedBlockId, setSelectedBlockId] = useState<string>(
    teacher.blocks[0]?.id || ''
  );
  const [filterBlockId, setFilterBlockId] = useState<string>('all');
  const [filterTeam, setFilterTeam] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Editing team state
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editTeamValue, setEditTeamValue] = useState('');

  // Support teams for Miguelangel and Luis
  const supportsTeams =
    teacher.id === 'teacher-miguelangel' || teacher.id === 'teacher-luis';
  const isSplit = teacher.blockType === 'split';
  const teacherStudents = students.filter((s) => s.teacherId === teacher.id);

  // Available unique teams for this teacher
  const existingTeams = Array.from(
    new Set(
      teacherStudents
        .map((s) => s.teamName?.trim())
        .filter((t): t is string => Boolean(t))
    )
  );

  const filteredStudents = teacherStudents.filter((s) => {
    const matchesSearch =
      s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.teamName && s.teamName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesBlock = filterBlockId === 'all' || s.blockId === filterBlockId;
    const matchesTeam =
      filterTeam === 'all' ||
      (filterTeam === 'sin-equipo' ? !s.teamName : s.teamName === filterTeam);
    return matchesSearch && matchesBlock && matchesTeam;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    onAddStudent({
      teacherId: teacher.id,
      fullName: fullName.trim(),
      blockId: isSplit ? selectedBlockId : null,
      teamName: null,
    });

    setFullName('');
  };

  const handleStartEditTeam = (student: Student) => {
    setEditingStudentId(student.id);
    setEditTeamValue(student.teamName || '');
  };

  const handleSaveTeam = (student: Student) => {
    if (onUpdateStudent) {
      onUpdateStudent({
        ...student,
        teamName: editTeamValue.trim() ? editTeamValue.trim() : null,
      });
    }
    setEditingStudentId(null);
    setEditTeamValue('');
  };

  const handleRemoveFromTeam = (student: Student) => {
    if (onUpdateStudent) {
      onUpdateStudent({
        ...student,
        teamName: null,
      });
    }
    setEditingStudentId(null);
    setEditTeamValue('');
  };

  const handleCancelEditTeam = () => {
    setEditingStudentId(null);
    setEditTeamValue('');
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3.5 sm:pb-4 mb-4 sm:mb-5 border-b border-slate-100 dark:border-slate-800 gap-2">
        <div>
          <span className="text-[11px] sm:text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            Nómina de Alumnos
          </span>
          <h3 className="text-base sm:text-xl font-bold text-slate-800 dark:text-white">
            Alumnos de {teacher.name}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Total matriculados: <span className="font-semibold text-slate-700 dark:text-slate-200">{teacherStudents.length} alumnos</span>
          </p>
        </div>
      </div>

      {/* Grid: Formulario para registrar alumno + Lista de alumnos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* Formulario de Registro */}
        <div className="lg:col-span-5 bg-slate-50/70 dark:bg-slate-800/40 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <span className="w-7 h-7 rounded-lg bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-bold">
              +
            </span>
            <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base">
              Inscribir Nuevo Alumno
            </h4>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Nombres y Apellidos del Alumno <span className="text-rose-500">*</span>:
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej. Carlos Mendoza Gil"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 min-h-[40px] text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            {isSplit && (
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Bloque Horario Asignado:
                </label>
                <select
                  value={selectedBlockId}
                  onChange={(e) => setSelectedBlockId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 min-h-[40px] text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer"
                >
                  {teacher.blocks.map((block) => (
                    <option key={block.id} value={block.id}>
                      {block.label} ({formatTimeRange12h(block.startTime, block.endTime)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="submit"
              className="w-full mt-2 py-2.5 sm:py-3 px-4 min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs sm:text-sm transition shadow-sm cursor-pointer touch-manipulation flex items-center justify-center"
            >
              Registrar Alumno
            </button>
          </form>
        </div>

        {/* Listado y Búsqueda de Alumnos */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative flex-1 w-full">
              <span className="absolute left-3 top-2.5 text-xs text-slate-400">🔍</span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={supportsTeams ? "Buscar por alumno o equipo..." : "Buscar alumno por nombre..."}
                className="w-full pl-8 pr-3 py-2 min-h-[38px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            {supportsTeams && existingTeams.length > 0 && (
              <select
                value={filterTeam}
                onChange={(e) => setFilterTeam(e.target.value)}
                className="w-full sm:w-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 min-h-[38px] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer"
              >
                <option value="all">Todos los equipos</option>
                <option value="sin-equipo">Sin equipo asignado</option>
                {existingTeams.map((team) => (
                  <option key={team} value={team}>
                    🤖 {team}
                  </option>
                ))}
              </select>
            )}

            {isSplit && (
              <select
                value={filterBlockId}
                onChange={(e) => setFilterBlockId(e.target.value)}
                className="w-full sm:w-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 min-h-[38px] text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer"
              >
                <option value="all">Todos los bloques</option>
                {teacher.blocks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          {filteredStudents.length === 0 ? (
            <div className="p-6 sm:p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20">
              <span className="text-3xl block mb-2">👥</span>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No hay alumnos registrados {searchTerm ? 'con esa búsqueda' : ''}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Utiliza el formulario de la izquierda para agregar alumnos a este profesor.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-0.5">
              {filteredStudents.map((student, idx) => {
                const assignedBlock = teacher.blocks.find(
                  (b) => b.id === student.blockId
                );

                const isEditingThisStudent = editingStudentId === student.id;

                return (
                  <div
                    key={student.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-blue-200 dark:hover:border-blue-900/60 transition shadow-2xs gap-2.5 sm:gap-3"
                  >
                    <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0">
                      <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center border border-blue-200 dark:border-blue-800 shrink-0 mt-0.5 sm:mt-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <h5 className="text-sm font-bold text-slate-800 dark:text-white break-words">
                            {student.fullName}
                          </h5>

                          {supportsTeams && !isEditingThisStudent && (
                            student.teamName ? (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditTeam(student)}
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 min-h-[28px] rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-800/60 transition cursor-pointer touch-manipulation active:scale-95"
                                  title="Clic para cambiar de equipo"
                                >
                                  <span>🤖 {student.teamName}</span>
                                  <span className="text-[10px] opacity-70">✎</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFromTeam(student)}
                                  className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition cursor-pointer text-xs touch-manipulation active:scale-90"
                                  title="Sacar al alumno de este equipo"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleStartEditTeam(student)}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 min-h-[28px] rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer touch-manipulation active:scale-95"
                                title="Asignar a un equipo"
                              >
                                <span>+ Asignar equipo</span>
                              </button>
                            )
                          )}
                        </div>

                        {/* Inline Team Editor */}
                        {supportsTeams && isEditingThisStudent && (
                          <div className="mt-2 flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-blue-200 dark:border-blue-900/50">
                            <span className="text-xs">🤖</span>
                            <input
                              type="text"
                              value={editTeamValue}
                              onChange={(e) => setEditTeamValue(e.target.value)}
                              placeholder="Nombre del equipo..."
                              list="teams-edit-options"
                              className="flex-1 min-w-[130px] px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[34px]"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveTeam(student);
                                if (e.key === 'Escape') handleCancelEditTeam();
                              }}
                            />
                            {existingTeams.length > 0 && (
                              <datalist id="teams-edit-options">
                                {existingTeams.map((t) => (
                                  <option key={t} value={t} />
                                ))}
                              </datalist>
                            )}
                            <div className="flex items-center gap-1 flex-wrap">
                              <button
                                type="button"
                                onClick={() => handleSaveTeam(student)}
                                className="px-2.5 py-1.5 min-h-[34px] rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer transition touch-manipulation active:scale-95"
                              >
                                Guardar
                              </button>
                              {student.teamName && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFromTeam(student)}
                                  className="px-2.5 py-1.5 min-h-[34px] rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-300 text-xs font-semibold cursor-pointer transition border border-rose-200 dark:border-rose-900/40 touch-manipulation active:scale-95"
                                  title="Quitar equipo y dejar sin equipo"
                                >
                                  Quitar equipo
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={handleCancelEditTeam}
                                className="px-2.5 py-1.5 min-h-[34px] rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 text-xs font-medium cursor-pointer transition touch-manipulation active:scale-95"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        )}

                        {assignedBlock && (
                          <div className="mt-1">
                            <span className="bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded text-[11px] font-medium border border-blue-200 dark:border-blue-800/60 inline-block">
                              🕒 {assignedBlock.label} ({formatTimeRange12h(assignedBlock.startTime, assignedBlock.endTime)})
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => onDeleteStudent(student.id)}
                        className="p-2 min-w-[36px] min-h-[36px] rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer flex items-center justify-center touch-manipulation active:scale-90"
                        title="Eliminar alumno"
                        aria-label="Eliminar alumno"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentsManager;
