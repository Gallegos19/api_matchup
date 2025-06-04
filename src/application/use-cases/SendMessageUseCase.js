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

    // 6. Marcar como entregado
    savedMessage.markAsDelivered();
    await this.messageRepository.update(savedMessage.id, savedMessage);

    // 7. Enviar notificación push
    await this.notificationService.sendMessageNotification(receiverId, senderId, message);

    return savedMessage;
  }
}
module.exports = {
    SendMessageUseCase
};