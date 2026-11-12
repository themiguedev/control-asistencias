-- ==============================================================================
-- SISCEBA - Esquema de Base de Datos PostgreSQL / Supabase
-- Sistema de Control y Reporte de Asistencias CBA
-- ==============================================================================

-- 0. Extensiones útiles
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLA: teachers (Profesores)
CREATE TABLE IF NOT EXISTS public.teachers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    short_name TEXT,
    schedule_days TEXT[] NOT NULL DEFAULT '{}',
    block_type TEXT NOT NULL DEFAULT 'continuous',
    pin TEXT NOT NULL,
    blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. TABLA: teams (Equipos opcionales / clubes de robótica u organizacionales)
CREATE TABLE IF NOT EXISTS public.teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    teacher_id TEXT REFERENCES public.teachers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. TABLA: students (Estudiantes)
CREATE TABLE IF NOT EXISTS public.students (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    identifier TEXT,
    teacher_id TEXT REFERENCES public.teachers(id) ON DELETE SET NULL,
    team_name TEXT,
    block_id TEXT,
    contact_phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. TABLA: attendance_records (Registros de asistencia diaria de estudiantes)
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id TEXT PRIMARY KEY,
    student_id TEXT REFERENCES public.students(id) ON DELETE CASCADE,
    teacher_id TEXT REFERENCES public.teachers(id) ON DELETE SET NULL,
    date TEXT NOT NULL, -- Formato YYYY-MM-DD para consistencia con classDate
    status TEXT NOT NULL CHECK (status IN ('presente', 'ausente', 'justificado')),
    block_id TEXT,
    observations TEXT, -- Notas / observaciones
    notes TEXT,        -- Alias compatible con frontend
    is_automatic BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índices recomendados para optimización de consultas
CREATE INDEX IF NOT EXISTS idx_students_teacher_id ON public.students(teacher_id);
CREATE INDEX IF NOT EXISTS idx_students_block_id ON public.students(block_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student_id ON public.attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_teacher_date ON public.attendance_records(teacher_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_block_id ON public.attendance_records(block_id);

-- 5. Habilitar RLS (Row Level Security) y Políticas Permisivas
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas para acceso anónimo (lectura y escritura públicas durante desarrollo / frontend estático)
DROP POLICY IF EXISTS "Permissive anonymous full access for teachers" ON public.teachers;
CREATE POLICY "Permissive anonymous full access for teachers"
    ON public.teachers
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Permissive anonymous full access for teams" ON public.teams;
CREATE POLICY "Permissive anonymous full access for teams"
    ON public.teams
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Permissive anonymous full access for students" ON public.students;
CREATE POLICY "Permissive anonymous full access for students"
    ON public.students
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Permissive anonymous full access for attendance_records" ON public.attendance_records;
CREATE POLICY "Permissive anonymous full access for attendance_records"
    ON public.attendance_records
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 6. Semillas Iniciales (Seed Data)

-- Profesores Oficiales CBA
INSERT INTO public.teachers (id, name, short_name, schedule_days, block_type, pin, blocks)
VALUES
(
    'teacher-miguelangel',
    'Miguelangel Contreras',
    'Miguelangel',
    ARRAY['martes', 'jueves'],
    'continuous',
    '1234',
    '[
        {
            "id": "block-miguelangel-1",
            "teacherId": "teacher-miguelangel",
            "label": "Clase 4:00 - 6:00 PM",
            "startTime": "16:00",
            "endTime": "18:00"
        }
    ]'::jsonb
),
(
    'teacher-luis',
    'Luis Reyes',
    'Luis',
    ARRAY['lunes', 'viernes'],
    'continuous',
    '5678',
    '[
        {
            "id": "block-luis-1",
            "teacherId": "teacher-luis",
            "label": "Clase 4:00 - 6:00 PM",
            "startTime": "16:00",
            "endTime": "18:00"
        }
    ]'::jsonb
),
(
    'teacher-mayuli',
    'Mayuli Contreras',
    'Mayuli',
    ARRAY['martes', 'jueves'],
    'split',
    '9012',
    '[
        {
            "id": "block-mayuli-1",
            "teacherId": "teacher-mayuli",
            "label": "Bloque 1 — 4:00 - 5:00 PM",
            "startTime": "16:00",
            "endTime": "17:00"
        },
        {
            "id": "block-mayuli-2",
            "teacherId": "teacher-mayuli",
            "label": "Bloque 2 — 5:00 - 6:00 PM",
            "startTime": "17:00",
            "endTime": "18:00"
        }
    ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    short_name = EXCLUDED.short_name,
    schedule_days = EXCLUDED.schedule_days,
    block_type = EXCLUDED.block_type,
    pin = EXCLUDED.pin,
    blocks = EXCLUDED.blocks;

-- Equipos iniciales de robótica
INSERT INTO public.teams (id, name, description, teacher_id)
VALUES
    ('team-robotitans', 'RoboTitans', 'Equipo de robótica y tecnología', 'teacher-miguelangel'),
    ('team-cyberbot', 'CyberBot', 'Equipo de mecatrónica y programación', 'teacher-miguelangel'),
    ('team-techwarriors', 'TechWarriors', 'Equipo de desarrollo y circuitos', 'teacher-luis')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    teacher_id = EXCLUDED.teacher_id;

-- Estudiantes iniciales
INSERT INTO public.students (id, full_name, identifier, teacher_id, team_name, block_id, contact_phone)
VALUES
    ('stu-1', 'Alejandro Morales Vera', 'V-29401234', 'teacher-miguelangel', 'RoboTitans', 'block-miguelangel-1', '0414-5551234'),
    ('stu-2', 'Valeria Sofía Rivas', 'V-30112445', 'teacher-miguelangel', 'RoboTitans', 'block-miguelangel-1', '0424-7778899'),
    ('stu-6', 'Matías David Silva', 'V-31220455', 'teacher-miguelangel', 'CyberBot', 'block-miguelangel-1', '0412-8881122'),
    ('stu-7', 'Isabella Sofía Castro', 'V-29883441', 'teacher-miguelangel', 'CyberBot', 'block-miguelangel-1', '0416-2223344'),
    ('stu-3', 'Gabriel Isaac Peña', 'V-28900112', 'teacher-luis', 'TechWarriors', 'block-luis-1', '0412-3334455'),
    ('stu-8', 'Diego Alejandro Rangel', 'V-30441290', 'teacher-luis', 'TechWarriors', 'block-luis-1', '0424-6667788'),
    ('stu-9', 'Lucía Elena Morales', 'V-31552011', 'teacher-luis', 'RoboTitans', 'block-luis-1', '0414-3339900'),
    ('stu-4', 'Camila Andrea Gómez', 'V-31002334', 'teacher-mayuli', NULL, 'block-mayuli-1', '0416-8889900'),
    ('stu-10', 'Sebastián Andrés Ruiz', 'V-30771892', 'teacher-mayuli', NULL, 'block-mayuli-1', '0414-1122334'),
    ('stu-5', 'Santiago José Torres', 'V-30889123', 'teacher-mayuli', NULL, 'block-mayuli-2', '0414-9990011'),
    ('stu-11', 'Valentina Paula Méndez', 'V-29661445', 'teacher-mayuli', NULL, 'block-mayuli-2', '0426-5544332')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    identifier = EXCLUDED.identifier,
    teacher_id = EXCLUDED.teacher_id,
    team_name = EXCLUDED.team_name,
    block_id = EXCLUDED.block_id,
    contact_phone = EXCLUDED.contact_phone;
