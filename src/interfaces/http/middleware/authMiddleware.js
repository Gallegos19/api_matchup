const jwt = require('jsonwebtoken');
const config = require('../../../infrastructure/config/environment');

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Token de autorización requerido'
      });
    }

    const token = authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token de autorización requerido'
      });
    }

    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = decoded;
    next();

  } catch (error) {
    console.error('Error en autenticación:', error);
    return res.status(401).json({
      success: false,
      error: 'Token inválido'
    });
  }
};
module.exports = authMiddleware;