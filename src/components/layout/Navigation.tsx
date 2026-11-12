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
    <nav className="bg-white border-b border-gray-200 shadow-xs mb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-2 sm:space-x-3 overflow-x-auto py-2.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 mr-2 hidden md:inline-block">
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
                className={`group flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer whitespace-nowrap border ${
                  isActive
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200'
                }`}
              >
                <span className="text-base" role="img" aria-label="profesor">
                  👨‍🏫
                </span>
                <span className="font-semibold">{teacher.name}</span>

                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    isActive
                      ? 'bg-indigo-500/80 text-white'
                      : 'bg-gray-200/80 text-gray-600 group-hover:bg-indigo-100 group-hover:text-indigo-700'
                  }`}
                >
                  {teacher.scheduleDays
                    .map((d) => d.charAt(0).toUpperCase() + d.slice(1, 3))
                    .join(' / ')}
                </span>

                <span
                  className="text-xs ml-0.5 opacity-80"
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
