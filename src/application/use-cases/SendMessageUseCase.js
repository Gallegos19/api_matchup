// src/application/use-cases/SendMessageUseCase.js - CORREGIDO
const { Message } = require("../../domain/entities");
const { v4: generateId } = require('uuid');

class SendMessageUseCase {
  constructor(messageRepository, matchRepository, notificationService) {
    this.messageRepository = messageRepository;
    this.matchRepository = matchRepository;
    this.notificationService = notificationService;
  }

  async execute(matchId, senderId, messageData) {
    // 1. Verificar que el match existe y está activo
    const match = await this.matchRepository.findById(matchId);
    if (!match) {
      throw new Error('Match no encontrado');
    }

    if (!match.isMatched()) {
      throw new Error('No puedes enviar mensajes a este match');
    }

    // 2. Verificar que el usuario está autorizado
    if (match.userId1 !== senderId && match.userId2 !== senderId) {
      throw new Error('No autorizado para enviar mensajes en este match');
    }

    // 3. Determinar receptor
    const receiverId = match.userId1 === senderId ? match.userId2 : match.userId1;

    // 4. Crear mensaje
    const message = new Message({
      id: generateId(),
      matchId: matchId,
      senderId: senderId,
      receiverId: receiverId,
      content: messageData.content,
      messageType: messageData.messageType || 'text',
      metadata: messageData.metadata || {}
    });

    // 5. Guardar mensaje
    const savedMessage = await this.messageRepository.save(message);

    // 6. Marcar como entregado usando el método específico del repositorio
    try {
      await this.messageRepository.markAsDelivered(savedMessage.id);
      savedMessage.markAsDelivered(); // También actualizar la entidad en memoria
    } catch (error) {
      console.error('Error marcando mensaje como entregado:', error);
      // No lanzar error, el mensaje ya se guardó exitosamente
    }

    // 7. Enviar notificación push
    try {
      await this.notificationService.sendMessageNotification(receiverId, senderId, savedMessage);
    } catch (error) {
      console.error('Error enviando notificación:', error);
      // No lanzar error, el mensaje ya se guardó exitosamente
    }

    return savedMessage;
  }
}

module.exports = {
  SendMessageUseCase
};