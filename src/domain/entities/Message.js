class Message {
  constructor({
    id,
    matchId,
    senderId,
    receiverId,
    content,
    messageType = 'text', // text, image, emoji, study_invitation
    metadata = {},
    isRead = false,
    isDelivered = false,
    readAt = null,
    deliveredAt = null,
    createdAt = new Date(),
    updatedAt = new Date()
  }) {
    this.id = id;
    this.matchId = matchId;
    this.senderId = senderId;
    this.receiverId = receiverId;
    this.content = content;
    this.messageType = messageType;
    this.metadata = metadata;
    this.isRead = isRead;
    this.isDelivered = isDelivered;
    this.readAt = readAt;
    this.deliveredAt = deliveredAt;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  markAsDelivered() {
    this.isDelivered = true;
    this.deliveredAt = new Date();
    this.updatedAt = new Date();
  }

  markAsRead() {
    this.isRead = true;
    this.readAt = new Date();
    this.updatedAt = new Date();
  }

  isStudyInvitation() {
    return this.messageType === 'study_invitation';
  }

  getFormattedTime() {
    return this.createdAt.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
module.exports = {
  Message
};