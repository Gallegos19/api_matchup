const { MatchingAlgorithm } = require('../../../domain/services');
const { v4: uuidv4 } = require('uuid');

class MatchController {
  constructor(matchRepository, userRepository) {
    this.matchRepository = matchRepository;
    this.userRepository = userRepository;
    this.matchingAlgorithm = new MatchingAlgorithm();
  }

  async getPotentialMatches(req, res) {
    try {
      const userId = req.user.userId;
      const { limit = 10 } = req.query;

      console.log('🔍 Buscando matches potenciales para usuario:', userId);

      // 1. Obtener el usuario actual
      const currentUser = await this.userRepository.findById(userId);
      if (!currentUser) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }

      // 2. Verificar que el usuario esté listo para matching
      if (!this.isEligibleForMatching(currentUser)) {
        return res.status(400).json({
          success: false,
          error: 'Completa tu perfil para ver matches potenciales',
          requirements: {
            emailVerified: currentUser.isEmailVerified,
            profileComplete: currentUser.isProfileComplete,
            hasPhotos: (currentUser.photos && currentUser.photos.length > 0),
            hasAcademicProfile: !!currentUser.academicProfile
          }
        });
      }

      // 3. Obtener usuarios del mismo campus
      const candidateUsers = await this.userRepository.findByCampusAndCareer(
        currentUser.academicProfile.campus,
        null // Todas las carreras
      );

      console.log('👥 Candidatos encontrados:', candidateUsers.length);

      // 4. Filtrar usuarios elegibles y calcular compatibilidad
      const potentialMatches = [];
      
      for (const candidate of candidateUsers) {
        // Excluir al usuario actual
        if (candidate.id === userId) continue;
        
        // Verificar que el candidato esté disponible para matching
        if (!this.isEligibleForMatching(candidate)) continue;

        // Verificar que no haya interacción previa
        const existingMatch = await this.matchRepository.findByUsers(userId, candidate.id);
        if (existingMatch) continue;

        // Calcular compatibilidad
        const compatibility = this.calculateCompatibility(
          currentUser.academicProfile,
          candidate.academicProfile
        );

        potentialMatches.push({
          user: candidate,
          compatibility
        });
      }

      // 5. Ordenar por compatibilidad y limitar resultados
      const sortedMatches = potentialMatches
        .sort((a, b) => b.compatibility - a.compatibility)
        .slice(0, parseInt(limit));

      console.log('💖 Matches potenciales procesados:', sortedMatches.length);

      // 6. Formatear respuesta
      const response = sortedMatches.map(match => ({
        id: match.user.id,
        firstName: match.user.firstName,
        lastName: match.user.lastName,
        age: this.calculateAge(match.user.dateOfBirth),
        bio: match.user.bio || '',
        photos: match.user.photos || [],
        mainPhoto: this.getMainPhoto(match.user.photos),
        academicProfile: {
          career: match.user.academicProfile.career,
          semester: match.user.academicProfile.semester,
          campus: match.user.academicProfile.campus,
          academicInterests: match.user.academicProfile.academicInterests || []
        },
        compatibility: match.compatibility,
        distance: this.calculateDistance(currentUser.academicProfile, match.user.academicProfile)
      }));

      res.json({
        success: true,
        data: response,
        meta: {
          total: response.length,
          userCampus: currentUser.academicProfile.campus,
          userCareer: currentUser.academicProfile.career
        }
      });

    } catch (error) {
      console.error('❌ Error obteniendo matches potenciales:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  async createMatch(req, res) {
    try {
      const userId = req.user.userId;
      const { targetUserId, action } = req.body;

      console.log('💕 Procesando acción de match:', { userId, targetUserId, action });

      // Validar acción
      if (!['like', 'dislike', 'super_like'].includes(action)) {
        return res.status(400).json({
          success: false,
          error: 'Acción inválida. Debe ser: like, dislike, o super_like'
        });
      }

      // Verificar que no sea el mismo usuario
      if (userId === targetUserId) {
        return res.status(400).json({
          success: false,
          error: 'No puedes hacer match contigo mismo'
        });
      }

      // Verificar que ambos usuarios existan
      const [user, targetUser] = await Promise.all([
        this.userRepository.findById(userId),
        this.userRepository.findById(targetUserId)
      ]);

      if (!user || !targetUser) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }

      // Verificar que ambos estén disponibles para matching
      if (!this.isEligibleForMatching(user) || !this.isEligibleForMatching(targetUser)) {
        return res.status(400).json({
          success: false,
          error: 'Uno o ambos usuarios no están disponibles para matching'
        });
      }

      // Buscar o crear match
      let match = await this.matchRepository.findByUsers(userId, targetUserId);
      
      if (!match) {
        // Calcular compatibilidad
        const compatibility = this.calculateCompatibility(
          user.academicProfile,
          targetUser.academicProfile
        );

        // Crear nuevo match
        match = {
          id: uuidv4(),
          userId1: userId,
          userId2: targetUserId,
          status: 'pending',
          compatibility: compatibility,
          user1Action: null,
          user2Action: null,
          matchedAt: null,
          lastInteraction: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }

      // Procesar acción
      if (match.userId1 === userId) {
        match.user1Action = action;
      } else if (match.userId2 === userId) {
        match.user2Action = action;
      } else {
        // Si el match existe pero el usuario no está en él, reorganizar
        match.userId2 = userId;
        match.user2Action = action;
      }

      // Verificar si hay match mutuo
      const isMutualLike = (match.user1Action === 'like' || match.user1Action === 'super_like') &&
                          (match.user2Action === 'like' || match.user2Action === 'super_like');

      if (isMutualLike && match.status === 'pending') {
        match.status = 'matched';
        match.matchedAt = new Date();
      }

      match.lastInteraction = new Date();
      match.updatedAt = new Date();

      // Guardar match
      const savedMatch = await this.matchRepository.save(match);

      // Respuesta
      const isMatch = savedMatch.status === 'matched';
      
      res.json({
        success: true,
        message: isMatch ? '¡Es un match! 🎉' : 'Acción registrada',
        data: {
          matchId: savedMatch.id,
          isMatch: isMatch,
          compatibility: savedMatch.compatibility,
          action: action,
          otherUser: isMatch ? {
            id: targetUser.id,
            firstName: targetUser.firstName,
            lastName: targetUser.lastName,
            mainPhoto: this.getMainPhoto(targetUser.photos)
          } : null
        }
      });

    } catch (error) {
      console.error('❌ Error creando match:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async getMatches(req, res) {
    try {
      const userId = req.user.userId;

      console.log('💑 Obteniendo matches para usuario:', userId);

      const matches = await this.matchRepository.findMatchesByUserId(userId);

      const response = matches.map(match => {
        const isUser1 = match.userId1 === userId;
        const otherUser = isUser1 ? match.user2Info : match.user1Info;

        return {
          matchId: match.id,
          matchedAt: match.matchedAt,
          compatibility: match.compatibility,
          lastInteraction: match.lastInteraction,
          otherUser: {
            id: isUser1 ? match.userId2 : match.userId1,
            firstName: otherUser.firstName,
            lastName: otherUser.lastName,
            photos: otherUser.photos,
            mainPhoto: this.getMainPhoto(otherUser.photos)
          }
        };
      });

      res.json({
        success: true,
        data: response,
        meta: {
          total: response.length
        }
      });

    } catch (error) {
      console.error('❌ Error obteniendo matches:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  async unmatch(req, res) {
    try {
      const userId = req.user.userId;
      const { matchId } = req.params;

      const match = await this.matchRepository.findById(matchId);
      if (!match) {
        return res.status(404).json({
          success: false,
          error: 'Match no encontrado'
        });
      }

      if (match.userId1 !== userId && match.userId2 !== userId) {
        return res.status(403).json({
          success: false,
          error: 'No autorizado'
        });
      }

      // Actualizar status a unmatched
      match.status = 'unmatched';
      match.updatedAt = new Date();
      
      await this.matchRepository.update(matchId, match);

      res.json({
        success: true,
        message: 'Match deshecho exitosamente'
      });

    } catch (error) {
      console.error('❌ Error deshaciendo match:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  async getMatchStatistics(req, res) {
    try {
      const userId = req.user.userId;

      const stats = await this.matchRepository.getMatchStatistics(userId);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Métodos helper
  isEligibleForMatching(user) {
    return user.isEmailVerified && 
           user.isActive && 
           user.academicProfile &&
           user.academicProfile.career &&
           user.academicProfile.campus;
  }

  calculateCompatibility(profile1, profile2) {
    let compatibility = 0;

    // Factor de carrera (40%)
    if (profile1.career === profile2.career) {
      compatibility += 40;
    } else {
      // Carreras relacionadas tienen algo de compatibilidad
      const relatedCareers = this.getRelatedCareers(profile1.career);
      if (relatedCareers.includes(profile2.career)) {
        compatibility += 20;
      }
    }

    // Factor de campus (30%)
    if (profile1.campus === profile2.campus) {
      compatibility += 30;
    }

    // Factor de semestre (20%)
    const semesterDiff = Math.abs(profile1.semester - profile2.semester);
    if (semesterDiff <= 1) {
      compatibility += 20;
    } else if (semesterDiff <= 2) {
      compatibility += 15;
    } else if (semesterDiff <= 3) {
      compatibility += 10;
    }

    // Factor de intereses comunes (10%)
    if (profile1.academicInterests && profile2.academicInterests) {
      const commonInterests = profile1.academicInterests.filter(interest => 
        profile2.academicInterests.includes(interest)
      );
      compatibility += Math.min(commonInterests.length * 2, 10);
    }

    return Math.round(Math.min(compatibility, 100));
  }

  getRelatedCareers(career) {
    const careerGroups = {
      'Ingeniería en Desarrollo de Software': ['Ingeniería en Sistemas Informáticos'],
      'Ingeniería en Sistemas Informáticos': ['Ingeniería en Desarrollo de Software'],
      'Ingeniería Industrial': ['Ingeniería Electromecánica'],
      'Ingeniería Electromecánica': ['Ingeniería Industrial', 'Ingeniería en Energías Renovables'],
      'Licenciatura en Administración y Gestión': ['Licenciatura en Contaduría Pública'],
      'Licenciatura en Contaduría Pública': ['Licenciatura en Administración y Gestión']
    };

    return careerGroups[career] || [];
  }

  calculateDistance(profile1, profile2) {
    // Por ahora solo basado en campus
    if (profile1.campus === profile2.campus) {
      return 'Mismo campus';
    } else {
      return 'Campus diferente';
    }
  }

  calculateAge(dateOfBirth) {
    if (!dateOfBirth) return null;
    
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  getMainPhoto(photos) {
    if (!photos || photos.length === 0) return null;
    return photos.find(photo => photo.isMain) || photos[0] || null;
  }
}

module.exports = MatchController;