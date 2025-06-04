// src/interfaces/http/controllers/EventController.js
const { CreateEventUseCase } = require('../../../application/use-cases/CreateEventUseCase');
const { v4: uuidv4 } = require('uuid');

class EventController {
  constructor(eventRepository, userRepository, notificationService) {
    this.eventRepository = eventRepository;
    this.userRepository = userRepository;
    this.notificationService = notificationService;
    this.createEventUseCase = new CreateEventUseCase(
      eventRepository,
      userRepository
    );
  }

  async createEvent(req, res) {
    try {
      const userId = req.user.userId;
      const {
        title,
        description,
        eventType = 'social',
        location,
        campus,
        startDate,
        endDate,
        maxParticipants,
        isPublic = true,
        requirements = [],
        tags = []
      } = req.body;

      // Validaciones básicas
      if (!title || !title.trim()) {
        return res.status(400).json({
          success: false,
          error: 'El título del evento es requerido'
        });
      }

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: 'Las fechas de inicio y fin son requeridas'
        });
      }

      // Validar fechas
      const start = new Date(startDate);
      const end = new Date(endDate);
      const now = new Date();

      if (start <= now) {
        return res.status(400).json({
          success: false,
          error: 'La fecha de inicio debe ser futura'
        });
      }

      if (end <= start) {
        return res.status(400).json({
          success: false,
          error: 'La fecha de fin debe ser posterior a la de inicio'
        });
      }

      // Obtener información del usuario creador
      const creator = await this.userRepository.findById(userId);
      if (!creator) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }

      const eventData = {
        title: title.trim(),
        description: description?.trim() || '',
        eventType,
        location: location?.trim() || '',
        campus: campus || creator.academicProfile?.campus,
        startDate: start,
        endDate: end,
        maxParticipants: maxParticipants ? parseInt(maxParticipants) : null,
        isPublic,
        requirements,
        tags: Array.isArray(tags) ? tags : []
      };

      const event = await this.createEventUseCase.execute(userId, eventData);

      res.status(201).json({
        success: true,
        message: 'Evento creado exitosamente',
        data: {
          id: event.id,
          title: event.title,
          description: event.description,
          eventType: event.eventType,
          location: event.location,
          campus: event.campus,
          startDate: event.startDate,
          endDate: event.endDate,
          maxParticipants: event.maxParticipants,
          currentParticipants: event.currentParticipants,
          isPublic: event.isPublic,
          requirements: event.requirements,
          tags: event.tags,
          status: event.status,
          createdAt: event.createdAt,
          creatorInfo: {
            id: creator.id,
            firstName: creator.firstName,
            lastName: creator.lastName
          }
        }
      });

    } catch (error) {
      console.error('Error creando evento:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async getEvents(req, res) {
    try {
      const userId = req.user.userId;
      const { 
        campus, 
        eventType, 
        upcoming = 'true', 
        limit = 20, 
        offset = 0 
      } = req.query;

      // Obtener información del usuario para filtros por defecto
      const user = await this.userRepository.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }

      const targetCampus = campus || user.academicProfile?.campus;

      let events;
      if (upcoming === 'true') {
        events = await this.eventRepository.findUpcomingEvents(targetCampus);
      } else {
        const filters = {
          eventType,
          limit: parseInt(limit),
          offset: parseInt(offset)
        };
        events = await this.eventRepository.findByCampus(targetCampus, filters);
      }

      // Enriquecer eventos con información adicional
      const enrichedEvents = await Promise.all(
        events.map(async (event) => {
          const participants = await this.eventRepository.findEventParticipants(event.id);
          const isParticipating = participants.some(p => p.id === userId);
          
          return {
            id: event.id,
            title: event.title,
            description: event.description,
            eventType: event.eventType,
            location: event.location,
            campus: event.campus,
            startDate: event.startDate,
            endDate: event.endDate,
            maxParticipants: event.maxParticipants,
            currentParticipants: event.currentParticipants,
            isPublic: event.isPublic,
            requirements: event.requirements,
            tags: event.tags,
            status: event.status,
            imageUrl: event.imageUrl,
            createdAt: event.createdAt,
            isParticipating,
            hasAvailableSpots: event.hasAvailableSpots(),
            creatorInfo: event.creatorInfo || null,
            participantCount: participants.length,
            daysUntilStart: this.calculateDaysUntil(event.startDate)
          };
        })
      );

              res.json({
        success: true,
        data: enrichedEvents,
        meta: {
          total: enrichedEvents.length,
          campus: targetCampus,
          eventType: eventType || 'all',
          hasMore: enrichedEvents.length === parseInt(limit)
        }
      });

    } catch (error) {
      console.error('Error obteniendo eventos:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

async getMyEvents(req, res) {
    try {
      const userId = req.user.userId;
      const { type = 'all' } = req.query; // 'created', 'participating', 'all'

      let events = [];

      if (type === 'created' || type === 'all') {
        const createdEvents = await this.eventRepository.findByCreator(userId);
        events.push(...createdEvents.map(event => ({ ...event, relation: 'creator' })));
      }

      if (type === 'participating' || type === 'all') {
        // Obtener eventos donde el usuario participa pero no es creador
        const allEvents = await this.eventRepository.findUpcomingEvents();
        for (const event of allEvents) {
          if (event.creatorId !== userId) {
            const participants = await this.eventRepository.findEventParticipants(event.id);
            if (participants.some(p => p.id === userId)) {
              events.push({ ...event, relation: 'participant' });
            }
          }
        }
      }

      // Eliminar duplicados y ordenar
      const uniqueEvents = events.filter((event, index, self) =>
        index === self.findIndex(e => e.id === event.id)
      );

      uniqueEvents.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

      // Enriquecer con información adicional (SIN usar métodos de clase)
      const enrichedEvents = await Promise.all(
        uniqueEvents.map(async (event) => {
          const participants = await this.eventRepository.findEventParticipants(event.id);
          
          return {
            id: event.id,
            title: event.title,
            description: event.description,
            eventType: event.eventType,
            location: event.location,
            campus: event.campus,
            startDate: event.startDate,
            endDate: event.endDate,
            maxParticipants: event.maxParticipants,
            currentParticipants: event.currentParticipants,
            status: event.status,
            relation: event.relation,
            isActive: this.isEventActive(event), // ✅ Usar método helper
            participantCount: participants.length,
            daysUntilStart: this.calculateDaysUntil(event.startDate)
          };
        })
      );

      res.json({
        success: true,
        data: enrichedEvents,
        meta: {
          total: enrichedEvents.length,
          created: enrichedEvents.filter(e => e.relation === 'creator').length,
          participating: enrichedEvents.filter(e => e.relation === 'participant').length
        }
      });

    } catch (error) {
      console.error('Error obteniendo mis eventos:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // ✅ AGREGAR ESTOS MÉTODOS HELPER AL EventController

  // Método helper para verificar si un evento está activo
  isEventActive(event) {
    return event.status === 'active' && new Date() < new Date(event.startDate);
  }

  // Método helper para verificar si hay espacios disponibles
  hasAvailableSpots(event) {
    if (!event.maxParticipants) return true;
    return event.currentParticipants < event.maxParticipants;
  }

  // Método helper para verificar si un usuario puede unirse
  canUserJoin(event, userAcademicProfile) {
    // Verificar si el evento es del mismo campus
    if (event.campus && userAcademicProfile.campus !== event.campus) {
      return false;
    }

    // Verificar requisitos específicos
    return event.requirements.every(requirement => {
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

  async joinEvent(req, res) {
    try {
      const userId = req.user.userId;
      const { eventId } = req.params;

      // Obtener evento
      const event = await this.eventRepository.findById(eventId);
      if (!event) {
        return res.status(404).json({
          success: false,
          error: 'Evento no encontrado'
        });
      }

      // Obtener usuario
      const user = await this.userRepository.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }

      // Verificar que el evento esté activo
      if (!event.isActive()) {
        return res.status(400).json({
          success: false,
          error: 'El evento no está activo o ya ha comenzado'
        });
      }

      // Verificar disponibilidad
      if (!event.hasAvailableSpots()) {
        return res.status(400).json({
          success: false,
          error: 'El evento está lleno'
        });
      }

      // Verificar elegibilidad
      if (!event.canUserJoin(user.academicProfile)) {
        return res.status(400).json({
          success: false,
          error: 'No cumples los requisitos para unirte a este evento'
        });
      }

      // Verificar que no esté ya participando
      const participants = await this.eventRepository.findEventParticipants(eventId);
      if (participants.some(p => p.id === userId)) {
        return res.status(400).json({
          success: false,
          error: 'Ya estás participando en este evento'
        });
      }

      // Unirse al evento
      await this.eventRepository.addParticipant(eventId, userId);

      // Enviar notificación al creador
      if (event.creatorId !== userId) {
        await this.notificationService.sendEventJoinNotification(
          event.creatorId,
          userId,
          eventId
        );
      }

      res.json({
        success: true,
        message: '¡Te has unido al evento exitosamente!',
        data: {
          eventId: eventId,
          eventTitle: event.title,
          joinedAt: new Date(),
          newParticipantCount: event.currentParticipants + 1
        }
      });

    } catch (error) {
      console.error('Error uniéndose al evento:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async leaveEvent(req, res) {
    try {
      const userId = req.user.userId;
      const { eventId } = req.params;

      // Obtener evento
      const event = await this.eventRepository.findById(eventId);
      if (!event) {
        return res.status(404).json({
          success: false,
          error: 'Evento no encontrado'
        });
      }

      // Verificar que el usuario no sea el creador
      if (event.creatorId === userId) {
        return res.status(400).json({
          success: false,
          error: 'El creador no puede abandonar su propio evento. Puedes cancelarlo si es necesario.'
        });
      }

      // Verificar que esté participando
      const participants = await this.eventRepository.findEventParticipants(eventId);
      if (!participants.some(p => p.id === userId)) {
        return res.status(400).json({
          success: false,
          error: 'No estás participando en este evento'
        });
      }

      // Salir del evento
      await this.eventRepository.removeParticipant(eventId, userId);

      res.json({
        success: true,
        message: 'Has salido del evento exitosamente',
        data: {
          eventId: eventId,
          eventTitle: event.title,
          leftAt: new Date()
        }
      });

    } catch (error) {
      console.error('Error saliendo del evento:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  async getMyEvents(req, res) {
    try {
      const userId = req.user.userId;
      const { type = 'all' } = req.query; // 'created', 'participating', 'all'

      let events = [];

      if (type === 'created' || type === 'all') {
        const createdEvents = await this.eventRepository.findByCreator(userId);
        events.push(...createdEvents.map(event => ({ ...event, relation: 'creator' })));
      }

      if (type === 'participating' || type === 'all') {
        // Obtener eventos donde el usuario participa pero no es creador
        const allEvents = await this.eventRepository.findUpcomingEvents();
        for (const event of allEvents) {
          if (event.creatorId !== userId) {
            const participants = await this.eventRepository.findEventParticipants(event.id);
            if (participants.some(p => p.id === userId)) {
              events.push({ ...event, relation: 'participant' });
            }
          }
        }
      }

      // Eliminar duplicados y ordenar
      const uniqueEvents = events.filter((event, index, self) =>
        index === self.findIndex(e => e.id === event.id)
      );

      uniqueEvents.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

      // Enriquecer con información adicional
      const enrichedEvents = await Promise.all(
        uniqueEvents.map(async (event) => {
          const participants = await this.eventRepository.findEventParticipants(event.id);
          
          return {
            id: event.id,
            title: event.title,
            description: event.description,
            eventType: event.eventType,
            location: event.location,
            campus: event.campus,
            startDate: event.startDate,
            endDate: event.endDate,
            maxParticipants: event.maxParticipants,
            currentParticipants: event.currentParticipants,
            status: event.status,
            relation: event.relation,
            isActive: this.isEventActive(event),
            participantCount: participants.length,
            daysUntilStart: this.calculateDaysUntil(event.startDate)
          };
        })
      );

      res.json({
        success: true,
        data: enrichedEvents,
        meta: {
          total: enrichedEvents.length,
          created: enrichedEvents.filter(e => e.relation === 'creator').length,
          participating: enrichedEvents.filter(e => e.relation === 'participant').length
        }
      });

    } catch (error) {
      console.error('Error obteniendo mis eventos:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  async updateEvent(req, res) {
    try {
      const userId = req.user.userId;
      const { eventId } = req.params;
      const updateData = req.body;

      // Obtener evento
      const event = await this.eventRepository.findById(eventId);
      if (!event) {
        return res.status(404).json({
          success: false,
          error: 'Evento no encontrado'
        });
      }

      // Verificar que el usuario sea el creador
      if (event.creatorId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Solo el creador puede modificar el evento'
        });
      }

      // Validar que no se modifiquen eventos que ya comenzaron
      if (new Date() >= new Date(event.startDate)) {
        return res.status(400).json({
          success: false,
          error: 'No se puede modificar un evento que ya comenzó'
        });
      }

      // Campos permitidos para actualizar
      const allowedFields = [
        'title', 'description', 'location', 'startDate', 'endDate',
        'maxParticipants', 'isPublic', 'requirements', 'tags'
      ];

      const filteredData = {};
      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          filteredData[field] = updateData[field];
        }
      }

      // Validar fechas si se actualizan
      if (filteredData.startDate || filteredData.endDate) {
        const newStartDate = filteredData.startDate ? new Date(filteredData.startDate) : new Date(event.startDate);
        const newEndDate = filteredData.endDate ? new Date(filteredData.endDate) : new Date(event.endDate);

        if (newStartDate <= new Date()) {
          return res.status(400).json({
            success: false,
            error: 'La fecha de inicio debe ser futura'
          });
        }

        if (newEndDate <= newStartDate) {
          return res.status(400).json({
            success: false,
            error: 'La fecha de fin debe ser posterior a la de inicio'
          });
        }

        filteredData.startDate = newStartDate;
        filteredData.endDate = newEndDate;
      }

      if (Object.keys(filteredData).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No hay campos válidos para actualizar'
        });
      }

      const updatedEvent = await this.eventRepository.update(eventId, filteredData);

      res.json({
        success: true,
        message: 'Evento actualizado exitosamente',
        data: {
          id: updatedEvent.id,
          title: updatedEvent.title,
          description: updatedEvent.description,
          eventType: updatedEvent.eventType,
          location: updatedEvent.location,
          startDate: updatedEvent.startDate,
          endDate: updatedEvent.endDate,
          maxParticipants: updatedEvent.maxParticipants,
          isPublic: updatedEvent.isPublic,
          requirements: updatedEvent.requirements,
          tags: updatedEvent.tags,
          updatedAt: updatedEvent.updatedAt
        }
      });

    } catch (error) {
      console.error('Error actualizando evento:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  async cancelEvent(req, res) {
    try {
      const userId = req.user.userId;
      const { eventId } = req.params;
      const { reason } = req.body;

      // Obtener evento
      const event = await this.eventRepository.findById(eventId);
      if (!event) {
        return res.status(404).json({
          success: false,
          error: 'Evento no encontrado'
        });
      }

      // Verificar que el usuario sea el creador
      if (event.creatorId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Solo el creador puede cancelar el evento'
        });
      }

      // Verificar que el evento no haya terminado
      if (event.status === 'completed') {
        return res.status(400).json({
          success: false,
          error: 'No se puede cancelar un evento que ya terminó'
        });
      }

      // Actualizar estado del evento
      await this.eventRepository.update(eventId, {
        status: 'cancelled'
      });

      // Obtener participantes para notificar
      const participants = await this.eventRepository.findEventParticipants(eventId);

      // Enviar notificaciones a todos los participantes
      const notificationPromises = participants
        .filter(p => p.id !== userId) // Excluir al creador
        .map(participant => 
          this.notificationService.sendEventCancelledNotification(
            participant.id,
            eventId,
            event.title,
            reason
          )
        );

      await Promise.all(notificationPromises);

      res.json({
        success: true,
        message: 'Evento cancelado exitosamente',
        data: {
          eventId: eventId,
          eventTitle: event.title,
          cancelledAt: new Date(),
          reason: reason || null,
          participantsNotified: participants.length - 1 // Excluir al creador
        }
      });

    } catch (error) {
      console.error('Error cancelando evento:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Métodos helper
  calculateDaysUntil(date) {
    const now = new Date();
    const targetDate = new Date(date);
    const diffTime = targetDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  getMainPhoto(photos) {
    if (!photos || photos.length === 0) return null;
    const parsedPhotos = typeof photos === 'string' ? JSON.parse(photos) : photos;
    return parsedPhotos.find(photo => photo.isMain) || parsedPhotos[0] || null;
  }

  // Implementación de getEventById
  async getEventById(req, res) {
    try {
      const { eventId } = req.params;
      const userId = req.user?.userId;

      const event = await this.eventRepository.findById(eventId);
      if (!event) {
        return res.status(404).json({
          success: false,
          error: 'Evento no encontrado'
        });
      }

      // Obtener participantes
      const participants = await this.eventRepository.findEventParticipants(eventId);
      const isParticipating = userId ? participants.some(p => p.id === userId) : false;

      // Obtener info del creador
      let creatorInfo = null;
      if (event.creatorId) {
        const creator = await this.userRepository.findById(event.creatorId);
        if (creator) {
          creatorInfo = {
            id: creator.id,
            firstName: creator.firstName,
            lastName: creator.lastName
          };
        }
      }

      res.json({
        success: true,
        data: {
          id: event.id,
          title: event.title,
          description: event.description,
          eventType: event.eventType,
          location: event.location,
          campus: event.campus,
          startDate: event.startDate,
          endDate: event.endDate,
          maxParticipants: event.maxParticipants,
          currentParticipants: event.currentParticipants,
          isPublic: event.isPublic,
          requirements: event.requirements,
          tags: event.tags,
          status: event.status,
          imageUrl: event.imageUrl,
          createdAt: event.createdAt,
          creatorInfo,
          isParticipating,
          participantCount: participants.length,
          daysUntilStart: this.calculateDaysUntil(event.startDate)
        }
      });
    } catch (error) {
      console.error('Error obteniendo evento por id:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
}
exports.EventController = EventController;