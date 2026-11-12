import React, { useState } from 'react';
import type { TeacherWithBlocks, Student } from '../../types';

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
}) => {
  const [fullName, setFullName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [selectedBlockId, setSelectedBlockId] = useState<string>(
    teacher.blocks[0]?.id || ''
  );
  const [filterBlockId, setFilterBlockId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const isSplit = teacher.blockType === 'split';
  const teacherStudents = students.filter((s) => s.teacherId === teacher.id);

  const filteredStudents = teacherStudents.filter((s) => {
    const matchesSearch =
      s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.identifier && s.identifier.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesBlock = filterBlockId === 'all' || s.blockId === filterBlockId;
    return matchesSearch && matchesBlock;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    onAddStudent({
      teacherId: teacher.id,
      fullName: fullName.trim(),
      identifier: identifier.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      blockId: isSplit ? selectedBlockId : null,
    });

    setFullName('');
    setIdentifier('');
    setContactPhone('');
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 mb-5 border-b border-slate-100 dark:border-slate-800 gap-2">
        <div>
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            Nómina de Alumnos
          </span>
          <h3 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white">
            Alumnos de {teacher.name}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Total matriculados: <span className="font-semibold text-slate-700 dark:text-slate-200">{teacherStudents.length} alumnos</span>
          </p>
        </div>
      </div>

      {/* Grid: Formulario para registrar alumno + Lista de alumnos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Formulario de Registro */}
        <div className="lg:col-span-5 bg-slate-50/70 dark:bg-slate-800/40 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-7 h-7 rounded-lg bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-bold">
              +
            </span>
            <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base">
              Inscribir Nuevo Alumno
            </h4>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Nombres y Apellidos <span className="text-rose-500">*</span>:
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej. Carlos Mendoza Gil"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Cédula / Identificador:
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Ej. V-28123456"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Teléfono de Contacto:
                </label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="Ej. 0414-1234567"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>
            </div>

            {isSplit && (
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Bloque Horario Asignado:
                </label>
                <select
                  value={selectedBlockId}
                  onChange={(e) => setSelectedBlockId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                >
                  {teacher.blocks.map((block) => (
                    <option key={block.id} value={block.id}>
                      {block.label} ({block.startTime} - {block.endTime})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="submit"
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs sm:text-sm transition shadow-sm cursor-pointer"
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
                placeholder="Buscar por nombre o cédula..."
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            {isSplit && (
              <select
                value={filterBlockId}
                onChange={(e) => setFilterBlockId(e.target.value)}
                className="w-full sm:w-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
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
            <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20">
              <span className="text-3xl block mb-2">👥</span>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No hay alumnos registrados {searchTerm ? 'con esa búsqueda' : ''}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Utiliza el formulario de la izquierda para agregar alumnos a este profesor.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {filteredStudents.map((student, idx) => {
                const assignedBlock = teacher.blocks.find(
                  (b) => b.id === student.blockId
                );

                return (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-3 sm:p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-blue-200 dark:hover:border-blue-900/40 transition shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center border border-blue-200 dark:border-blue-800">
                        {idx + 1}
                      </span>
                      <div>
                        <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                          {student.fullName}
                        </h5>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                          {student.identifier && (
                            <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px] text-slate-600 dark:text-slate-300">
                              ID: {student.identifier}
                            </span>
                          )}
                          {student.contactPhone && (
                            <span>📞 {student.contactPhone}</span>
                          )}
                          {assignedBlock && (
                            <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 rounded text-[11px] font-medium border border-indigo-200 dark:border-indigo-800/40">
                              🕒 {assignedBlock.label} ({assignedBlock.startTime} - {assignedBlock.endTime})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteStudent(student.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                      title="Eliminar alumno"
                    >
                      🗑️
                    </button>
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
