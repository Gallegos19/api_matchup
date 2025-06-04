const { SendMessageUseCase, GetMessagesUseCase } = require('../../../application/use-cases');

class ChatController {
  constructor(messageRepository, matchRepository, notificationService) {
    this.messageRepository = messageRepository;
    this.matchRepository = matchRepository;
    this.sendMessageUseCase = new SendMessageUseCase(
      messageRepository,
      matchRepository,
      notificationService
    );
    this.getMessagesUseCase = new GetMessagesUseCase(
      messageRepository,
      matchRepository
    );
  }

  async sendMessage(req, res) {
    try {
      const userId = req.user.userId;
      const { matchId } = req.params;
      const { content, messageType = 'text', metadata = {} } = req.body;

      if (!content.trim()) {
        return res.status(400).json({
          success: false,
          error: 'El contenido del mensaje es requerido'
        });
      }

      const message = await this.sendMessageUseCase.execute(
        matchId,
        userId,
        { content, messageType, metadata }
      );

      res.json({
        success: true,
        message: 'Mensaje enviado',
        data: {
          id: message.id,
          content: message.content,
          messageType: message.messageType,
          createdAt: message.createdAt,
          isDelivered: message.isDelivered
        }
      });

    } catch (error) {
      console.error('Error enviando mensaje:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async getMessages(req, res) {
    try {
      const userId = req.user.userId;
      const { matchId } = req.params;
      const { since } = req.query;

      const lastMessageTimestamp = since ? new Date(since) : null;

      const messages = await this.getMessagesUseCase.execute(
        matchId,
        userId,
        lastMessageTimestamp
      );

      res.json({
        success: true,
        data: messages.map(msg => ({
          id: msg.id,
          senderId: msg.senderId,
          content: msg.content,
          messageType: msg.messageType,
          metadata: msg.metadata,
          isRead: msg.isRead,
          createdAt: msg.createdAt,
          senderInfo: msg.senderInfo
        }))
      });

    } catch (error) {
      console.error('Error obteniendo mensajes:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  // Long polling para mensajes en tiempo real
  async longPollMessages(req, res) {
    try {
      const userId = req.user.userId;
      const { matchId } = req.params;
      const { since, timeout = 30000 } = req.query;

      const startTime = Date.now();
      const pollTimeout = parseInt(timeout);
      const lastMessageTimestamp = since ? new Date(since) : new Date();

      const checkForNewMessages = async () => {
        const messages = await this.getMessagesUseCase.execute(
          matchId,
          userId,
          lastMessageTimestamp
        );

        if (messages.length > 0) {
          return res.json({
            success: true,
            data: messages.map(msg => ({
              id: msg.id,
              senderId: msg.senderId,
              content: msg.content,
              messageType: msg.messageType,
              createdAt: msg.createdAt,
              senderInfo: msg.senderInfo
            }))
          });
        }

        // Si no hay mensajes y no ha pasado el timeout, esperar y volver a revisar
        if (Date.now() - startTime < pollTimeout) {
          setTimeout(checkForNewMessages, 1000);
        } else {
          // Timeout alcanzado, devolver respuesta vacía
          res.json({
            success: true,
            data: []
          });
        }
      };

      await checkForNewMessages();

    } catch (error) {
      console.error('Error en long polling:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async getConversations(req, res) {
    try {
      const userId = req.user.userId;

      const matches = await this.matchRepository.findMatchesByUserId(userId);

      // Obtener último mensaje para cada conversación
      const conversationsPromises = matches.map(async (match) => {
        const lastMessage = await this.messageRepository.getLastMessageByMatch(match.id);
        const unreadCount = await this.messageRepository.findUnreadMessages(userId);
        const unreadInThisMatch = unreadCount.filter(msg => msg.matchId === match.id).length;

        return {
          matchId: match.id,
          otherUser: userId === match.userId1 ? {
            id: match.userId2,
            firstName: match.user2Info.firstName,
            lastName: match.user2Info.lastName,
            photos: match.user2Info.photos
          } : {
            id: match.userId1,
            firstName: match.user1Info.firstName,
            lastName: match.user1Info.lastName,
            photos: match.user1Info.photos
          },
          lastMessage: lastMessage ? {
            content: lastMessage.content,
            createdAt: lastMessage.createdAt,
            senderId: lastMessage.senderId
          } : null,
          unreadCount: unreadInThisMatch,
          matchedAt: match.matchedAt
        };
      });

      const conversations = await Promise.all(conversationsPromises);

      // Ordenar por último mensaje
      conversations.sort((a, b) => {
        if (!a.lastMessage && !b.lastMessage) return 0;
        if (!a.lastMessage) return 1;
        if (!b.lastMessage) return -1;
        return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
      });

      res.json({
        success: true,
        data: conversations
      });

    } catch (error) {
      console.error('Error obteniendo conversaciones:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  async markAsRead(req, res) {
    try {
      const userId = req.user.userId;
      const { matchId } = req.params;
      const { messageIds } = req.body;

      if (!messageIds || !Array.isArray(messageIds)) {
        return res.status(400).json({
          success: false,
          error: 'messageIds debe ser un array'
        });
      }

      await this.messageRepository.markAsRead(messageIds, userId);

      res.json({
        success: true,
        message: 'Mensajes marcados como leídos'
      });

    } catch (error) {
      console.error('Error marcando mensajes como leídos:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
}
module.exports = ChatController;