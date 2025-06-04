-- Tabla de grupos de estudio
CREATE TABLE IF NOT EXISTS study_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    subject VARCHAR(100) NOT NULL,
    career VARCHAR(100),
    semester INTEGER CHECK (semester >= 1 AND semester <= 12),
    campus VARCHAR(50) NOT NULL,
    max_members INTEGER DEFAULT 10 CHECK (max_members > 0),
    current_members INTEGER DEFAULT 1 CHECK (current_members >= 0),
    study_schedule JSONB DEFAULT '{}',
    is_private BOOLEAN DEFAULT FALSE,
    requirements JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_member_count CHECK (current_members <= max_members)
);

-- Tabla de miembros de grupos de estudio
CREATE TABLE IF NOT EXISTS study_group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('creator', 'admin', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_group_membership UNIQUE (group_id, user_id)
);

-- Índices para grupos de estudio
CREATE INDEX IF NOT EXISTS idx_study_groups_creator_id ON study_groups(creator_id);
CREATE INDEX IF NOT EXISTS idx_study_groups_campus ON study_groups(campus);
CREATE INDEX IF NOT EXISTS idx_study_groups_career ON study_groups(career);
CREATE INDEX IF NOT EXISTS idx_study_groups_subject ON study_groups(subject);
CREATE INDEX IF NOT EXISTS idx_study_groups_status ON study_groups(status);

-- Índices para miembros de grupos
CREATE INDEX IF NOT EXISTS idx_study_group_members_group_id ON study_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_study_group_members_user_id ON study_group_members(user_id);