class IEventRepository {
  async save(event) {
    throw new Error('Método save debe ser implementado');
  }

  async findById(id) {
    throw new Error('Método findById debe ser implementado');
  }

  async findByCampus(campus, filters = {}) {
    throw new Error('Método findByCampus debe ser implementado');
  }

  async findByCreator(creatorId) {
    throw new Error('Método findByCreator debe ser implementado');
  }

  async findUpcomingEvents(campus = null) {
    throw new Error('Método findUpcomingEvents debe ser implementado');
  }

  async update(id, eventData) {
    throw new Error('Método update debe ser implementado');
  }

  async delete(id) {
    throw new Error('Método delete debe ser implementado');
  }

  async findEventParticipants(eventId) {
    throw new Error('Método findEventParticipants debe ser implementado');
  }

  async addParticipant(eventId, userId) {
    throw new Error('Método addParticipant debe ser implementado');
  }

  async removeParticipant(eventId, userId) {
    throw new Error('Método removeParticipant debe ser implementado');
  }
}
module.exports = {
  IEventRepository
};