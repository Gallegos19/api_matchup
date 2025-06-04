// Importaciones corregidas
const User = require("../../../domain/entities/User");
const AcademicProfile = require("../../../domain/entities/AcademicProfile");
const { v4: uuidv4 } = require("uuid");

class PostgreSQLUserRepository {
  constructor(database) {
    this.db = database;
  }

  async save(user) {
    try {
      return await this.db.withTransaction(async (client) => {
        // 1. Insertar usuario
        const userQuery = `
          INSERT INTO users (
            id, email, password_hash, first_name, last_name, date_of_birth,
            bio, interests, photos, is_email_verified, is_profile_complete,
            is_active, last_active, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
          ) RETURNING *
        `;

        const userValues = [
          user.id || uuidv4(),
          user.email,
          user.passwordHash,
          user.firstName,
          user.lastName,
          user.dateOfBirth,
          user.bio || "",
          user.interests || [],
          JSON.stringify(user.photos || []),
          user.isEmailVerified || false,
          user.isProfileComplete || false,
          user.isActive !== false,
          user.lastActive || new Date(),
          user.createdAt || new Date(),
          user.updatedAt || new Date(),
        ];

        console.log("💾 Ejecutando inserción de usuario...");
        const userResult = await client.query(userQuery, userValues);
        const savedUser = userResult.rows[0];
        console.log("✅ Usuario insertado con ID:", savedUser.id);

        // 2. Insertar perfil académico si existe
        if (user.academicProfile) {
          const profileQuery = `
            INSERT INTO academic_profiles (
              id, user_id, student_id, career, semester, campus, university,
              academic_interests, study_schedule, gpa, graduation_year,
              created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
            ) RETURNING *
          `;

          const profileValues = [
            user.academicProfile.id || uuidv4(),
            savedUser.id,
            user.academicProfile.studentId,
            user.academicProfile.career,
            user.academicProfile.semester,
            user.academicProfile.campus,
            user.academicProfile.university ||
              "Universidad Politécnica de Chiapas",
            user.academicProfile.academicInterests || [],
            JSON.stringify(user.academicProfile.studySchedule || {}),
            user.academicProfile.gpa,
            user.academicProfile.graduationYear,
            user.academicProfile.createdAt || new Date(),
            user.academicProfile.updatedAt || new Date(),
          ];

          console.log("💾 Ejecutando inserción de perfil académico...");
          await client.query(profileQuery, profileValues);
          console.log("✅ Perfil académico insertado");
        }

        // 3. Retornar el usuario completo directamente sin mapear por ahora
        console.log("📄 Retornando usuario guardado...");
        return {
          id: savedUser.id,
          email: savedUser.email,
          firstName: savedUser.first_name,
          lastName: savedUser.last_name,
          passwordHash: savedUser.password_hash,
          dateOfBirth: savedUser.date_of_birth,
          bio: savedUser.bio,
          interests: savedUser.interests,
          photos:
            typeof savedUser.photos === "string"
              ? JSON.parse(savedUser.photos)
              : savedUser.photos,
          isEmailVerified: savedUser.is_email_verified,
          isProfileComplete: savedUser.is_profile_complete,
          isActive: savedUser.is_active,
          lastActive: savedUser.last_active,
          createdAt: savedUser.created_at,
          updatedAt: savedUser.updated_at,
          academicProfile: user.academicProfile,
        };
      });
    } catch (error) {
      console.error("Error guardando usuario:", error);
      throw error;
    }
  }

