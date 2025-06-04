const Joi = require('joi');

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }
    
    next();
  };
};

// Esquemas de validación
const authSchemas = {
  register: Joi.object({
    email: Joi.string()
      .email()
      .pattern(/^[^@]+@[a-z]+\.upchiapas\.edu\.mx$/i)
      .required()
      .messages({
        'string.email': 'Debe ser un email válido',
        'string.pattern.base': 'Debe usar su email institucional con formato: matricula@carrera.upchiapas.edu.mx',
        'any.required': 'Email es requerido'
      }),
    password: Joi.string()
      .min(8)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'))
      .required()
      .messages({
        'string.min': 'La contraseña debe tener al menos 8 caracteres',
        'string.pattern.base': 'La contraseña debe contener al menos una mayúscula, una minúscula y un número',
        'any.required': 'Contraseña es requerida'
      }),
    firstName: Joi.string()
      .min(2)
      .max(50)
      .pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
      .required()
      .messages({
        'string.min': 'El nombre debe tener al menos 2 caracteres',
        'string.max': 'El nombre no puede exceder 50 caracteres',
        'string.pattern.base': 'El nombre solo puede contener letras',
        'any.required': 'Nombre es requerido'
      }),
    lastName: Joi.string()
      .min(2)
      .max(50)
      .pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
      .required()
      .messages({
        'string.min': 'El apellido debe tener al menos 2 caracteres',
        'string.max': 'El apellido no puede exceder 50 caracteres',
        'string.pattern.base': 'El apellido solo puede contener letras',
        'any.required': 'Apellido es requerido'
      }),
    dateOfBirth: Joi.date()
      .max('now')
      .min('1950-01-01')
      .required()
      .messages({
        'date.max': 'La fecha de nacimiento no puede ser futura',
        'date.min': 'Fecha de nacimiento inválida',
        'any.required': 'Fecha de nacimiento es requerida'
      }),
    career: Joi.string()
      .min(3)
      .max(100)
      .required()
      .messages({
        'string.min': 'La carrera debe tener al menos 3 caracteres',
        'any.required': 'Carrera es requerida'
      }),
    semester: Joi.number()
      .integer()
      .min(1)
      .max(12)
      .required()
      .messages({
        'number.min': 'El semestre debe ser al menos 1',
        'number.max': 'El semestre no puede ser mayor a 12',
        'any.required': 'Semestre es requerido'
      }),
    campus: Joi.string()
      .valid('Tuxtla Gutiérrez', 'Suchiapa', 'Villa Corzo', 'Catazajá')
      .required()
      .messages({
        'any.only': 'Campus debe ser uno de: Tuxtla Gutiérrez, Suchiapa, Villa Corzo, Catazajá',
        'any.required': 'Campus es requerido'
      }),
    academicInterests: Joi.array()
      .items(Joi.string().min(2).max(50))
      .max(10)
      .default([])
      .messages({
        'array.max': 'Máximo 10 intereses académicos'
      })
  }),

  login: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Email inválido',
        'any.required': 'Email es requerido'
      }),
    password: Joi.string()
      .required()
      .messages({
        'any.required': 'Contraseña es requerida'
      })
  })
};

const userSchemas = {
  updateProfile: Joi.object({
    firstName: Joi.string().min(2).max(50),
    lastName: Joi.string().min(2).max(50),
    bio: Joi.string().max(500),
    interests: Joi.array().items(Joi.string()),
    academicProfile: Joi.object({
      academicInterests: Joi.array().items(Joi.string()),
      studySchedule: Joi.object(),
      gpa: Joi.number().min(0).max(4.0)
    })
  })
};

const matchSchemas = {
  createMatch: Joi.object({
    targetUserId: Joi.string().uuid().required(),
    action: Joi.string().valid('like', 'dislike', 'super_like').required()
  })
};

const messageSchemas = {
  sendMessage: Joi.object({
    content: Joi.string().min(1).max(1000).required(),
    messageType: Joi.string().valid('text', 'image', 'emoji', 'study_invitation').default('text'),
    metadata: Joi.object().default({})
  })
};

// src/interfaces/http/middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
  console.error('Error no manejado:', err);

  // Error de validación de Joi
  if (err.isJoi) {
    return res.status(400).json({
      success: false,
      error: err.details[0].message
    });
  }

  // Error de JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Token inválido'
    });
  }

  // Error de JWT expirado
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expirado'
    });
  }

  // Error de base de datos
  if (err.code === '23505') { // PostgreSQL unique constraint
    return res.status(409).json({
      success: false,
      error: 'El recurso ya existe'
    });
  }

  if (err.code === '23503') { // PostgreSQL foreign key constraint
    return res.status(400).json({
      success: false,
      error: 'Referencia inválida'
    });
  }

  // Error por defecto
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor'
  });
};

// src/interfaces/http/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: message
    },
    standardHeaders: true,
    legacyHeaders: false
  });
};

const rateLimiters = {
  auth: createRateLimiter(15 * 60 * 1000, 5, 'Demasiados intentos de autenticación'),
  api: createRateLimiter(15 * 60 * 1000, 100, 'Demasiadas peticiones'),
  messages: createRateLimiter(60 * 1000, 30, 'Demasiados mensajes por minuto')
};

module.exports = {
  validateRequest,
  authSchemas,
  userSchemas,
  matchSchemas,
  messageSchemas,
  errorHandler,
  rateLimiters
};