import React from 'react';
import type { AttendanceStatus } from '../../types';

interface StatusBadgeProps {
  status: AttendanceStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'sm',
}) => {
  const configs: Record<
    AttendanceStatus,
    { label: string; icon: string; classes: string }
  > = {
    presente: {
      label: 'Presente',
      icon: '✓',
      classes: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    },
    ausente: {
      label: 'Ausente',
      icon: '✗',
      classes: 'bg-rose-100 text-rose-800 border-rose-300',
    },
    justificado: {
      label: 'Justificado',
      icon: '!',
      classes: 'bg-amber-100 text-amber-800 border-amber-300',
    },
  };

  const current = configs[status] || configs.presente;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-2.5 py-1 gap-1.5',
    lg: 'text-base px-3 py-1.5 gap-2 font-semibold',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${current.classes} ${sizeClasses} shadow-2xs`}
    >
      <span className="font-bold leading-none">{current.icon}</span>
      <span>{current.label}</span>
    </span>
  );
};

export default StatusBadge;
