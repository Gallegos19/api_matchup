class UserController {
  constructor(userRepository, fileUploadService) {
    this.userRepository = userRepository;
    this.fileUploadService = fileUploadService;
  }

  async getProfile(req, res) {
    try {
      const userId = req.user.userId;
      
      const user = await this.userRepository.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }

      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          dateOfBirth: user.dateOfBirth,
          bio: user.bio,
          interests: user.interests,
          photos: user.photos,
          isEmailVerified: user.isEmailVerified,
          isProfileComplete: user.isProfileComplete,
          lastActive: user.lastActive,
          academicProfile: user.academicProfile,
          age: this.calculateAge(user.dateOfBirth), // Usar método helper
          fullName: `${user.firstName} ${user.lastName}`,
          mainPhoto: this.getMainPhoto(user.photos)
        }
      });

    } catch (error) {
      console.error('Error obteniendo perfil:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  async updateProfile(req, res) {
    try {
      const userId = req.user.userId;
      const updateData = req.body;

      // Campos permitidos para actualizar
      const allowedFields = [
        'firstName', 'lastName', 'bio', 'interests',
        'academicProfile'
      ];

      const filteredData = {};
      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          filteredData[field] = updateData[field];
        }
      }

      if (Object.keys(filteredData).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No hay campos válidos para actualizar'
        });
      }

      const updatedUser = await this.userRepository.update(userId, filteredData);

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado después de actualizar'
        });
      }

      // Verificar si el perfil está completo y actualizar si es necesario
      const isComplete = this.isProfileComplete(updatedUser);
      if (isComplete && !updatedUser.isProfileComplete) {
        await this.userRepository.update(userId, { isProfileComplete: true });
        updatedUser.isProfileComplete = true;
      }

      res.json({
        success: true,
        message: 'Perfil actualizado exitosamente',
        data: {
          id: updatedUser.id,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          bio: updatedUser.bio,
          interests: updatedUser.interests,
          isProfileComplete: updatedUser.isProfileComplete,
          academicProfile: updatedUser.academicProfile
        }
      });

    } catch (error) {
      console.error('Error actualizando perfil:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  async uploadPhotos(req, res) {
    try {
      const userId = req.user.userId;
      
      // Por ahora placeholder - implementar cuando configures Cloudinary
      res.json({
        success: true,
        message: 'Funcionalidad de subida de fotos próximamente disponible',
        note: 'Necesitas configurar Cloudinary para subir fotos reales'
      });

    } catch (error) {
      console.error('Error subiendo fotos:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  async deletePhoto(req, res) {
    try {
      const userId = req.user.userId;
      const { photoId } = req.params;

      const user = await this.userRepository.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }

      const photos = user.photos || [];
      const filteredPhotos = photos.filter(photo => photo.id !== photoId);
      
      if (filteredPhotos.length === photos.length) {
        return res.status(404).json({
          success: false,
          error: 'Foto no encontrada'
        });
      }

      await this.userRepository.update(userId, { photos: filteredPhotos });

      res.json({
        success: true,
        message: 'Foto eliminada exitosamente',
        data: {
          photos: filteredPhotos
        }
      });

    } catch (error) {
      console.error('Error eliminando foto:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  async searchUsers(req, res) {
    try {
      const userId = req.user.userId;
      const { campus, career, semester, limit = 20 } = req.query;

      const user = await this.userRepository.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }

      const filters = {
        campus: campus || user.academicProfile?.campus,
        career: career || null,
        semester: semester ? parseInt(semester) : null,
        limit: parseInt(limit)
      };

      const users = await this.userRepository.findByCampusAndCareer(
        filters.campus,
        filters.career
      );

      // Filtrar por semestre si se especifica
      let filteredUsers = users;
      if (filters.semester && user.academicProfile?.semester) {
        filteredUsers = users.filter(u => 
          u.academicProfile && 
          Math.abs(u.academicProfile.semester - filters.semester) <= 2
        );
      }

      // Excluir al usuario actual
      filteredUsers = filteredUsers.filter(u => u.id !== userId);

      // Limitar resultados
      filteredUsers = filteredUsers.slice(0, filters.limit);

      res.json({
        success: true,
        data: filteredUsers.map(u => ({
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          age: this.calculateAge(u.dateOfBirth), // Usar método helper
          mainPhoto: this.getMainPhoto(u.photos), // Usar método helper
          academicProfile: u.academicProfile ? {
            career: u.academicProfile.career,
            semester: u.academicProfile.semester,
            campus: u.academicProfile.campus
          } : null
        }))
      });

    } catch (error) {
      console.error('Error buscando usuarios:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Métodos helper para reemplazar los métodos de la clase User
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

  // Método helper para verificar si el perfil está completo
  isProfileComplete(user) {
    return user.firstName &&
           user.lastName &&
           user.bio &&
           user.photos && user.photos.length > 0 &&
           user.academicProfile &&
           user.academicProfile.career &&
           user.academicProfile.semester &&
           user.academicProfile.campus;
  }
}

module.exports = UserController;