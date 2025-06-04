CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id1 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_id2 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'unmatched', 'blocked')),
    matched_at TIMESTAMP WITH TIME ZONE,
    compatibility INTEGER DEFAULT 0 CHECK (compatibility >= 0 AND compatibility <= 100),
    user1_action VARCHAR(20) CHECK (user1_action IN ('like', 'dislike', 'super_like')),
    user2_action VARCHAR (20) CHECK (user2_action IN ('like', 'dislike', 'super_like')),
    last_interaction TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint para evitar matches duplicados
    CONSTRAINT unique_match_pair UNIQUE (user_id1, user_id2),
    
    -- Constraint para evitar auto-matches
    CONSTRAINT no_self_match CHECK (user_id1 != user_id2)
);

-- Índices para matches
CREATE INDEX idx_matches_user_id1 ON matches(user_id1);
CREATE INDEX idx_matches_user_id2 ON matches(user_id2);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_matched_at ON matches(matched_at) WHERE status = 'matched';
CREATE INDEX idx_matches_last_interaction ON matches(last_interaction);

-- Índice compuesto para buscar matches de un usuario
CREATE INDEX idx_matches_user_status ON matches(user_id1, status);
CREATE INDEX idx_matches_user2_status ON matches(user_id2, status);