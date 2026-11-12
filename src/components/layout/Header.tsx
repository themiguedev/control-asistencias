import React, { useState } from 'react';

interface HeaderProps {
  teacherName?: string;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ teacherName, onLogout }) => {
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
    <header className="bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 text-white shadow-lg sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-3">
            <span className="text-2xl sm:text-3xl filter drop-shadow-sm" role="img" aria-label="portapapeles">
              📋
            </span>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold tracking-tight leading-tight">
                Control de Asistencias CBA
              </h1>
              <p className="text-xs sm:text-sm text-indigo-200">
                Centro Bolivariano Americano — Registro y Control Docente
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-900/60 border border-indigo-400/30 text-xs sm:text-sm font-medium text-indigo-100 shadow-inner">
              <span role="img" aria-label="calendario">📅</span>
              <span>{capitalizedDate}</span>
            </div>

            {teacherName && onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-medium border border-white/20 transition cursor-pointer"
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
