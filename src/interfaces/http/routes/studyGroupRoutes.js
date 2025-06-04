// src/interfaces/http/routes/studyGroupRoutes.js
const express = require('express');
const { StudyGroupController } = require('../controllers');
const { authMiddleware, validateRequest } = require('../middleware');
const Joi = require('joi');

// Esquemas de validación para grupos de estudio
const studyGroupSchemas = {
  createStudyGroup: Joi.object({
    name: Joi.string().min(3).max(200).required(),
    description: Joi.string().max(1000),
    subject: Joi.string().min(2).max(100).required(),
    career: Joi.string().max(100),
    semester: Joi.number().integer().min(1).max(12),
    campus: Joi.string().valid('Tuxtla Gutiérrez', 'Suchiapa', 'Villa Corzo', 'Catazajá'),
    maxMembers: Joi.number().integer().min(2).max(50).default(10),
    studySchedule: Joi.object({
      monday: Joi.object({
        start: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/),
        end: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
      }),
      tuesday: Joi.object({
        start: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/),
        end: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
      }),
      wednesday: Joi.object({
        start: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/),
        end: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
      }),
      thursday: Joi.object({
        start: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/),
        end: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
      }),
      friday: Joi.object({
        start: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/),
        end: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
      }),
      saturday: Joi.object({
        start: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/),
        end: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
      }),
      sunday: Joi.object({
        start: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/),
        end: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
      })
    }).default({}),
    isPrivate: Joi.boolean().default(false),
    requirements: Joi.array().items(Joi.object({
      type: Joi.string().valid('career', 'semester', 'gpa'),
      values: Joi.array().items(Joi.string()),
      minSemester: Joi.number().integer().min(1).max(12),
      minGpa: Joi.number().min(0).max(4.0)
    })).default([])
  }),

  updateStudyGroup: Joi.object({
    name: Joi.string().min(3).max(200),
    description: Joi.string().max(1000),
    studySchedule: Joi.object(),
    maxMembers: Joi.number().integer().min(2).max(50),
    isPrivate: Joi.boolean(),
    requirements: Joi.array().items(Joi.object({
      type: Joi.string().valid('career', 'semester', 'gpa'),
      values: Joi.array().items(Joi.string()),
      minSemester: Joi.number().integer().min(1).max(12),
      minGpa: Joi.number().min(0).max(4.0)
    }))
  }),

  deleteStudyGroup: Joi.object({
    reason: Joi.string().max(500)
  })
};

const createStudyGroupRoutes = (dependencies) => {
  const router = express.Router();
  
  const studyGroupController = new StudyGroupController(
    dependencies.studyGroupRepository,
    dependencies.userRepository,
    dependencies.notificationService
  );

  // Todas las rutas requieren autenticación
  router.use(authMiddleware);

  // Crear grupo de estudio
  router.post('/',
    validateRequest(studyGroupSchemas.createStudyGroup),
    async (req, res) => {
      try {
        await studyGroupController.createStudyGroup(req, res);
      } catch (error) {
        console.error('Error en ruta create study group:', error);
        res.status(500).json({
          success: false,
          error: 'Error interno del servidor'
        });
      }
    }
  );

  // Obtener grupos de estudio (públicos/por campus)
  router.get('/', async (req, res) => {
    try {
      await studyGroupController.getStudyGroups(req, res);
    } catch (error) {
      console.error('Error en ruta get study groups:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  });

  // Buscar grupos de estudio
  router.get('/search', async (req, res) => {
    try {
      await studyGroupController.searchStudyGroups(req, res);
    } catch (error) {
      console.error('Error en ruta search study groups:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  });

  // Obtener materias populares
  router.get('/popular-subjects', async (req, res) => {
    try {
      await studyGroupController.getPopularSubjects(req, res);
    } catch (error) {
      console.error('Error en ruta popular subjects:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  });

  // Obtener mis grupos de estudio (creados y en los que participo)
  router.get('/my-groups', async (req, res) => {
    try {
      await studyGroupController.getMyStudyGroups(req, res);
    } catch (error) {
      console.error('Error en ruta my study groups:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  });

  // Obtener grupo específico por ID
  router.get('/:groupId', async (req, res) => {
    try {
      await studyGroupController.getStudyGroupById(req, res);
    } catch (error) {
      console.error('Error en ruta get study group by id:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  });

  // Unirse a un grupo de estudio
  router.post('/:groupId/join', async (req, res) => {
    try {
      await studyGroupController.joinStudyGroup(req, res);
    } catch (error) {
      console.error('Error en ruta join study group:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  });

  // Salir de un grupo de estudio
  router.delete('/:groupId/leave', async (req, res) => {
    try {
      await studyGroupController.leaveStudyGroup(req, res);
    } catch (error) {
      console.error('Error en ruta leave study group:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  });

  // Obtener miembros de un grupo
  router.get('/:groupId/members', async (req, res) => {
    try {
      await studyGroupController.getStudyGroupMembers(req, res);
    } catch (error) {
      console.error('Error en ruta get study group members:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  });

  // Actualizar grupo de estudio (solo creador)
  router.put('/:groupId',
    validateRequest(studyGroupSchemas.updateStudyGroup),
    async (req, res) => {
      try {
        await studyGroupController.updateStudyGroup(req, res);
      } catch (error) {
        console.error('Error en ruta update study group:', error);
        res.status(500).json({
          success: false,
          error: 'Error interno del servidor'
        });
      }
    }
  );

  // Eliminar grupo de estudio (solo creador)
  router.delete('/:groupId',
    validateRequest(studyGroupSchemas.deleteStudyGroup),
    async (req, res) => {
      try {
        await studyGroupController.deleteStudyGroup(req, res);
      } catch (error) {
        console.error('Error en ruta delete study group:', error);
        res.status(500).json({
          success: false,
          error: 'Error interno del servidor'
        });
      }
    }
  );

  return router;
};

module.exports = createStudyGroupRoutes;