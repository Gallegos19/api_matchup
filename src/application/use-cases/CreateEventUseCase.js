class CreateEventUseCase {
  constructor(eventRepository, userRepository) {
    this.eventRepository = eventRepository;
    this.userRepository = userRepository;
  }

  async execute(creatorId, eventData) {
    // 1. Verificar usuario
    const creator = await this.userRepository.findById(creatorId);
    if (!creator) {
      throw new Error('Usuario no encontrado');
    }

    // 2. Validar datos del evento
    if (new Date(eventData.startDate) <= new Date()) {
      throw new Error('La fecha del evento debe ser futura');
    }

    if (new Date(eventData.endDate) <= new Date(eventData.startDate)) {
      throw new Error('La fecha de fin debe ser posterior a la de inicio');
    }

    // 3. Crear evento
    const event = new Event({
      id: generateId(),
      creatorId: creatorId,
      ...eventData,
      campus: eventData.campus || creator.academicProfile.campus
    });

    // 4. Guardar evento
    const savedEvent = await this.eventRepository.save(event);

    // 5. Agregar creador como participante
    await this.eventRepository.addParticipant(savedEvent.id, creatorId);

    return savedEvent;
  }
}

module.exports = {
  CreateEventUseCase
};
