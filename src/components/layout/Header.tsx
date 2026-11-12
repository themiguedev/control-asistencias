import React, { useState } from 'react';

interface HeaderProps {
  teacherName?: string;
  onLogout?: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  teacherName,
  onLogout,
  darkMode,
  onToggleDarkMode,
}) => {
  const [today] = useState(() => new Date());
  const dateFormatted = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(today);

  // Capitalize first letter in Spanish: e.g. "Jueves, 12 de noviembre de 2026"
  const capitalizedDate = dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1);

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white shadow-md sticky top-0 z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-2xl shadow-inner">
              📋
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight leading-tight text-white">
                  Control de Asistencias CBA
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Docentes
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs sm:text-sm font-medium text-slate-200 shadow-sm">
              <span role="img" aria-label="calendario">📅</span>
              <span>{capitalizedDate}</span>
            </div>

            {/* Toggle Modo Oscuro / Claro */}
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-medium border border-slate-700 transition cursor-pointer"
              title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              aria-label="Alternar modo oscuro"
            >
              <span>{darkMode ? '☀️' : '🌙'}</span>
              <span className="hidden md:inline">{darkMode ? 'Claro' : 'Oscuro'}</span>
            </button>

            {teacherName && onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs sm:text-sm font-medium border border-rose-500/30 transition cursor-pointer"
                title="Cerrar sesión de este profesor"
              >
                <span>Cerrar sesión</span>
                <span>🔒</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
