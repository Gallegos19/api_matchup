class CreateMatchUseCase {
  constructor(matchRepository, userRepository, matchingAlgorithm) {
    this.matchRepository = matchRepository;
    this.userRepository = userRepository;
    this.matchingAlgorithm = matchingAlgorithm;
  }

  async execute(userId, targetUserId, action) {
    // 1. Validar usuarios
    const user = await this.userRepository.findById(userId);
    const targetUser = await this.userRepository.findById(targetUserId);
    
    if (!user || !targetUser) {
      throw new Error('Usuario no encontrado');
    }

    if (!user.isEligibleForMatching() || !targetUser.isEligibleForMatching()) {
      throw new Error('Uno o ambos usuarios no están disponibles para matching');
    }

    // 2. Verificar si ya existe una interacción
    let match = await this.matchRepository.findByUsers(userId, targetUserId);
    
    if (!match) {
      // 3. Calcular compatibilidad
      const compatibility = this.matchingAlgorithm.calculateCompatibility(
        user.academicProfile,
        targetUser.academicProfile
      );

      // 4. Crear nuevo match
      match = new Match({
        id: generateId(),
        userId1: userId,
        userId2: targetUserId,
        compatibility: compatibility
      });
    }

    // 5. Procesar acción
    match.processAction(userId, action);

    // 6. Guardar match
    const savedMatch = await this.matchRepository.save(match);

    // 7. Si hay match mutuo, crear notificación
    if (savedMatch.isMatched()) {
      // await this.notificationService.sendMatchNotification(savedMatch);
    }

    return savedMatch;
  }
}

module.exports = {
    CreateMatchUseCase
};