  async findById(id, client = null) {
    const queryClient = client || this.db;

    const query = `
      SELECT 
        u.*,
        ap.id as profile_id,
        ap.student_id,
        ap.career,
        ap.semester,
        ap.campus,
        ap.university,
        ap.academic_interests,
        ap.study_schedule,
        ap.gpa,
        ap.graduation_year
      FROM users u
      LEFT JOIN academic_profiles ap ON u.id = ap.user_id
      WHERE u.id = $1
    `;

    const result = await queryClient.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    // Retornar objeto plano por ahora
    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      passwordHash: row.password_hash,
      dateOfBirth: row.date_of_birth,
      bio: row.bio,
      interests: row.interests,
      photos:
        typeof row.photos === "string" ? JSON.parse(row.photos) : row.photos,
      isEmailVerified: row.is_email_verified,
      isProfileComplete: row.is_profile_complete,
      isActive: row.is_active,
      lastActive: row.last_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      academicProfile: row.profile_id
        ? {
            id: row.profile_id,
            userId: row.id,
            studentId: row.student_id,
            career: row.career,
            semester: row.semester,
            campus: row.campus,
            university: row.university,
            academicInterests: row.academic_interests,
            studySchedule:
              typeof row.study_schedule === "string"
                ? JSON.parse(row.study_schedule)
                : row.study_schedule,
            gpa: row.gpa,
            graduationYear: row.graduation_year,
          }
        : null,
    };
  }

  async findByEmail(email) {
    const query = `
      SELECT 
        u.*,
        ap.id as profile_id,
        ap.student_id,
        ap.career,
        ap.semester,
        ap.campus,
        ap.university,
        ap.academic_interests,
        ap.study_schedule,
        ap.gpa,
        ap.graduation_year
      FROM users u
      LEFT JOIN academic_profiles ap ON u.id = ap.user_id
      WHERE u.email = $1
    `;

    const result = await this.db.query(query, [email]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.findById(result.rows[0].id);
  }

  async findByStudentId(studentId) {
    const query = `
      SELECT 
        u.*,
        ap.id as profile_id,
        ap.student_id,
        ap.career,
        ap.semester,
        ap.campus,
        ap.university,
        ap.academic_interests,
        ap.study_schedule,
        ap.gpa,
        ap.graduation_year
      FROM users u
      JOIN academic_profiles ap ON u.id = ap.user_id
      WHERE ap.student_id = $1
    `;

    const result = await this.db.query(query, [studentId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.findById(result.rows[0].id);
  }

  async findPotentialMatches(userId, filters = {}) {
    const query = `
      SELECT 
        u.id as user_id,
        u.first_name,
        u.last_name,
        ap.career,
        ap.semester,
        ap.campus,
        50 as compatibility_score,
        (u.photos->>0->>'url') as main_photo_url
      FROM users u
      JOIN academic_profiles ap ON u.id = ap.user_id
      WHERE u.id != $1
        AND u.is_active = TRUE
        AND u.is_email_verified = TRUE
        AND u.is_profile_complete = TRUE
      ORDER BY u.last_active DESC
      LIMIT $2
    `;

    const result = await this.db.query(query, [userId, filters.limit || 10]);
    return result.rows;
  }

  async update(id, userData) {
    const fields = [];
    const values = [id];
    let index = 2;

    if (userData.firstName !== undefined) {
      fields.push(`first_name = $${index++}`);
      values.push(userData.firstName);
    }

    if (userData.lastName !== undefined) {
      fields.push(`last_name = $${index++}`);
      values.push(userData.lastName);
    }

    if (userData.bio !== undefined) {
      fields.push(`bio = $${index++}`);
      values.push(userData.bio);
    }

    if (userData.interests !== undefined) {
      fields.push(`interests = $${index++}`);
      values.push(userData.interests);
    }

    if (userData.photos !== undefined) {
      fields.push(`photos = $${index++}`);
      values.push(JSON.stringify(userData.photos));
    }

    if (userData.isEmailVerified !== undefined) {
      fields.push(`is_email_verified = $${index++}`);
      values.push(userData.isEmailVerified);
    }

    if (userData.emailVerifiedAt !== undefined) {
      fields.push(`email_verified_at = $${index++}`);
      values.push(userData.emailVerifiedAt);
    }

    // Siempre actualizamos el timestamp
    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    const query = `
    UPDATE users
    SET ${fields.join(", ")}
    WHERE id = $1
    RETURNING *
  `;

    const result = await this.db.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    return await this.findById(id);
  }

  async delete(id) {
    const query = "DELETE FROM users WHERE id = $1 RETURNING id";
    const result = await this.db.query(query, [id]);
    return result.rowCount > 0;
  }

  async findByCampusAndCareer(campus, career) {
    const query = `
    SELECT 
      u.*,
      ap.career,
      ap.semester,
      ap.campus
    FROM users u
    JOIN academic_profiles ap ON u.id = ap.user_id
    WHERE ap.campus = $1 
      AND ($2::TEXT IS NULL OR ap.career = $2)
      AND u.is_active = TRUE
      AND u.is_email_verified = TRUE
    ORDER BY u.last_active DESC
    LIMIT 50
  `;

    const result = await this.db.query(query, [campus, career]);
    return result.rows.map((row) => ({
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      academicProfile: {
        career: row.career,
        semester: row.semester,
        campus: row.campus,
      },
    }));
  }
}

module.exports = PostgreSQLUserRepository;
