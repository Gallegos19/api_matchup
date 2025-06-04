const { SendMessageUseCase } = require('../../../application/use-cases/SendMessageUseCase');
const { GetMessagesUseCase } = require('../../../application/use-cases/GetMessageUseCase');

class ChatController {
  constructor(messageRepository, matchRepository, notificationService) {
    this.messageRepository = messageRepository;
    this.matchRepository = matchRepository;
    this.notificationService = notificationService;
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

      if (!content || !content.trim()) {
        return res.status(400).json({
          success: false,
          error: 'El contenido del mensaje es requerido'
        });
      }

      // Validar longitud del mensaje
      if (content.length > 1000) {
        return res.status(400).json({
          success: false,
          error: 'El mensaje no puede exceder 1000 caracteres'
        });
      }

      const message = await this.sendMessageUseCase.execute(
        matchId,
        userId,
        { content: content.trim(), messageType, metadata }
      );

      res.json({
        success: true,
        message: 'Mensaje enviado exitosamente',
        data: {
          id: message.id,
          matchId: message.matchId,
          senderId: message.senderId,
          receiverId: message.receiverId,
          content: message.content,
          messageType: message.messageType,
          metadata: message.metadata,
          isDelivered: message.isDelivered,
          createdAt: message.createdAt,
          formattedTime: message.getFormattedTime()
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
      const { since, limit = 50, offset = 0 } = req.query;

      const lastMessageTimestamp = since ? new Date(since) : null;

      const messages = await this.getMessagesUseCase.execute(
        matchId,
        userId,
        lastMessageTimestamp
      );

      // Si no hay mensajes nuevos y se especificó timestamp, usar paginación normal
      let finalMessages = messages;
      if (messages.length === 0 && !lastMessageTimestamp) {
        finalMessages = await this.messageRepository.findByMatchId(
          matchId, 
          parseInt(limit), 
          parseInt(offset)
        );
      }

      res.json({
        success: true,
        data: finalMessages.map(msg => ({
          id: msg.id,
          matchId: msg.matchId,
          senderId: msg.senderId,
          receiverId: msg.receiverId,
          content: msg.content,
          messageType: msg.messageType,
          metadata: msg.metadata,
          isRead: msg.isRead,
          isDelivered: msg.isDelivered,
          createdAt: msg.createdAt,
          readAt: msg.readAt,
          deliveredAt: msg.deliveredAt,
          formattedTime: msg.getFormattedTime(),
          senderInfo: msg.senderInfo,
          isStudyInvitation: msg.isStudyInvitation()
        })),
        meta: {
          hasMore: finalMessages.length === parseInt(limit),
          total: finalMessages.length,
          offset: parseInt(offset)
        }
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
      const pollTimeout = Math.min(parseInt(timeout), 60000); // Máximo 60 segundos
      const lastMessageTimestamp = since ? new Date(since) : new Date();

      const checkForNewMessages = async () => {
        try {
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
                matchId: msg.matchId,
                senderId: msg.senderId,
                content: msg.content,
                messageType: msg.messageType,
                metadata: msg.metadata,
                createdAt: msg.createdAt,
                formattedTime: msg.getFormattedTime(),
                senderInfo: msg.senderInfo
              })),
              timestamp: new Date().toISOString()
            });
          }

          // Si no hay mensajes y no ha pasado el timeout, esperar y volver a revisar
          if (Date.now() - startTime < pollTimeout) {
            setTimeout(checkForNewMessages, 2000); // Revisar cada 2 segundos
          } else {
            // Timeout alcanzado, devolver respuesta vacía
            res.json({
              success: true,
              data: [],
              timeout: true,
              timestamp: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error('Error en long polling check:', error);
          res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
          });
        }
      };

      // Configurar timeout de respuesta del cliente
      req.setTimeout(pollTimeout + 5000, () => {
        res.json({
          success: true,
          data: [],
          timeout: true,
          timestamp: new Date().toISOString()
        });
      });

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
      const { limit = 20, offset = 0 } = req.query;

      console.log('💬 Obteniendo conversaciones para usuario:', userId);

      const matches = await this.matchRepository.findMatchesByUserId(userId);

      // Obtener último mensaje y conteo de no leídos para cada conversación
      const conversationsPromises = matches.map(async (match) => {
        try {
          const [lastMessage, unreadMessages] = await Promise.all([
            this.messageRepository.getLastMessageByMatch(match.id),
            this.messageRepository.findUnreadMessages(userId)
          ]);

          const unreadInThisMatch = unreadMessages.filter(msg => msg.matchId === match.id).length;

          // Determinar qué usuario es el "otro" usuario
          const isUser1 = match.userId1 === userId;
          const otherUserId = isUser1 ? match.userId2 : match.userId1;
          const otherUserInfo = isUser1 ? match.user2Info : match.user1Info;

          return {
            matchId: match.id,
            compatibility: match.compatibility,
            matchedAt: match.matchedAt,
            lastInteraction: match.lastInteraction,
            otherUser: {
              id: otherUserId,
              firstName: otherUserInfo.firstName,
              lastName: otherUserInfo.lastName,
              fullName: `${otherUserInfo.firstName} ${otherUserInfo.lastName}`,
              photos: otherUserInfo.photos,
              mainPhoto: this.getMainPhoto(otherUserInfo.photos)
            },
            lastMessage: lastMessage ? {
              id: lastMessage.id,
              content: lastMessage.content,
              messageType: lastMessage.messageType,
              senderId: lastMessage.senderId,
              createdAt: lastMessage.createdAt,
              formattedTime: lastMessage.getFormattedTime(),
              isFromCurrentUser: lastMessage.senderId === userId
            } : null,
            unreadCount: unreadInThisMatch,
            hasUnread: unreadInThisMatch > 0
          };
        } catch (error) {
          console.error(`Error procesando conversación ${match.id}:`, error);
          return null;
        }
      });

      const conversations = (await Promise.all(conversationsPromises))
        .filter(conv => conv !== null); // Filtrar conversaciones con errores

      // Ordenar por último mensaje o por fecha de match
      conversations.sort((a, b) => {
        const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt) : new Date(a.matchedAt);
        const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt) : new Date(b.matchedAt);
        return bTime - aTime;
      });

      // Aplicar paginación
      const paginatedConversations = conversations.slice(
        parseInt(offset), 
        parseInt(offset) + parseInt(limit)
      );

      res.json({
        success: true,
        data: paginatedConversations,
        meta: {
          total: conversations.length,
          hasMore: conversations.length > parseInt(offset) + parseInt(limit),
          offset: parseInt(offset),
          limit: parseInt(limit),
          totalUnread: conversations.reduce((sum, conv) => sum + conv.unreadCount, 0)
        }
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

      if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'messageIds debe ser un array no vacío'
        });
      }

      // Validar que sean UUIDs válidos
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const invalidIds = messageIds.filter(id => !uuidRegex.test(id));
      
      if (invalidIds.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Algunos IDs de mensaje son inválidos',
          invalidIds: invalidIds
        });
      }

      await this.messageRepository.markAsRead(messageIds, userId);

      res.json({
        success: true,
        message: `${messageIds.length} mensaje(s) marcado(s) como leído(s)`,
        data: {
          markedCount: messageIds.length,
          messageIds: messageIds
        }
      });

    } catch (error) {
      console.error('Error marcando mensajes como leídos:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  async markAllAsRead(req, res) {
    try {
      const userId = req.user.userId;
      const { matchId } = req.params;

      // Obtener todos los mensajes no leídos del match
      const unreadMessages = await this.messageRepository.findUnreadMessages(userId);
      const unreadInMatch = unreadMessages
        .filter(msg => msg.matchId === matchId)
        .map(msg => msg.id);

      if (unreadInMatch.length === 0) {
        return res.json({
          success: true,
          message: 'No hay mensajes pendientes por leer',
          data: { markedCount: 0 }
        });
      }

      await this.messageRepository.markAsRead(unreadInMatch, userId);

      res.json({
        success: true,
        message: `${unreadInMatch.length} mensaje(s) marcado(s) como leído(s)`,
        data: {
          markedCount: unreadInMatch.length,
          messageIds: unreadInMatch
        }
      });

    } catch (error) {
      console.error('Error marcando todos los mensajes como leídos:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  async getUnreadCount(req, res) {
    try {
      const userId = req.user.userId;

      const unreadMessages = await this.messageRepository.findUnreadMessages(userId);
      
      // Agrupar por match
      const unreadByMatch = {};
      unreadMessages.forEach(msg => {
        if (!unreadByMatch[msg.matchId]) {
          unreadByMatch[msg.matchId] = 0;
        }
        unreadByMatch[msg.matchId]++;
      });

      const totalUnread = unreadMessages.length;

      res.json({
        success: true,
        data: {
          totalUnread: totalUnread,
          unreadByMatch: unreadByMatch,
          hasUnread: totalUnread > 0
        }
      });

    } catch (error) {
      console.error('Error obteniendo conteo de no leídos:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  async sendStudyInvitation(req, res) {
    try {
      const userId = req.user.userId;
      const { matchId } = req.params;
      const { subject, description, scheduledTime, location } = req.body;

      if (!subject || !subject.trim()) {
        return res.status(400).json({
          success: false,
          error: 'El tema de estudio es requerido'
        });
      }

      const studyInvitation = {
        type: 'study_invitation',
        subject: subject.trim(),
        description: description?.trim() || '',
        scheduledTime: scheduledTime ? new Date(scheduledTime) : null,
        location: location?.trim() || null,
        status: 'pending'
      };

      const message = await this.sendMessageUseCase.execute(
        matchId,
        userId,
        {
          content: `📚 Invitación para estudiar: ${subject}`,
          messageType: 'study_invitation',
          metadata: studyInvitation
        }
      );

      res.json({
        success: true,
        message: 'Invitación de estudio enviada',
        data: {
          id: message.id,
          matchId: message.matchId,
          senderId: message.senderId,
          content: message.content,
          messageType: message.messageType,
          metadata: message.metadata,
          createdAt: message.createdAt
        }
      });

    } catch (error) {
      console.error('Error enviando invitación de estudio:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async respondToStudyInvitation(req, res) {
    try {
      const userId = req.user.userId;
      const { messageId } = req.params;
      const { response, message: responseMessage } = req.body;

      if (!['accept', 'decline'].includes(response)) {
        return res.status(400).json({
          success: false,
          error: 'La respuesta debe ser "accept" o "decline"'
        });
      }

      // Buscar el mensaje de invitación
      const invitation = await this.messageRepository.findById(messageId);
      if (!invitation) {
        return res.status(404).json({
          success: false,
          error: 'Invitación no encontrada'
        });
      }

      if (invitation.receiverId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'No tienes permisos para responder esta invitación'
        });
      }

      if (invitation.messageType !== 'study_invitation') {
        return res.status(400).json({
          success: false,
          error: 'Este mensaje no es una invitación de estudio'
        });
      }

      // Actualizar metadata de la invitación
      const updatedMetadata = {
        ...invitation.metadata,
        status: response === 'accept' ? 'accepted' : 'declined',
        respondedAt: new Date(),
        responseMessage: responseMessage?.trim() || null
      };

      // Actualizar el mensaje original
      await this.messageRepository.update(messageId, {
        metadata: updatedMetadata
      });

      // Enviar mensaje de respuesta
      const responseContent = response === 'accept' 
        ? `✅ Invitación aceptada${responseMessage ? `: ${responseMessage}` : ''}`
        : `❌ Invitación rechazada${responseMessage ? `: ${responseMessage}` : ''}`;

      const responseMsg = await this.sendMessageUseCase.execute(
        invitation.matchId,
        userId,
        {
          content: responseContent,
          messageType: 'text',
          metadata: {
            type: 'study_invitation_response',
            originalInvitationId: messageId,
            response: response
          }
        }
      );

      res.json({
        success: true,
        message: `Invitación ${response === 'accept' ? 'aceptada' : 'rechazada'}`,
        data: {
          originalInvitation: {
            id: invitation.id,
            metadata: updatedMetadata
          },
          responseMessage: {
            id: responseMsg.id,
            content: responseMsg.content,
            createdAt: responseMsg.createdAt
          }
        }
      });

    } catch (error) {
      console.error('Error respondiendo invitación de estudio:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Método helper
  getMainPhoto(photos) {
    if (!photos || photos.length === 0) return null;
    return photos.find(photo => photo.isMain) || photos[0] || null;
  }
}

module.exports = ChatController;