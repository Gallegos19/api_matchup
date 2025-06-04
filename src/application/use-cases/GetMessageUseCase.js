class GetMessagesUseCase {
  constructor(messageRepository, matchRepository) {
    this.messageRepository = messageRepository;
    this.matchRepository = matchRepository;
  }

  async execute(matchId, userId, lastMessageTimestamp = null) {
    // 1. Verificar autorización
    const match = await this.matchRepository.findById(matchId);
    if (!match || (match.userId1 !== userId && match.userId2 !== userId)) {
      throw new Error('No autorizado para ver estos mensajes');
    }

    // 2. Obtener mensajes
    let messages;
    if (lastMessageTimestamp) {
      // Para long polling: solo mensajes nuevos
      messages = await this.messageRepository.findNewMessagesSince(
        matchId, 
        lastMessageTimestamp
      );
    } else {
      // Carga inicial: últimos 50 mensajes
      messages = await this.messageRepository.findByMatchId(matchId, 50, 0);
    }

    // 3. Marcar mensajes como leídos
    const unreadMessageIds = messages
      .filter(msg => msg.receiverId === userId && !msg.isRead)
      .map(msg => msg.id);
    
    if (unreadMessageIds.length > 0) {
      await this.messageRepository.markAsRead(unreadMessageIds, userId);
    }

    return messages;
  }
}
module.exports = {
    GetMessagesUseCase
};