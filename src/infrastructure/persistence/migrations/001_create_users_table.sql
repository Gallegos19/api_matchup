CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Tabla de usuarios principales
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    bio TEXT DEFAULT '',
    interests TEXT[] DEFAULT '{}',
    photos JSONB DEFAULT '[]',
    is_email_verified BOOLEAN DEFAULT FALSE,
    is_profile_complete BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de perfiles académicos
CREATE TABLE academic_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id VARCHAR(50) UNIQUE NOT NULL,
    career VARCHAR(100) NOT NULL,
    semester INTEGER NOT NULL CHECK (semester >= 1 AND semester <= 12),
    campus VARCHAR(50) NOT NULL,
    university VARCHAR(200) DEFAULT 'Universidad Autónoma de Chiapas',
    academic_interests TEXT[] DEFAULT '{}',
    study_schedule JSONB DEFAULT '{}',
    gpa DECIMAL(3,2) CHECK (gpa >= 0 AND gpa <= 4.0),
    graduation_year INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimizar búsquedas
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_users_email_verified ON users(is_email_verified) WHERE is_email_verified = TRUE;
CREATE INDEX idx_users_last_active ON users(last_active);

CREATE INDEX idx_academic_profiles_user_id ON academic_profiles(user_id);
CREATE INDEX idx_academic_profiles_student_id ON academic_profiles(student_id);
CREATE INDEX idx_academic_profiles_career_campus ON academic_profiles(career, campus);
CREATE INDEX idx_academic_profiles_semester ON academic_profiles(semester);
