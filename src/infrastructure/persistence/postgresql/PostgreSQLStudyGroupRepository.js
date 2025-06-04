// src/infrastructure/persistence/postgresql/PostgreSQLStudyGroupRepository.js
const { IStudyGroupRepository } = require('../../../domain/repositories/IStudyGroupRepository');
const { StudyGroup } = require('../../../domain/entities/StudyGroup');
const BaseRepository = require('./BaseRepository');

class PostgreSQLStudyGroupRepository extends BaseRepository {
  constructor(database) {
    super(database);
  }

  async save(studyGroup) {
    const groupRow = this.mapEntityToRow(studyGroup);
    
    const query = `
      INSERT INTO study_groups (
        id, creator_id, name, description, subject, career, semester, campus,
        max_members, current_members, study_schedule, is_private, requirements,
        status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
      ) RETURNING *
    `;
    
    const values = [
      groupRow.id,
      groupRow.creator_id,
      groupRow.name,
      groupRow.description,
      groupRow.subject,
      groupRow.career,
      groupRow.semester,
      groupRow.campus,
      groupRow.max_members,
      groupRow.current_members,
      groupRow.study_schedule,
      groupRow.is_private,
      groupRow.requirements,
      groupRow.status,
      groupRow.created_at,
      groupRow.updated_at
    ];
    
    const result = await this.db.query(query, values);
    return this.mapRowToEntity(result.rows[0], StudyGroup);
  }

  async findById(id) {
    const query = `
      SELECT 
        sg.*,
        u.first_name as creator_first_name,
        u.last_name as creator_last_name
      FROM study_groups sg
      JOIN users u ON sg.creator_id = u.id
      WHERE sg.id = $1
    `;
    
    const result = await this.db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const group = this.mapRowToEntity(result.rows[0], StudyGroup);
    group.creatorInfo = {
      firstName: result.rows[0].creator_first_name,
      lastName: result.rows[0].creator_last_name
    };
    
    return group;
  }

  async findByCampusAndCareer(campus, career = null) {
    let query = `
      SELECT 
        sg.*,
        u.first_name as creator_first_name,
        u.last_name as creator_last_name
      FROM study_groups sg
      JOIN users u ON sg.creator_id = u.id
      WHERE sg.status = 'active'
    `;
    
    const values = [];
    let paramCount = 1;
    
    if (campus) {
      query += ` AND sg.campus = $${paramCount}`;
      values.push(campus);
      paramCount++;
    }
    
    if (career) {
      query += ` AND (sg.career IS NULL OR sg.career = $${paramCount})`;
      values.push(career);
      paramCount++;
    }
    
    query += ' ORDER BY sg.created_at DESC';
    
    const result = await this.db.query(query, values);
    
    return result.rows.map(row => {
      const group = this.mapRowToEntity(row, StudyGroup);
      group.creatorInfo = {
        firstName: row.creator_first_name,
        lastName: row.creator_last_name
      };
      return group;
    });
  }

  async findBySubject(subject, campus = null) {
    let query = `
      SELECT 
        sg.*,
        u.first_name as creator_first_name,
        u.last_name as creator_last_name
      FROM study_groups sg
      JOIN users u ON sg.creator_id = u.id
      WHERE sg.status = 'active' 
        AND LOWER(sg.subject) LIKE LOWER($1)
    `;
    
    const values = [`%${subject}%`];
    let paramCount = 2;
    
    if (campus) {
      query += ` AND sg.campus = $${paramCount}`;
      values.push(campus);
      paramCount++;
    }
    
    query += ' ORDER BY sg.created_at DESC';
    
    const result = await this.db.query(query, values);
    
    return result.rows.map(row => {
      const group = this.mapRowToEntity(row, StudyGroup);
      group.creatorInfo = {
        firstName: row.creator_first_name,
        lastName: row.creator_last_name
      };
      return group;
    });
  }

  async findByCreator(creatorId) {
    const query = `
      SELECT * FROM study_groups 
      WHERE creator_id = $1 
      ORDER BY created_at DESC
    `;
    
    const result = await this.db.query(query, [creatorId]);
    return result.rows.map(row => this.mapRowToEntity(row, StudyGroup));
  }

  async update(id, studyGroupData) {
    const groupRow = this.mapEntityToRow(studyGroupData);
    
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;
    
    for (const [key, value] of Object.entries(groupRow)) {
      if (key !== 'id' && value !== undefined) {
        updateFields.push(`${key} = $${paramCount}`);
        updateValues.push(value);
        paramCount++;
      }
    }
    
    if (updateFields.length === 0) {
      throw new Error('No hay campos para actualizar');
    }
    
    updateFields.push(`updated_at = $${paramCount}`);
    updateValues.push(new Date());
    updateValues.push(id);
    
    const query = `
      UPDATE study_groups 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount + 1}
      RETURNING *
    `;
    
    const result = await this.db.query(query, updateValues);
    return this.mapRowToEntity(result.rows[0], StudyGroup);
  }

  async delete(id) {
    const query = 'DELETE FROM study_groups WHERE id = $1 RETURNING id';
    const result = await this.db.query(query, [id]);
    return result.rowCount > 0;
  }

