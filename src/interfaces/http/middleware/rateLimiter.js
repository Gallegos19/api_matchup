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
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting para health check
      return req.path === '/health';
    }
  });
};

const rateLimiters = {
  auth: createRateLimiter(
    15 * 60 * 1000, // 15 minutos
    5, // 5 intentos
    'Demasiados intentos de autenticación. Intenta de nuevo en 15 minutos.'
  ),
  api: createRateLimiter(
    15 * 60 * 1000, // 15 minutos
    100, // 100 requests
    'Demasiadas peticiones. Intenta de nuevo más tarde.'
  ),
  messages: createRateLimiter(
    60 * 1000, // 1 minuto
    30, // 30 mensajes
    'Demasiados mensajes por minuto. Espera un momento.'
  )
};

module.exports = { rateLimiters };