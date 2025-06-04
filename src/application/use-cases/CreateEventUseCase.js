const { Event } = require('../../domain/entities/Event');
const { v4: generateId } = require('uuid');

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

    // 3. Crear evento con ID generado
    const event = new Event({
      id: generateId(), // ✅ AGREGAR ESTA LÍNEA
      creatorId: creatorId,
      title: eventData.title,
      description: eventData.description,
      eventType: eventData.eventType,
      location: eventData.location,
      campus: eventData.campus || creator.academicProfile?.campus,
      startDate: eventData.startDate,
      endDate: eventData.endDate,
      maxParticipants: eventData.maxParticipants,
      isPublic: eventData.isPublic,
      requirements: eventData.requirements || [],
      tags: eventData.tags || [],
      imageUrl: eventData.imageUrl || null,
      status: 'active',
      currentParticipants: 0, // Inicializar en 0, luego se incrementa
      createdAt: new Date(),
      updatedAt: new Date()
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