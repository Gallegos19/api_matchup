class IMessageRepository {
  async save(message) {
    throw new Error('Método save debe ser implementado');
  }

  async findById(id) {
    throw new Error('Método findById debe ser implementado');
  }

  async findByMatchId(matchId, limit = 50, offset = 0) {
    throw new Error('Método findByMatchId debe ser implementado');
  }

  async findUnreadMessages(userId) {
    throw new Error('Método findUnreadMessages debe ser implementado');
  }

  async markAsRead(messageIds, userId) {
    throw new Error('Método markAsRead debe ser implementado');
  }

  async findNewMessagesSince(matchId, timestamp) {
    throw new Error('Método findNewMessagesSince debe ser implementado');
  }

  async getLastMessageByMatch(matchId) {
    throw new Error('Método getLastMessageByMatch debe ser implementado');
  }
}
module.exports = {
  IMessageRepository
};