class IStudyGroupRepository {
  async save(studyGroup) {
    throw new Error('Método save debe ser implementado');
  }

  async findById(id) {
    throw new Error('Método findById debe ser implementado');
  }

  async findByCampusAndCareer(campus, career = null) {
    throw new Error('Método findByCampusAndCareer debe ser implementado');
  }

  async findBySubject(subject, campus = null) {
    throw new Error('Método findBySubject debe ser implementado');
  }

  async findByCreator(creatorId) {
    throw new Error('Método findByCreator debe ser implementado');
  }

  async update(id, studyGroupData) {
    throw new Error('Método update debe ser implementado');
  }

  async delete(id) {
    throw new Error('Método delete debe ser implementado');
  }

  async addMember(groupId, userId) {
    throw new Error('Método addMember debe ser implementado');
  }

  async removeMember(groupId, userId) {
    throw new Error('Método removeMember debe ser implementado');
  }

  async findGroupMembers(groupId) {
    throw new Error('Método findGroupMembers debe ser implementado');
  }
}
module.exports = {
  IStudyGroupRepository
};
