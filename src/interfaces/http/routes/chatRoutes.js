// src/interfaces/http/routes/chatRoutes.js
const express = require('express');
const { ChatController } = require('../controllers/');
const { authMiddleware, validateRequest, messageSchemas, rateLimiters } = require('../middleware');

const createChatRoutes = (dependencies) => {
  const router = express.Router();
  
  const chatController = new ChatController(
    dependencies.messageRepository,
    dependencies.matchRepository,
    dependencies.notificationService
  );

  // Todas las rutas requieren autenticación
  router.use(authMiddleware);

  // Obtener conversaciones del usuario
  router.get('/conversations', async (req, res) => {
    try {
      await chatController.getConversations(req, res);
    } catch (error) {
      console.error('Error en ruta conversations:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  });

  // Obtener mensajes de una conversación específica
  router.get('/:matchId/messages', async (req, res) => {
    try {
      await chatController.getMessages(req, res);
    } catch (error) {
      console.error('Error en ruta get messages:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  });

  // Enviar mensaje en una conversación
  router.post('/:matchId/messages',
    rateLimiters.messages,
    validateRequest(messageSchemas.sendMessage),
    async (req, res) => {
      try {
        await chatController.sendMessage(req, res);
      } catch (error) {
        console.error('Error en ruta send message:', error);
        res.status(500).json({
          success: false,
          error: 'Error interno del servidor'
        });
      }
    }
  );

  // Long polling para nuevos mensajes
  router.get('/:matchId/messages/poll', async (req, res) => {
    try {
      await chatController.longPollMessages(req, res);
    } catch (error) {
      console.error('Error en ruta long poll messages:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  });

  // Marcar mensajes específicos como leídos
  router.patch('/:matchId/messages/read', async (req, res) => {
    try {
      await chatController.markAsRead(req, res);
    } catch (error) {
      console.error('Error en ruta mark as read:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  });

  // Marcar todos los mensajes de una conversación como leídos
  router.patch('/:matchId/messages/read-all', async (req, res) => {
    try {
      await chatController.markAllAsRead(req, res);
    } catch (error) {
      console.error('Error en ruta mark all as read:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  });

  // Obtener conteo de mensajes no leídos
  router.get('/unread-count', async (req, res) => {
    try {
      await chatController.getUnreadCount(req, res);
    } catch (error) {
      console.error('Error en ruta unread count:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  });

  // Enviar invitación de estudio
  router.post('/:matchId/study-invitation', async (req, res) => {
    try {
      await chatController.sendStudyInvitation(req, res);
    } catch (error) {
      console.error('Error en ruta study invitation:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  });

  // Responder a invitación de estudio
  router.patch('/messages/:messageId/study-response', async (req, res) => {
    try {
      await chatController.respondToStudyInvitation(req, res);
    } catch (error) {
      console.error('Error en ruta study response:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  });

  return router;
};

module.exports = createChatRoutes;