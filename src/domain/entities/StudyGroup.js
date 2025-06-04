class StudyGroup {
  constructor({
    id,
    creatorId,
    name,
    description,
    subject,
    career,
    semester,
    campus,
    maxMembers = 10,
    currentMembers = 1,
    studySchedule = {},
    isPrivate = false,
    requirements = [],
    status = 'active', // active, completed, cancelled
    createdAt = new Date(),
    updatedAt = new Date()
  }) {
    this.id = id;
    this.creatorId = creatorId;
    this.name = name;
    this.description = description;
    this.subject = subject;
    this.career = career;
    this.semester = semester;
    this.campus = campus;
    this.maxMembers = maxMembers;
    this.currentMembers = currentMembers;
    this.studySchedule = studySchedule;
    this.isPrivate = isPrivate;
    this.requirements = requirements;
    this.status = status;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  isActive() {
    return this.status === 'active';
  }

  hasAvailableSpots() {
    return this.currentMembers < this.maxMembers;
  }

  canUserJoin(userAcademicProfile) {
    // Verificar campus
    if (this.campus !== userAcademicProfile.campus) {
      return false;
    }

    // Verificar carrera si es específica
    if (this.career && this.career !== userAcademicProfile.career) {
      return false;
    }

    // Verificar semestre si es específico
    if (this.semester && Math.abs(this.semester - userAcademicProfile.semester) > 2) {
      return false;
    }

    return true;
  }

  addMember() {
    if (this.hasAvailableSpots()) {
      this.currentMembers++;
      this.updatedAt = new Date();
      return true;
    }
    return false;
  }

  removeMember() {
    if (this.currentMembers > 1) {
      this.currentMembers--;
      this.updatedAt = new Date();
      return true;
    }
    return false;
  }
}
module.exports = {
  StudyGroup,
};