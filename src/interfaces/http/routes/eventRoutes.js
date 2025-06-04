// src/interfaces/http/routes/eventRoutes.js
const express = require('express');
const { EventController } = require('../controllers/EventController');
const { authMiddleware, validateRequest } = require('../middleware');
const Joi = require('joi');

// Esquemas de validación para eventos
const eventSchemas = {
  createEvent: Joi.object({
    title: Joi.string().min(3).max(200).required(),
    description: Joi.string().max(1000),
    eventType: Joi.string().valid('social', 'academic', 'sports', 'cultural').default('social'),
    location: Joi.string().max(200),
    campus: Joi.string().valid('Tuxtla Gutiérrez', 'Suchiapa', 'Villa Corzo', 'Catazajá'),
    startDate: Joi.date().greater('now').required(),
    endDate: Joi.date().greater(Joi.ref('startDate')).required(),
    maxParticipants: Joi.number().integer().min(2).max(1000),
    isPublic: Joi.boolean().default(true),
    requirements: Joi.array().items(Joi.object({
      type: Joi.string().valid('career', 'semester', 'gpa'),
      values: Joi.array().items(Joi.string()),
      minSemester: Joi.number().integer().min(1).max(12),
      minGpa: Joi.number().min(0).max(4.0)
    })).default([]),
    tags: Joi.array().items(Joi.string().max(50)).max(10).default([])
  }),

  updateEvent: Joi.object({
    title: Joi.string().min(3).max(200),
    description: Joi.string().max(1000),
    location: Joi.string().max(200),
    startDate: Joi.date().greater('now'),
    endDate: Joi.date(),
    maxParticipants: Joi.number().integer().min(2).max(1000),
    isPublic: Joi.boolean(),
    requirements: Joi.array().items(Joi.object({
      type: Joi.string().valid('career', 'semester', 'gpa'),
      values: Joi.array().items(Joi.string()),
      minSemester: Joi.number().integer().min(1).max(12),
      minGpa: Joi.number().min(0).max(4.0)
    })),
    tags: Joi.array().items(Joi.string().max(50)).max(10)
  }),

  cancelEvent: Joi.object({
    reason: Joi.string().max(500)
  })
};

const createEventRoutes = (dependencies) => {
  const router = express.Router();
  
  const eventController = new EventController(
    dependencies.eventRepository,
    dependencies.userRepository,
    dependencies.notificationService
  );

  // Todas las rutas requieren autenticación
  router.use(authMiddleware);

  // Crear evento
  router.post('/',
    validateRequest(eventSchemas.createEvent),
    async (req, res) => {
      try {
        await eventController.createEvent(req, res);
      } catch (error) {
        console.error('Error en ruta create event:', error);
        res.status(500).json({
          success: false,
          error: 'Error interno del servidor'
        });
      }
    }
  );

  // Obtener eventos (públicos/por campus)
  router.get('/', async (req, res) => {
    try {
      await eventController.getEvents(req, res);
    } catch (error) {
      console.error('Error en ruta get events:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  });

  // Obtener mis eventos (creados y en los que participo)
  router.get('/my-events', async (req, res) => {
    try {
      await eventController.getMyEvents(req, res);
    } catch (error) {
      console.error('Error en ruta my events:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  });

  // Obtener evento específico por ID
  router.get('/:eventId', async (req, res) => {
    try {
      await eventController.getEventById(req, res);
    } catch (error) {
      console.error('Error en ruta get event by id:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  });

  // Unirse a un evento
  router.post('/:eventId/join', async (req, res) => {
    try {
      await eventController.joinEvent(req, res);
    } catch (error) {
      console.error('Error en ruta join event:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  });

  // Salir de un evento
  router.delete('/:eventId/leave', async (req, res) => {
    try {
      await eventController.leaveEvent(req, res);
    } catch (error) {
      console.error('Error en ruta leave event:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  });

  // Actualizar evento (solo creador)
  router.put('/:eventId',
    validateRequest(eventSchemas.updateEvent),
    async (req, res) => {
      try {
        await eventController.updateEvent(req, res);
      } catch (error) {
        console.error('Error en ruta update event:', error);
        res.status(500).json({
          success: false,
          error: 'Error interno del servidor'
        });
      }
    }
  );

  // Cancelar evento (solo creador)
  router.patch('/:eventId/cancel',
    validateRequest(eventSchemas.cancelEvent),
    async (req, res) => {
      try {
        await eventController.cancelEvent(req, res);
      } catch (error) {
        console.error('Error en ruta cancel event:', error);
        res.status(500).json({
          success: false,
          error: 'Error interno del servidor'
        });
      }
    }
  );

  return router;
};

module.exports = createEventRoutes;