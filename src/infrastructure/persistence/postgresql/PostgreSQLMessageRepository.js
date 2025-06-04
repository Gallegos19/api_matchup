const { IMessageRepository } = require('../../../domain/repositories/IMessageRepository');
const { Message } = require('../../../domain/entities');
const BaseRepository = require('./BaseRepository');

class PostgreSQLMessageRepository extends BaseRepository {
  constructor(database) {
    super(database);
  }

  async save(message) {
    const messageRow = this.mapEntityToRow(message);
    
    const query = `
      INSERT INTO messages (
        id, match_id, sender_id, receiver_id, content, message_type,
        metadata, is_read, is_delivered, read_at, delivered_at,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      ) RETURNING *
    `;
    
    const values = [
      messageRow.id,
      messageRow.match_id,
      messageRow.sender_id,
      messageRow.receiver_id,
      messageRow.content,
      messageRow.message_type,
      messageRow.metadata,
      messageRow.is_read,
      messageRow.is_delivered,
      messageRow.read_at,
      messageRow.delivered_at,
      messageRow.created_at,
      messageRow.updated_at
    ];
    
    const result = await this.db.query(query, values);
    return this.mapRowToEntity(result.rows[0], Message);
  }

  async findById(id) {
    const query = 'SELECT * FROM messages WHERE id = $1';
    const result = await this.db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToEntity(result.rows[0], Message);
  }

  async findByMatchId(matchId, limit = 50, offset = 0) {
    const query = `
      SELECT 
        m.*,
        u.first_name as sender_first_name,
        u.last_name as sender_last_name,
        u.photos as sender_photos
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.match_id = $1
      ORDER BY m.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await this.db.query(query, [matchId, limit, offset]);
    
    return result.rows.map(row => {
      const message = this.mapRowToEntity(row, Message);
      message.senderInfo = {
        firstName: row.sender_first_name,
        lastName: row.sender_last_name,
        photos: row.sender_photos
      };
      return message;
    }).reverse(); // Invertir para mostrar del más antiguo al más reciente
  }

  async findUnreadMessages(userId) {
    const query = `
      SELECT 
        m.*,
        u.first_name as sender_first_name,
        u.last_name as sender_last_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.receiver_id = $1 AND m.is_read = FALSE
      ORDER BY m.created_at DESC
    `;
    
    const result = await this.db.query(query, [userId]);
    
    return result.rows.map(row => {
      const message = this.mapRowToEntity(row, Message);
      message.senderInfo = {
        firstName: row.sender_first_name,
        lastName: row.sender_last_name
      };
      return message;
    });
  }

  async markAsRead(messageIds, userId) {
    if (messageIds.length === 0) return;
    
    const placeholders = messageIds.map((_, index) => `${index + 1}`).join(',');
    const query = `
      UPDATE messages 
      SET is_read = TRUE, read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id IN (${placeholders}) 
        AND receiver_id = ${messageIds.length + 1}
        AND is_read = FALSE
    `;
    
    await this.db.query(query, [...messageIds, userId]);
  }

  async findNewMessagesSince(matchId, timestamp) {
    const query = `
      SELECT 
        m.*,
        u.first_name as sender_first_name,
        u.last_name as sender_last_name,
        u.photos as sender_photos
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.match_id = $1 
        AND m.created_at > $2
      ORDER BY m.created_at ASC
    `;
    
    const result = await this.db.query(query, [matchId, timestamp]);
    
    return result.rows.map(row => {
      const message = this.mapRowToEntity(row, Message);
      message.senderInfo = {
        firstName: row.sender_first_name,
        lastName: row.sender_last_name,
        photos: row.sender_photos
      };
      return message;
    });
  }

  async getLastMessageByMatch(matchId) {
    const query = `
      SELECT * FROM messages 
      WHERE match_id = $1 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const result = await this.db.query(query, [matchId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToEntity(result.rows[0], Message);
  }
}
module.exports = PostgreSQLMessageRepository;