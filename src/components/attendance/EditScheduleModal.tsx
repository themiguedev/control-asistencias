import React, { useState } from 'react';
import type { TeacherWithBlocks, Block, DayOfWeek, BlockType } from '../../types';

interface EditScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: TeacherWithBlocks;
  onSave: (updatedTeacher: TeacherWithBlocks) => void;
}

const ALL_DAYS: { id: DayOfWeek; label: string }[] = [
  { id: 'lunes', label: 'Lunes' },
  { id: 'martes', label: 'Martes' },
  { id: 'miércoles', label: 'Miércoles' },
  { id: 'jueves', label: 'Jueves' },
  { id: 'viernes', label: 'Viernes' },
];

export const EditScheduleModal: React.FC<EditScheduleModalProps> = ({
  isOpen,
  onClose,
  teacher,
  onSave,
}) => {
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>(teacher.scheduleDays || []);
  const [mode, setMode] = useState<BlockType>(teacher.blockType || 'continuous');
  const [blocks, setBlocks] = useState<Block[]>(() => {
    if (teacher.blocks && teacher.blocks.length > 0) {
      return teacher.blocks.map((b) => ({ ...b }));
    }
    return [
      {
        id: `block-${teacher.id}-1`,
        teacherId: teacher.id,
        label: 'Clase Regular',
        startTime: '16:00',
        endTime: '18:00',
      },
    ];
  });

  if (!isOpen) return null;

  const toggleDay = (day: DayOfWeek) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleModeChange = (newMode: BlockType) => {
    setMode(newMode);
    if (newMode === 'continuous') {
      // Single continuous block
      setBlocks([
        {
          id: `block-${teacher.id}-1`,
          teacherId: teacher.id,
          label: 'Clase Regular 4:00 - 6:00 PM',
          startTime: blocks[0]?.startTime || '16:00',
          endTime: blocks[0]?.endTime || '18:00',
        },
      ]);
    } else {
      // Split into 2 or more blocks
      if (blocks.length < 2) {
        setBlocks([
          {
            id: `block-${teacher.id}-1`,
            teacherId: teacher.id,
            label: 'Bloque 1',
            startTime: '16:00',
            endTime: '17:00',
          },
          {
            id: `block-${teacher.id}-2`,
            teacherId: teacher.id,
            label: 'Bloque 2',
            startTime: '17:00',
            endTime: '18:00',
          },
        ]);
      }
    }
  };

  const updateBlock = (index: number, field: keyof Block, value: string) => {
    setBlocks((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const addBlock = () => {
    const nextIdx = blocks.length + 1;
    setBlocks((prev) => [
      ...prev,
      {
        id: `block-${teacher.id}-${Date.now()}`,
        teacherId: teacher.id,
        label: `Bloque ${nextIdx}`,
        startTime: '18:00',
        endTime: '19:00',
      },
    ]);
  };

  const removeBlock = (index: number) => {
    if (blocks.length <= 1) return;
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDays.length === 0) {
      alert('Por favor selecciona al menos un día de clase.');
      return;
    }

    const updatedTeacher: TeacherWithBlocks = {
      ...teacher,
      scheduleDays: selectedDays,
      blockType: mode,
      blocks: blocks.map((b, idx) => ({
        ...b,
        label: b.label.trim() || `Bloque ${idx + 1}`,
      })),
    };

    onSave(updatedTeacher);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">⏰</span>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                Editar Horario y Bloques
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Profesor: <span className="font-semibold text-blue-600 dark:text-blue-400">{teacher.name}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
          {/* 1. Días de Clase */}
          <div className="space-y-2">
            <label className="font-bold text-slate-700 dark:text-slate-300 block">
              1. Días de Clase Asignados
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 sm:gap-2">
              {ALL_DAYS.map((d) => {
                const active = selectedDays.includes(d.id);
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => toggleDay(d.id)}
                    className={`py-2 px-2 rounded-xl font-semibold text-center border transition cursor-pointer touch-manipulation ${
                      active
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-200'
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Tipo de Distribución */}
          <div className="space-y-2">
            <label className="font-bold text-slate-700 dark:text-slate-300 block">
              2. Modalidad de Horario
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleModeChange('continuous')}
                className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                  mode === 'continuous'
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200 font-semibold shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>⏱️</span>
                  <span className="font-bold text-xs sm:text-sm">Horario Continuo</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Una sola sesión (ej. 4:00 PM a 6:00 PM)
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleModeChange('split')}
                className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                  mode === 'split'
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200 font-semibold shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>📑</span>
                  <span className="font-bold text-xs sm:text-sm">Por Bloques / Turnos</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Múltiples sesiones separadas (ej. 4-5 PM y 5-6 PM)
                </p>
              </button>
            </div>
          </div>

          {/* 3. Bloques Horarios */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                3. Configuración de Horas
              </label>
              {mode === 'split' && (
                <button
                  type="button"
                  onClick={addBlock}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-bold"
                >
                  + Añadir Bloque
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {blocks.map((b, idx) => (
                <div
                  key={b.id || idx}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={b.label}
                      onChange={(e) => updateBlock(idx, 'label', e.target.value)}
                      placeholder="Nombre del bloque (ej. Bloque 1 o Taller)"
                      className="font-semibold text-xs sm:text-sm bg-transparent border-b border-transparent focus:border-blue-500 outline-none text-slate-900 dark:text-white w-full"
                    />
                    {mode === 'split' && blocks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeBlock(idx)}
                        className="text-xs text-rose-500 hover:text-rose-600 font-bold px-2 py-1"
                        title="Eliminar este bloque"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
                        Hora Inicio:
                      </span>
                      <input
                        type="time"
                        value={b.startTime}
                        onChange={(e) => updateBlock(idx, 'startTime', e.target.value)}
                        required
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl px-2.5 py-1.5 focus:border-blue-500 outline-none font-mono text-xs sm:text-sm"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
                        Hora Fin:
                      </span>
                      <input
                        type="time"
                        value={b.endTime}
                        onChange={(e) => updateBlock(idx, 'endTime', e.target.value)}
                        required
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl px-2.5 py-1.5 focus:border-blue-500 outline-none font-mono text-xs sm:text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold transition shadow-md"
            >
              Guardar Horario
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditScheduleModal;
