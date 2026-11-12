import React from 'react';
import type { TeacherWithBlocks } from '../../types';

interface NavigationProps {
  teachers: TeacherWithBlocks[];
  activeTeacherId: string;
  onSelectTeacher: (teacherId: string) => void;
  authenticatedTeachers?: Record<string, boolean>;
}

export const Navigation: React.FC<NavigationProps> = ({
  teachers,
  activeTeacherId,
  onSelectTeacher,
  authenticatedTeachers = {},
}) => {
  return (
    <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs mb-4 sm:mb-6 transition-colors">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-2 sm:space-x-3 overflow-x-auto py-2 sm:py-2.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden scroll-smooth touch-pan-x">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1 sm:mr-2 hidden md:inline-block shrink-0">
            Docentes:
          </span>
          {teachers.map((teacher) => {
            const isActive = teacher.id === activeTeacherId;
            const isAuth = !!authenticatedTeachers[teacher.id];

            return (
              <button
                key={teacher.id}
                type="button"
                onClick={() => onSelectTeacher(teacher.id)}
                className={`group shrink-0 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 min-h-[44px] rounded-xl text-xs sm:text-sm font-medium transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap border touch-manipulation ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                    : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/80 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-500/30'
                }`}
              >
                <span className="text-base shrink-0" role="img" aria-label="profesor">
                  👨‍🏫
                </span>
                <span className="font-semibold hidden sm:inline">{teacher.name}</span>
                <span className="font-semibold sm:hidden">{teacher.shortName}</span>

                <span
                  className={`text-[11px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium ${
                    isActive
                      ? 'bg-blue-500/80 text-white'
                      : 'bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 group-hover:text-blue-700 dark:group-hover:text-blue-300'
                  }`}
                >
                  {teacher.scheduleDays
                    .map((d) => d.charAt(0).toUpperCase() + d.slice(1, 3))
                    .join(' / ')}
                </span>

                <span
                  className="text-xs ml-0.5 opacity-80 shrink-0"
                  title={isAuth ? 'Acceso desbloqueado' : 'Requiere PIN'}
                >
                  {isAuth ? '🔓' : '🔒'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
