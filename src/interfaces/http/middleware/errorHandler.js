const config = require('../../../infrastructure/config/environment');

const errorHandler = (err, req, res, next) => {
  console.error('🚨 Error capturado:', {
    message: err.message,
    stack: config.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Error de validación JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Token de acceso inválido'
    });
  }

  // Error de JWT expirado
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token de acceso expirado'
    });
  }

  // Error de validación de Joi
  if (err.isJoi) {
    return res.status(400).json({
      success: false,
      error: 'Datos de entrada inválidos',
      details: err.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  // Error de Multer (subida de archivos)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: 'Archivo demasiado grande. Máximo 5MB por archivo.'
    });
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      success: false,
      error: 'Demasiados archivos. Máximo 4 archivos por vez.'
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      error: 'Campo de archivo inesperado'
    });
  }

  // Errores de base de datos PostgreSQL
  if (err.code === '23505') { // Unique constraint violation
    return res.status(409).json({
      success: false,
      error: 'El recurso ya existe'
    });
  }

  if (err.code === '23503') { // Foreign key constraint violation
    return res.status(400).json({
      success: false,
      error: 'Referencia inválida'
    });
  }

  if (err.code === '23502') { // Not null constraint violation
    return res.status(400).json({
      success: false,
      error: 'Campo requerido faltante'
    });
  }

  if (err.code === '23514') { // Check constraint violation
    return res.status(400).json({
      success: false,
      error: 'Valor fuera de rango permitido'
    });
  }

  // Error de conexión a base de datos
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    return res.status(503).json({
      success: false,
      error: 'Servicio temporalmente no disponible'
    });
  }

  // Rate limiting
  if (err.status === 429) {
    return res.status(429).json({
      success: false,
      error: err.message || 'Demasiadas peticiones'
    });
  }

  // Error personalizado de la aplicación
  if (err.status && err.message) {
    return res.status(err.status).json({
      success: false,
      error: err.message
    });
  }

  // Error por defecto
  const status = err.status || err.statusCode || 500;
  const message = config.NODE_ENV === 'production' 
    ? 'Error interno del servidor' 
    : err.message || 'Error interno del servidor';

  res.status(status).json({
    success: false,
    error: message,
    ...(config.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;