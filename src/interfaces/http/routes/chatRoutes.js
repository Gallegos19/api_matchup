const express = require('express');
const { authMiddleware } = require('../middleware');

const createChatRoutes = (dependencies) => {
  const router = express.Router();

  // Rutas básicas sin controlador complejo por ahora
  router.get('/conversations', authMiddleware, (req, res) => {
    res.json({
      success: true,
      message: 'Conversaciones - próximamente',
      data: [],
      userId: req.user.userId
    });
  });

  router.get('/:matchId/messages', authMiddleware, (req, res) => {
    res.json({
      success: true,
      message: 'Mensajes - próximamente',
      data: [],
      matchId: req.params.matchId,
      userId: req.user.userId
    });
  });

  router.post('/:matchId/messages', authMiddleware, (req, res) => {
    res.json({
      success: true,
      message: 'Enviar mensaje - próximamente',
      matchId: req.params.matchId,
      content: req.body.content
    });
  });

  router.get('/:matchId/messages/poll', authMiddleware, (req, res) => {
    // Long polling básico - por ahora retorna inmediatamente
    res.json({
      success: true,
      message: 'Long polling - próximamente',
      data: []
    });
  });

  return router;
};

module.exports = createChatRoutes;