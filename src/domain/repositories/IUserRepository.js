class IUserRepository {
  async save(user) {
    throw new Error('Método save debe ser implementado');
  }

  async findById(id) {
    throw new Error('Método findById debe ser implementado');
  }

  async findByEmail(email) {
    throw new Error('Método findByEmail debe ser implementado');
  }

  async findByStudentId(studentId) {
    throw new Error('Método findByStudentId debe ser implementado');
  }

  async findPotentialMatches(userId, filters = {}) {
    throw new Error('Método findPotentialMatches debe ser implementado');
  }

  async update(id, userData) {
    throw new Error('Método update debe ser implementado');
  }

  async delete(id) {
    throw new Error('Método delete debe ser implementado');
  }

  async findByCampusAndCareer(campus, career) {
    throw new Error('Método findByCampusAndCareer debe ser implementado');
  }
}

module.exports = IUserRepository;