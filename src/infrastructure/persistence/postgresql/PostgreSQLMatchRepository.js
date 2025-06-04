const { IMatchRepository } = require('../../../domain/repositories/IMatchRepository');
const { Match } = require('../../../domain/entities/Match');
const BaseRepository = require('./BaseRepository');

class PostgreSQLMatchRepository extends BaseRepository {
  constructor(database) {
    super(database);
  }

  async save(match) {
    const matchRow = this.mapEntityToRow(match);
    
    const query = `
      INSERT INTO matches (
        id, user_id1, user_id2, status, matched_at, compatibility,
        user1_action, user2_action, last_interaction, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
      ) 
      ON CONFLICT (user_id1, user_id2) 
      DO UPDATE SET
        status = EXCLUDED.status,
        matched_at = EXCLUDED.matched_at,
        user1_action = EXCLUDED.user1_action,
        user2_action = EXCLUDED.user2_action,
        last_interaction = EXCLUDED.last_interaction,
        updated_at = EXCLUDED.updated_at
      RETURNING *
    `;
    
    const values = [
      matchRow.id,
      matchRow.user_id1,
      matchRow.user_id2,
      matchRow.status,
      matchRow.matched_at,
      matchRow.compatibility,
      matchRow.user1_action,
      matchRow.user2_action,
      matchRow.last_interaction,
      matchRow.created_at,
      matchRow.updated_at
    ];
    
    const result = await this.db.query(query, values);
    return this.mapRowToEntity(result.rows[0], Match);
  }

  async findById(id) {
    const query = 'SELECT * FROM matches WHERE id = $1';
    const result = await this.db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToEntity(result.rows[0], Match);
  }

  async findByUsers(userId1, userId2) {
    const query = `
      SELECT * FROM matches 
      WHERE (user_id1 = $1 AND user_id2 = $2) 
         OR (user_id1 = $2 AND user_id2 = $1)
    `;
    
    const result = await this.db.query(query, [userId1, userId2]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToEntity(result.rows[0], Match);
  }

  async findMatchesByUserId(userId) {
    const query = `
      SELECT 
        m.*,
        u1.first_name as user1_first_name,
        u1.last_name as user1_last_name,
        u1.photos as user1_photos,
        u2.first_name as user2_first_name,
        u2.last_name as user2_last_name,
        u2.photos as user2_photos
      FROM matches m
      JOIN users u1 ON m.user_id1 = u1.id
      JOIN users u2 ON m.user_id2 = u2.id
      WHERE (m.user_id1 = $1 OR m.user_id2 = $1)
        AND m.status = 'matched'
      ORDER BY m.matched_at DESC
    `;
    
    const result = await this.db.query(query, [userId]);
    
    return result.rows.map(row => {
      const match = this.mapRowToEntity(row, Match);
      
      // Agregar información de los usuarios
      match.user1Info = {
        firstName: row.user1_first_name,
        lastName: row.user1_last_name,
        photos: row.user1_photos
      };
      match.user2Info = {
        firstName: row.user2_first_name,
        lastName: row.user2_last_name,
        photos: row.user2_photos
      };
      
      return match;
    });
  }

  async update(id, matchData) {
    const matchRow = this.mapEntityToRow(matchData);
    
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;
    
    for (const [key, value] of Object.entries(matchRow)) {
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
      UPDATE matches 
      SET ${updateFields.join(', ')}
      WHERE id = ${paramCount + 1}
      RETURNING *
    `;
    
    const result = await this.db.query(query, updateValues);
    return this.mapRowToEntity(result.rows[0], Match);
  }

  async findPendingMatchesForUser(userId) {
    const query = `
      SELECT * FROM matches 
      WHERE (user_id1 = $1 OR user_id2 = $1)
        AND status = 'pending'
      ORDER BY last_interaction DESC
    `;
    
    const result = await this.db.query(query, [userId]);
    return result.rows.map(row => this.mapRowToEntity(row, Match));
  }

  async getMatchStatistics(userId) {
    const query = 'SELECT * FROM get_user_match_stats($1)';
    const result = await this.db.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return {
        totalLikesSent: 0,
        totalLikesReceived: 0,
        totalMatches: 0,
        totalConversations: 0,
        matchRate: 0
      };
    }
    
    const stats = result.rows[0];
    return {
      totalLikesSent: stats.total_likes_sent,
      totalLikesReceived: stats.total_likes_received,
      totalMatches: stats.total_matches,
      totalConversations: stats.total_conversations,
      matchRate: parseFloat(stats.match_rate)
    };
  }
}
module.exports = PostgreSQLMatchRepository;