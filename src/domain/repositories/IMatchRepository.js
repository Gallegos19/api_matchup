class IMatchRepository {
  async save(match) {
    throw new Error('Método save debe ser implementado');
  }

  async findById(id) {
    throw new Error('Método findById debe ser implementado');
  }

  async findByUsers(userId1, userId2) {
    throw new Error('Método findByUsers debe ser implementado');
  }

  async findMatchesByUserId(userId) {
    throw new Error('Método findMatchesByUserId debe ser implementado');
  }

  async update(id, matchData) {
    throw new Error('Método update debe ser implementado');
  }

  async findPendingMatchesForUser(userId) {
    throw new Error('Método findPendingMatchesForUser debe ser implementado');
  }

  async getMatchStatistics(userId) {
    throw new Error('Método getMatchStatistics debe ser implementado');
  }
}
module.exports = {
  IMatchRepository
};