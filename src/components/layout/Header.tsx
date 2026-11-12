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

  // Short format for compact mobile viewports: e.g. "12 nov."
  const shortDate = new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
  }).format(today);
  const capitalizedShortDate = shortDate.charAt(0).toUpperCase() + shortDate.slice(1);

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white shadow-md sticky top-0 z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-2.5 sm:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3">
          {/* Logo & Brand Title */}
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            <img
              src={`${import.meta.env.BASE_URL}logo-team-bellas-artes.jpg`}
              alt="Logo Team Bellas Artes BOTS"
              className="w-9 h-9 sm:w-11 sm:h-11 rounded-full object-cover border-2 border-blue-500/40 shadow-sm shrink-0"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h1 className="text-base sm:text-xl font-bold tracking-tight leading-tight text-white truncate">
                  Control de Asistencias
                </h1>
                <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 whitespace-nowrap">
                  Team Bellas Artes
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons and date indicator */}
          <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs sm:text-sm font-medium text-slate-200 shadow-sm min-h-[44px]">
              <span role="img" aria-label="calendario">📅</span>
              <span className="hidden md:inline">{capitalizedDate}</span>
              <span className="md:hidden">{capitalizedShortDate}</span>
            </div>

            {/* Toggle Modo Oscuro / Claro */}
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-650 text-slate-200 text-xs sm:text-sm font-medium border border-slate-700 transition cursor-pointer min-h-[44px] min-w-[44px] touch-manipulation"
              title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              aria-label="Alternar modo oscuro"
            >
              <span className="text-sm">{darkMode ? '☀️' : '🌙'}</span>
              <span className="hidden md:inline">{darkMode ? 'Claro' : 'Oscuro'}</span>
            </button>

            {teacherName && onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-500/30 text-rose-300 text-xs sm:text-sm font-medium border border-rose-500/30 transition cursor-pointer min-h-[44px] touch-manipulation"
                title="Cerrar sesión de este profesor"
              >
                <span className="hidden sm:inline">Cerrar sesión</span>
                <span className="sm:hidden">Salir</span>
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
