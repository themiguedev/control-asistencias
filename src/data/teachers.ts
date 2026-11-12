import type { TeacherWithBlocks } from '../types';

export const teachers: TeacherWithBlocks[] = [
  {
    id: 'teacher-miguelangel',
    name: 'Miguelangel Contreras',
    shortName: 'Miguelangel',
    scheduleDays: ['martes', 'jueves'],
    blockType: 'continuous',
    pin: '1234',
    blocks: [
      {
        id: 'block-miguelangel-1',
        teacherId: 'teacher-miguelangel',
        label: 'Clase 4:00 - 6:00 PM',
        startTime: '16:00',
        endTime: '18:00',
      },
    ],
  },
  {
    id: 'teacher-luis',
    name: 'Luis Reyes',
    shortName: 'Luis',
    scheduleDays: ['lunes', 'viernes'],
    blockType: 'continuous',
    pin: '5678',
    blocks: [
      {
        id: 'block-luis-1',
        teacherId: 'teacher-luis',
        label: 'Clase 4:00 - 6:00 PM',
        startTime: '16:00',
        endTime: '18:00',
      },
    ],
  },
  {
    id: 'teacher-mayuli',
    name: 'Mayuli Contreras',
    shortName: 'Mayuli',
    scheduleDays: ['martes', 'jueves'],
    blockType: 'split',
    pin: '9012',
    blocks: [
      {
        id: 'block-mayuli-1',
        teacherId: 'teacher-mayuli',
        label: 'Bloque 1 — 4:00 - 5:00 PM',
        startTime: '16:00',
        endTime: '17:00',
      },
      {
        id: 'block-mayuli-2',
        teacherId: 'teacher-mayuli',
        label: 'Bloque 2 — 5:00 - 6:00 PM',
        startTime: '17:00',
        endTime: '18:00',
      },
    ],
  },
];
