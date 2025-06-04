class Match {
  constructor({
    id,
    userId1,
    userId2,
    status = 'pending', // pending, matched, unmatched, blocked
    matchedAt = null,
    compatibility = 0,
    user1Action = null, // like, dislike, super_like
    user2Action = null,
    lastInteraction = new Date(),
    createdAt = new Date(),
    updatedAt = new Date()
  }) {
    this.id = id;
    this.userId1 = userId1;
    this.userId2 = userId2;
    this.status = status;
    this.matchedAt = matchedAt;
    this.compatibility = compatibility;
    this.user1Action = user1Action;
    this.user2Action = user2Action;
    this.lastInteraction = lastInteraction;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  isMatched() {
    return this.status === 'matched';
  }

  isMutualLike() {
    return (this.user1Action === 'like' || this.user1Action === 'super_like') &&
           (this.user2Action === 'like' || this.user2Action === 'super_like');
  }

  processAction(userId, action) {
    if (userId === this.userId1) {
      this.user1Action = action;
    } else if (userId === this.userId2) {
      this.user2Action = action;
    } else {
      throw new Error('Usuario no autorizado para esta acción');
    }

    // Verificar si hay match
    if (this.isMutualLike() && this.status === 'pending') {
      this.status = 'matched';
      this.matchedAt = new Date();
    }

    this.lastInteraction = new Date();
    this.updatedAt = new Date();
  }

  unmatch() {
    this.status = 'unmatched';
    this.updatedAt = new Date();
  }

  block() {
    this.status = 'blocked';
    this.updatedAt = new Date();
  }
}

module.exports = {
  Match,
};