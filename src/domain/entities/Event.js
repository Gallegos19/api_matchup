class Event {
  constructor({
    id,
    creatorId,
    title,
    description,
    eventType = 'social', // social, academic, sports, cultural
    location,
    campus,
    startDate,
    endDate,
    maxParticipants = null,
    currentParticipants = 0,
    isPublic = true,
    requirements = [],
    tags = [],
    imageUrl = null,
    status = 'active', // active, cancelled, completed
    createdAt = new Date(),
    updatedAt = new Date()
  }) {
    this.id = id;
    this.creatorId = creatorId;
    this.title = title;
    this.description = description;
    this.eventType = eventType;
    this.location = location;
    this.campus = campus;
    this.startDate = startDate;
    this.endDate = endDate;
    this.maxParticipants = maxParticipants;
    this.currentParticipants = currentParticipants;
    this.isPublic = isPublic;
    this.requirements = requirements;
    this.tags = tags;
    this.imageUrl = imageUrl;
    this.status = status;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  isActive() {
    return this.status === 'active' && new Date() < new Date(this.startDate);
  }

  hasAvailableSpots() {
    if (!this.maxParticipants) return true;
    return this.currentParticipants < this.maxParticipants;
  }

  canUserJoin(userAcademicProfile) {
    // Verificar si el evento es del mismo campus
    if (this.campus && userAcademicProfile.campus !== this.campus) {
      return false;
    }

    // Verificar requisitos específicos
    return this.requirements.every(requirement => {
      switch (requirement.type) {
        case 'career':
          return requirement.values.includes(userAcademicProfile.career);
        case 'semester':
          return userAcademicProfile.semester >= requirement.minSemester;
        default:
          return true;
      }
    });
  }

  addParticipant() {
    this.currentParticipants++;
    this.updatedAt = new Date();
  }

  removeParticipant() {
    if (this.currentParticipants > 0) {
      this.currentParticipants--;
      this.updatedAt = new Date();
    }
  }
}

module.exports = {
  Event
};