  async addMember(groupId, userId) {
    return await this.db.withTransaction(async (client) => {
      // Verificar disponibilidad
      const groupQuery = 'SELECT max_members, current_members FROM study_groups WHERE id = $1';
      const groupResult = await client.query(groupQuery, [groupId]);
      
      if (groupResult.rows.length === 0) {
        throw new Error('Grupo no encontrado');
      }
      
      const group = groupResult.rows[0];
      if (group.current_members >= group.max_members) {
        throw new Error('Grupo lleno');
      }
      
      // Verificar que no sea ya miembro
      const memberCheckQuery = `
        SELECT id FROM study_group_members 
        WHERE group_id = $1 AND user_id = $2
      `;
      const memberCheck = await client.query(memberCheckQuery, [groupId, userId]);
      
      if (memberCheck.rows.length > 0) {
        throw new Error('El usuario ya es miembro del grupo');
      }
      
      // Agregar miembro
      const memberQuery = `
        INSERT INTO study_group_members (id, group_id, user_id, role, joined_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      `;
      
      await client.query(memberQuery, [
        require('uuid').v4(),
        groupId,
        userId,
        'member'
      ]);
      
      // Actualizar contador
      const updateQuery = `
        UPDATE study_groups 
        SET current_members = current_members + 1
        WHERE id = $1
      `;
      
      await client.query(updateQuery, [groupId]);
    });
  }

  async removeMember(groupId, userId) {
    return await this.db.withTransaction(async (client) => {
      // Eliminar miembro
      const deleteQuery = `
        DELETE FROM study_group_members 
        WHERE group_id = $1 AND user_id = $2
      `;
      const deleteResult = await client.query(deleteQuery, [groupId, userId]);
      
      if (deleteResult.rowCount > 0) {
        // Actualizar contador
        const updateQuery = `
          UPDATE study_groups 
          SET current_members = GREATEST(current_members - 1, 0)
          WHERE id = $1
        `;
        
        await client.query(updateQuery, [groupId]);
      }
    });
  }

  async findGroupMembers(groupId) {
    const query = `
      SELECT 
        sgm.*,
        u.first_name,
        u.last_name,
        u.photos,
        ap.career,
        ap.semester
      FROM study_group_members sgm
      JOIN users u ON sgm.user_id = u.id
      LEFT JOIN academic_profiles ap ON u.id = ap.user_id
      WHERE sgm.group_id = $1
      ORDER BY sgm.joined_at ASC
    `;
    
    const result = await this.db.query(query, [groupId]);
    
    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      firstName: row.first_name,
      lastName: row.last_name,
      photos: typeof row.photos === 'string' ? JSON.parse(row.photos) : row.photos,
      career: row.career,
      semester: row.semester,
      role: row.role,
      joinedAt: row.joined_at
    }));
  }

  async findGroupsByMember(userId) {
    const query = `
      SELECT 
        sg.*,
        sgm.role,
        sgm.joined_at as member_since
      FROM study_groups sg
      JOIN study_group_members sgm ON sg.id = sgm.group_id
      WHERE sgm.user_id = $1 AND sg.status = 'active'
      ORDER BY sgm.joined_at DESC
    `;
    
    const result = await this.db.query(query, [userId]);
    
    return result.rows.map(row => {
      const group = this.mapRowToEntity(row, StudyGroup);
      group.memberRole = row.role;
      group.memberSince = row.member_since;
      return group;
    });
  }

  async searchGroups(searchTerm, campus = null, limit = 20) {
    let query = `
      SELECT 
        sg.*,
        u.first_name as creator_first_name,
        u.last_name as creator_last_name
      FROM study_groups sg
      JOIN users u ON sg.creator_id = u.id
      WHERE sg.status = 'active' 
        AND sg.is_private = FALSE
        AND (
          LOWER(sg.name) LIKE LOWER($1) OR 
          LOWER(sg.subject) LIKE LOWER($1) OR 
          LOWER(sg.description) LIKE LOWER($1)
        )
    `;
    
    const values = [`%${searchTerm}%`];
    let paramCount = 2;
    
    if (campus) {
      query += ` AND sg.campus = $${paramCount}`;
      values.push(campus);
      paramCount++;
    }
    
    query += ` ORDER BY sg.created_at DESC LIMIT $${paramCount}`;
    values.push(limit);
    
    const result = await this.db.query(query, values);
    
    return result.rows.map(row => {
      const group = this.mapRowToEntity(row, StudyGroup);
      group.creatorInfo = {
        firstName: row.creator_first_name,
        lastName: row.creator_last_name
      };
      return group;
    });
  }

  async getPopularSubjects(campus = null, limit = 10) {
    let query = `
      SELECT 
        subject, 
        COUNT(*) as group_count,
        SUM(current_members) as total_members
      FROM study_groups 
      WHERE status = 'active'
    `;
    
    const values = [];
    let paramCount = 1;
    
    if (campus) {
      query += ` AND campus = $${paramCount}`;
      values.push(campus);
      paramCount++;
    }
    
    query += ` GROUP BY subject ORDER BY group_count DESC, total_members DESC LIMIT $${paramCount}`;
    values.push(limit);
    
    const result = await this.db.query(query, values);
    
    return result.rows.map(row => ({
      subject: row.subject,
      groupCount: parseInt(row.group_count),
      totalMembers: parseInt(row.total_members)
    }));
  }
}

module.exports = PostgreSQLStudyGroupRepository;