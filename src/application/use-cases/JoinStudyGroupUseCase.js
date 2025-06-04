class JoinStudyGroupUseCase {
  constructor(studyGroupRepository, userRepository, notificationService) {
    this.studyGroupRepository = studyGroupRepository;
    this.userRepository = userRepository;
    this.notificationService = notificationService;
  }

  async execute(groupId, userId) {
    // 1. Obtener grupo y usuario
    const group = await this.studyGroupRepository.findById(groupId);
    const user = await this.userRepository.findById(userId);

    if (!group || !user) {
      throw new Error('Grupo o usuario no encontrado');
    }

    // 2. Verificar que el grupo está activo
    if (!group.isActive()) {
      throw new Error('El grupo no está activo');
    }

    // 3. Verificar disponibilidad
    if (!group.hasAvailableSpots()) {
      throw new Error('El grupo está lleno');
    }

    // 4. Verificar elegibilidad
    if (!group.canUserJoin(user.academicProfile)) {
      throw new Error('No cumples los requisitos para unirte a este grupo');
    }

    // 5. Verificar que no esté ya en el grupo
    const existingMembers = await this.studyGroupRepository.findGroupMembers(groupId);
    if (existingMembers.some(member => member.userId === userId)) {
      throw new Error('Ya eres miembro de este grupo');
    }

    // 6. Agregar miembro
    await this.studyGroupRepository.addMember(groupId, userId);

    // 7. Actualizar contador
    group.addMember();
    await this.studyGroupRepository.update(groupId, group);

    // 8. Notificar al creador
    await this.notificationService.sendStudyGroupJoinNotification(
      group.creatorId, 
      userId, 
      groupId
    );

    return group;
  }
}

module.exports = {
  JoinStudyGroupUseCase
};
