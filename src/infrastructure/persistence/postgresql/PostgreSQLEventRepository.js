const { IEventRepository } = require('../../../domain/repositories/IEventRepository');
const { Event } = require('../../../domain/entities');
const BaseRepository = require('./BaseRepository');

class PostgreSQLEventRepository extends BaseRepository {
  constructor(database) {
    super(database);
  }

  async save(event) {
    const eventRow = this.mapEntityToRow(event);
    
    const query = `
      INSERT INTO events (
        id, creator_id, title, description, event_type, location, campus,
        start_date, end_date, max_participants, current_participants,
        is_public, requirements, tags, image_url, status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
      ) RETURNING *
    `;
    
    const values = [
      eventRow.id,
      eventRow.creator_id,
      eventRow.title,
      eventRow.description,
      eventRow.event_type,
      eventRow.location,
      eventRow.campus,
      eventRow.start_date,
      eventRow.end_date,
      eventRow.max_participants,
      eventRow.current_participants,
      eventRow.is_public,
      eventRow.requirements,
      eventRow.tags,
      eventRow.image_url,
      eventRow.status,
      eventRow.created_at,
      eventRow.updated_at
    ];
    
    const result = await this.db.query(query, values);
    return this.mapRowToEntity(result.rows[0], Event);
  }

  async findById(id) {
    const query = `
      SELECT 
        e.*,
        u.first_name as creator_first_name,
        u.last_name as creator_last_name
      FROM events e
      JOIN users u ON e.creator_id = u.id
      WHERE e.id = $1
    `;
    
    const result = await this.db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const event = this.mapRowToEntity(result.rows[0], Event);
    event.creatorInfo = {
      firstName: result.rows[0].creator_first_name,
      lastName: result.rows[0].creator_last_name
    };
    
    return event;
  }

  async findByCampus(campus, filters = {}) {
    let query = `
      SELECT 
        e.*,
        u.first_name as creator_first_name,
        u.last_name as creator_last_name
      FROM events e
      JOIN users u ON e.creator_id = u.id
      WHERE e.campus = $1 AND e.status = 'active'
    `;
    
    const values = [campus];
    let paramCount = 2;
    
    if (filters.eventType) {
      query += ` AND e.event_type = ${paramCount}`;
      values.push(filters.eventType);
      paramCount++;
    }
    
    if (filters.startDate) {
      query += ` AND e.start_date >= ${paramCount}`;
      values.push(filters.startDate);
      paramCount++;
    }
    
    if (filters.isPublic !== undefined) {
      query += ` AND e.is_public = ${paramCount}`;
      values.push(filters.isPublic);
      paramCount++;
    }
    
    query += ' ORDER BY e.start_date ASC';
    
    if (filters.limit) {
      query += ` LIMIT ${paramCount}`;
      values.push(filters.limit);
    }
    
    const result = await this.db.query(query, values);
    
    return result.rows.map(row => {
      const event = this.mapRowToEntity(row, Event);
      event.creatorInfo = {
        firstName: row.creator_first_name,
        lastName: row.creator_last_name
      };
      return event;
    });
  }

  async findByCreator(creatorId) {
    const query = `
      SELECT * FROM events 
      WHERE creator_id = $1 
      ORDER BY created_at DESC
    `;
    
    const result = await this.db.query(query, [creatorId]);
    return result.rows.map(row => this.mapRowToEntity(row, Event));
  }

  async findUpcomingEvents(campus = null) {
    let query = `
      SELECT 
        e.*,
        u.first_name as creator_first_name,
        u.last_name as creator_last_name
      FROM events e
      JOIN users u ON e.creator_id = u.id
      WHERE e.status = 'active' 
        AND e.start_date > CURRENT_TIMESTAMP
        AND e.is_public = TRUE
    `;
    
    const values = [];
    
    if (campus) {
      query += ' AND e.campus = $1';
      values.push(campus);
    }
    
    query += ' ORDER BY e.start_date ASC LIMIT 20';
    
    const result = await this.db.query(query, values);
    
    return result.rows.map(row => {
      const event = this.mapRowToEntity(row, Event);
      event.creatorInfo = {
        firstName: row.creator_first_name,
        lastName: row.creator_last_name
      };
      return event;
    });
  }

  async update(id, eventData) {
    const eventRow = this.mapEntityToRow(eventData);
    
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;
    
    for (const [key, value] of Object.entries(eventRow)) {
      if (key !== 'id' && value !== undefined) {
        updateFields.push(`${key} = ${paramCount}`);
        updateValues.push(value);
        paramCount++;
      }
    }
    
    if (updateFields.length === 0) {
      throw new Error('No hay campos para actualizar');
    }
    
    updateFields.push(`updated_at = ${paramCount}`);
    updateValues.push(new Date());
    updateValues.push(id);
    
    const query = `
      UPDATE events 
      SET ${updateFields.join(', ')}
      WHERE id = ${paramCount + 1}
      RETURNING *
    `;
    
    const result = await this.db.query(query, updateValues);
    return this.mapRowToEntity(result.rows[0], Event);
  }

  async delete(id) {
    const query = 'DELETE FROM events WHERE id = $1 RETURNING id';
    const result = await this.db.query(query, [id]);
    return result.rowCount > 0;
  }

  async findEventParticipants(eventId) {
    const query = `
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.photos,
        ap.career,
        ap.semester,
        ep.joined_at
      FROM event_participants ep
      JOIN users u ON ep.user_id = u.id
      LEFT JOIN academic_profiles ap ON u.id = ap.user_id
      WHERE ep.event_id = $1
      ORDER BY ep.joined_at ASC
    `;
    
    const result = await this.db.query(query, [eventId]);
    return result.rows;
  }

  async addParticipant(eventId, userId) {
    return await this.db.withTransaction(async (client) => {
      // Verificar disponibilidad
      const eventQuery = 'SELECT max_participants, current_participants FROM events WHERE id = $1';
      const eventResult = await client.query(eventQuery, [eventId]);
      
      if (eventResult.rows.length === 0) {
        throw new Error('Evento no encontrado');
      }
      
      const event = eventResult.rows[0];
      if (event.max_participants && event.current_participants >= event.max_participants) {
        throw new Error('Evento lleno');
      }
      
      // Agregar participante
      const participantQuery = `
        INSERT INTO event_participants (id, event_id, user_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (event_id, user_id) DO NOTHING
      `;
      
      await client.query(participantQuery, [require('uuid').v4(), eventId, userId]);
      
      // Actualizar contador
      const updateQuery = `
        UPDATE events 
        SET current_participants = current_participants + 1
        WHERE id = $1
      `;
      
      await client.query(updateQuery, [eventId]);
    });
  }

  async removeParticipant(eventId, userId) {
    return await this.db.withTransaction(async (client) => {
      // Eliminar participante
      const deleteQuery = 'DELETE FROM event_participants WHERE event_id = $1 AND user_id = $2';
      const deleteResult = await client.query(deleteQuery, [eventId, userId]);
      
      if (deleteResult.rowCount > 0) {
        // Actualizar contador
        const updateQuery = `
          UPDATE events 
          SET current_participants = GREATEST(current_participants - 1, 0)
          WHERE id = $1
        `;
        
        await client.query(updateQuery, [eventId]);
      }
    });
  }
}

module.exports = {
  PostgreSQLEventRepository
};