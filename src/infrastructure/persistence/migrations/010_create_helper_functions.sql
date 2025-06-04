-- Función para buscar usuarios compatibles
CREATE OR REPLACE FUNCTION find_potential_matches(
    target_user_id UUID,
    search_radius INTEGER DEFAULT 10,
    limit_results INTEGER DEFAULT 50
)
RETURNS TABLE (
    user_id UUID,
    first_name VARCHAR,
    last_name VARCHAR,
    career VARCHAR,
    semester INTEGER,
    campus VARCHAR,
    compatibility_score INTEGER,
    main_photo_url TEXT
) AS $$
DECLARE
    target_profile RECORD;
BEGIN
    -- Obtener perfil del usuario objetivo
    SELECT ap.career, ap.semester, ap.campus
    INTO target_profile
    FROM academic_profiles ap
    WHERE ap.user_id = target_user_id;
    
    RETURN QUERY
    SELECT 
        u.id,
        u.first_name,
        u.last_name,
        ap.career,
        ap.semester,
        ap.campus,
        -- Cálculo básico de compatibilidad
        CASE 
            WHEN ap.career = target_profile.career THEN 40
            ELSE 0
        END +
        CASE 
            WHEN ap.campus = target_profile.campus THEN 20
            ELSE 0
        END +
        CASE 
            WHEN ABS(ap.semester - target_profile.semester) <= 2 THEN 15
            ELSE 0
        END AS compatibility_score,
        -- Extraer URL de foto principal
        COALESCE(
            (u.photos->>0->>'url'),
            NULL
        ) AS main_photo_url
    FROM users u
    JOIN academic_profiles ap ON u.id = ap.user_id
    LEFT JOIN matches m ON (
        (m.user_id1 = target_user_id AND m.user_id2 = u.id) OR
        (m.user_id2 = target_user_id AND m.user_id1 = u.id)
    )
    WHERE u.id != target_user_id
        AND u.is_active = TRUE
        AND u.is_email_verified = TRUE
        AND u.is_profile_complete = TRUE
        AND m.id IS NULL -- Excluir usuarios ya interactuados
        AND array_length(u.photos, 1) > 0 -- Debe tener al menos una foto
    ORDER BY compatibility_score DESC, u.last_active DESC
    LIMIT limit_results;
END;
$$ LANGUAGE plpgsql;
