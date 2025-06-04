// src/interfaces/http/controllers/StudyGroupController.js
const { JoinStudyGroupUseCase } = require('../../../application/use-cases/JoinStudyGroupUseCase');
const { v4: uuidv4 } = require('uuid');

class StudyGroupController {
  constructor(studyGroupRepository, userRepository, notificationService) {
    this.studyGroupRepository = studyGroupRepository;
    this.userRepository = userRepository;
    this.notificationService = notificationService;
    this.joinStudyGroupUseCase = new JoinStudyGroupUseCase(
      studyGroupRepository,
      userRepository,
      notificationService
    );
  }

  async createStudyGroup(req, res) {
    try {
      const userId = req.user.userId;
      const {
        name,
        description,
        subject,
        career,
        semester,
        campus,
        maxMembers = 10,
        studySchedule = {},
        isPrivate = false,
        requirements = []
      } = req.body;

      // Validaciones básicas
      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          error: 'El nombre del grupo es requerido'
        });
      }

      if (!subject || !subject.trim()) {
        return res.status(400).json({
          success: false,
          error: 'La materia es requerida'
        });
      }

      // Obtener información del usuario creador
      const creator = await this.userRepository.findById(userId);
      if (!creator) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }

      // Crear el grupo de estudio
      const studyGroupData = {
        id: uuidv4(),
        creatorId: userId,
        name: name.trim(),
        description: description?.trim() || '',
        subject: subject.trim(),
        career: career || creator.academicProfile?.career,
        semester: semester || creator.academicProfile?.semester,
        campus: campus || creator.academicProfile?.campus,
        maxMembers: parseInt(maxMembers),
        currentMembers: 1, // El creador se cuenta como miembro
        studySchedule,
        isPrivate,
        requirements,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const studyGroup = await this.studyGroupRepository.save(studyGroupData);

      // Agregar al creador como miembro
      await this.studyGroupRepository.addMember(studyGroup.id, userId);

      res.status(201).json({
        success: true,
        message: 'Grupo de estudio creado exitosamente',
        data: {
          id: studyGroup.id,
          name: studyGroup.name,
          description: studyGroup.description,
          subject: studyGroup.subject,
          career: studyGroup.career,
          semester: studyGroup.semester,
          campus: studyGroup.campus,
          maxMembers: studyGroup.maxMembers,
          currentMembers: studyGroup.currentMembers,
          studySchedule: studyGroup.studySchedule,
          isPrivate: studyGroup.isPrivate,
          requirements: studyGroup.requirements,
          status: studyGroup.status,
          createdAt: studyGroup.createdAt,
          creatorInfo: {
            id: creator.id,
            firstName: creator.firstName,
            lastName: creator.lastName
          }
        }
      });

    } catch (error) {
      console.error('Error creando grupo de estudio:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async getStudyGroups(req, res) {
    try {
      const userId = req.user.userId;
      const { 
        campus, 
        career, 
        subject, 
        limit = 20, 
        offset = 0,
        includePrivate = 'false'
      } = req.query;

      // Obtener información del usuario para filtros por defecto
      const user = await this.userRepository.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }

      const targetCampus = campus || user.academicProfile?.campus;
      const targetCareer = career || null;

      let studyGroups;

      if (subject) {
        studyGroups = await this.studyGroupRepository.findBySubject(subject, targetCampus);
      } else {
        studyGroups = await this.studyGroupRepository.findByCampusAndCareer(targetCampus, targetCareer);
      }

      // Filtrar grupos privados si no se especifica incluirlos
      if (includePrivate !== 'true') {
        studyGroups = studyGroups.filter(group => !group.isPrivate);
      }

      // Enriquecer grupos con información adicional
      const enrichedGroups = await Promise.all(
        studyGroups.map(async (group) => {
          const members = await this.studyGroupRepository.findGroupMembers(group.id);
          const isMember = members.some(m => m.userId === userId);
          const isCreator = group.creatorId === userId;
          
          return {
            id: group.id,
            name: group.name,
            description: group.description,
            subject: group.subject,
            career: group.career,
            semester: group.semester,
            campus: group.campus,
            maxMembers: group.maxMembers,
            currentMembers: group.currentMembers,
            studySchedule: group.studySchedule,
            isPrivate: group.isPrivate,
            requirements: group.requirements,
            status: group.status,
            createdAt: group.createdAt,
            isMember,
            isCreator,
            canJoin: user && group.canUserJoin(user.academicProfile) && !isMember,
            hasAvailableSpots: group.hasAvailableSpots(),
            memberCount: members.length,
            isActive: group.isActive()
          };
        })
      );

      // Ordenar por relevancia (grupos donde el usuario puede unirse primero)
      enrichedGroups.sort((a, b) => {
        if (a.canJoin && !b.canJoin) return -1;
        if (!a.canJoin && b.canJoin) return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      // Aplicar paginación
      const paginatedGroups = enrichedGroups.slice(
        parseInt(offset),
        parseInt(offset) + parseInt(limit)
      );

      res.json({
        success: true,
        data: paginatedGroups,
        meta: {
          total: enrichedGroups.length,
          campus: targetCampus,
          career: targetCareer || 'all',
          subject: subject || 'all',
          hasMore: enrichedGroups.length > parseInt(offset) + parseInt(limit)
        }
      });

    } catch (error) {
      console.error('Error obteniendo grupos de estudio:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  async getStudyGroupById(req, res) {
    try {
      const userId = req.user.userId;
      const { groupId } = req.params;

      const group = await this.studyGroupRepository.findById(groupId);
      if (!group) {
        return res.status(404).json({
          success: false,
          error: 'Grupo de estudio no encontrado'
        });
      }

      // Obtener miembros del grupo
      const members = await this.studyGroupRepository.findGroupMembers(groupId);
      const isMember = members.some(m => m.userId === userId);
      const isCreator = group.creatorId === userId;

      // Verificar si el usuario puede unirse
      const user = await this.userRepository.findById(userId);
      const canJoin = user && group.canUserJoin(user.academicProfile) && !isMember;

      res.json({
        success: true,
        data: {
          id: group.id,
          name: group.name,
          description: group.description,
          subject: group.subject,
          career: group.career,
          semester: group.semester,
          campus: group.campus,
          maxMembers: group.maxMembers,
          currentMembers: group.currentMembers,
          studySchedule: group.studySchedule,
          isPrivate: group.isPrivate,
          requirements: group.requirements,
          status: group.status,
          createdAt: group.createdAt,
          updatedAt: group.updatedAt,
          isMember,
          isCreator,
          canJoin,
          hasAvailableSpots: group.hasAvailableSpots(),
          isActive: group.isActive(),
          members: members.map(m => ({
            userId: m.userId,
            firstName: m.firstName,
            lastName: m.lastName,
            career: m.career,
            semester: m.semester,
            role: m.role,
            joinedAt: m.joinedAt,
            mainPhoto: this.getMainPhoto(m.photos)
          }))
        }
      });

    } catch (error) {
      console.error('Error obteniendo grupo de estudio:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  async joinStudyGroup(req, res) {
    try {
      const userId = req.user.userId;
      const { groupId } = req.params;

      console.log('👥 Usuario intentando unirse al grupo:', { userId, groupId });

      const group = await this.joinStudyGroupUseCase.execute(groupId, userId);

      res.json({
        success: true,
        message: '¡Te has unido al grupo de estudio exitosamente!',
        data: {
          groupId: group.id,
          groupName: group.name,
          subject: group.subject,
          joinedAt: new Date(),
          newMemberCount: group.currentMembers
        }
      });

    } catch (error) {
      console.error('Error uniéndose al grupo de estudio:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async leaveStudyGroup(req, res) {
    try {
      const userId = req.user.userId;
      const { groupId } = req.params;

      // Obtener grupo
      const group = await this.studyGroupRepository.findById(groupId);
      if (!group) {
        return res.status(404).json({
          success: false,
          error: 'Grupo de estudio no encontrado'
        });
      }

      // Verificar que el usuario no sea el creador
      if (group.creatorId === userId) {
        return res.status(400).json({
          success: false,
          error: 'El creador no puede abandonar su propio grupo. Puedes eliminarlo si es necesario.'
        });
      }

      // Verificar que sea miembro
      const members = await this.studyGroupRepository.findGroupMembers(groupId);
      if (!members.some(m => m.userId === userId)) {
        return res.status(400).json({
          success: false,
          error: 'No eres miembro de este grupo'
        });
      }

      // Salir del grupo
      await this.studyGroupRepository.removeMember(groupId, userId);

      // Actualizar contador de miembros
      group.removeMember();
      await this.studyGroupRepository.update(groupId, group);

      res.json({
        success: true,
        message: 'Has salido del grupo de estudio exitosamente',
        data: {
          groupId: groupId,
          groupName: group.name,
          leftAt: new Date()
        }
      });

    } catch (error) {
      console.error('Error saliendo del grupo de estudio:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  async getMyStudyGroups(req, res) {
    try {
      const userId = req.user.userId;
      const { type = 'all' } = req.query; // 'created', 'member', 'all'

      let groups = [];

      if (type === 'created' || type === 'all') {
        const createdGroups = await this.studyGroupRepository.findByCreator(userId);
        groups.push(...createdGroups.map(group => ({ ...group, relation: 'creator' })));
      }

      if (type === 'member' || type === 'all') {
        // Obtener grupos donde el usuario es miembro pero no creador
        const allGroups = await this.studyGroupRepository.findByCampusAndCareer(null, null);
        for (const group of allGroups) {
          if (group.creatorId !== userId) {
            const members = await this.studyGroupRepository.findGroupMembers(group.id);
            if (members.some(m => m.userId === userId)) {
              groups.push({ ...group, relation: 'member' });
            }
          }
        }
      }

      // Eliminar duplicados
      const uniqueGroups = groups.filter((group, index, self) =>
        index === self.findIndex(g => g.id === group.id)
      );

      // Enriquecer con información adicional
      const enrichedGroups = await Promise.all(
        uniqueGroups.map(async (group) => {
          const members = await this.studyGroupRepository.findGroupMembers(group.id);
          
          return {
            id: group.id,
            name: group.name,
            description: group.description,
            subject: group.subject,
            career: group.career,
            semester: group.semester,
            campus: group.campus,
            maxMembers: group.maxMembers,
            currentMembers: group.currentMembers,
            isPrivate: group.isPrivate,
            status: group.status,
            relation: group.relation,
            createdAt: group.createdAt,
            memberCount: members.length,
            isActive: this.isActiveGroup(group),
            hasAvailableSpots: typeof group.hasAvailableSpots === 'function' ? group.hasAvailableSpots() : (group.currentMembers < group.maxMembers)
          };
        })
      );

      // Ordenar por fecha de creación/unión
      enrichedGroups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      res.json({
        success: true,
        data: enrichedGroups,
        meta: {
          total: enrichedGroups.length,
          created: enrichedGroups.filter(g => g.relation === 'creator').length,
          member: enrichedGroups.filter(g => g.relation === 'member').length
        }
      });

    } catch (error) {
      console.error('Error obteniendo mis grupos de estudio:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  async updateStudyGroup(req, res) {
    try {
      const userId = req.user.userId;
      const { groupId } = req.params;
      const updateData = req.body;

      // Obtener grupo
      const group = await this.studyGroupRepository.findById(groupId);
      if (!group) {
        return res.status(404).json({
          success: false,
          error: 'Grupo de estudio no encontrado'
        });
      }

      // Verificar que el usuario sea el creador
      if (group.creatorId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Solo el creador puede modificar el grupo'
        });
      }

      // Campos permitidos para actualizar
      const allowedFields = [
        'name', 'description', 'studySchedule', 'maxMembers', 
        'isPrivate', 'requirements'
      ];

      const filteredData = {};
      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          filteredData[field] = updateData[field];
        }
      }

      // Validar maxMembers si se actualiza
      if (filteredData.maxMembers && filteredData.maxMembers < group.currentMembers) {
        return res.status(400).json({
          success: false,
          error: `No puedes reducir el máximo de miembros por debajo del número actual (${group.currentMembers})`
        });
      }

      if (Object.keys(filteredData).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No hay campos válidos para actualizar'
        });
      }

      const updatedGroup = await this.studyGroupRepository.update(groupId, filteredData);

      res.json({
        success: true,
        message: 'Grupo de estudio actualizado exitosamente',
        data: {
          id: updatedGroup.id,
          name: updatedGroup.name,
          description: updatedGroup.description,
          studySchedule: updatedGroup.studySchedule,
          maxMembers: updatedGroup.maxMembers,
          isPrivate: updatedGroup.isPrivate,
          requirements: updatedGroup.requirements,
          updatedAt: updatedGroup.updatedAt
        }
      });

    } catch (error) {
      console.error('Error actualizando grupo de estudio:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  async deleteStudyGroup(req, res) {
    try {
      const userId = req.user.userId;
      const { groupId } = req.params;
      const { reason } = req.body;

      // Obtener grupo
      const group = await this.studyGroupRepository.findById(groupId);
      if (!group) {
        return res.status(404).json({
          success: false,
          error: 'Grupo de estudio no encontrado'
        });
      }

      // Verificar que el usuario sea el creador
      if (group.creatorId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Solo el creador puede eliminar el grupo'
        });
      }

      // Obtener miembros para notificar
      const members = await this.studyGroupRepository.findGroupMembers(groupId);

      // Eliminar grupo
      await this.studyGroupRepository.delete(groupId);

      // Enviar notificaciones a todos los miembros
      const notificationPromises = members
        .filter(m => m.userId !== userId) // Excluir al creador
        .map(member => 
          this.notificationService.sendStudyGroupDeletedNotification(
            member.userId,
            groupId,
            group.name,
            reason
          )
        );

      await Promise.all(notificationPromises);

      res.json({
        success: true,
        message: 'Grupo de estudio eliminado exitosamente',
        data: {
          groupId: groupId,
          groupName: group.name,
          deletedAt: new Date(),
          reason: reason || null,
          membersNotified: members.length - 1 // Excluir al creador
        }
      });

    } catch (error) {
      console.error('Error eliminando grupo de estudio:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  async getStudyGroupMembers(req, res) {
    try {
      const userId = req.user.userId;
      const { groupId } = req.params;

      // Verificar que el grupo existe
      const group = await this.studyGroupRepository.findById(groupId);
      if (!group) {
        return res.status(404).json({
          success: false,
          error: 'Grupo de estudio no encontrado'
        });
      }

      // Verificar que el usuario es miembro o el grupo es público
      const members = await this.studyGroupRepository.findGroupMembers(groupId);
      const isMember = members.some(m => m.userId === userId);
      
      if (group.isPrivate && !isMember) {
        return res.status(403).json({
          success: false,
          error: 'No tienes permisos para ver los miembros de este grupo privado'
        });
      }

      const enrichedMembers = members.map(member => ({
        userId: member.userId,
        firstName: member.firstName,
        lastName: member.lastName,
        fullName: `${member.firstName} ${member.lastName}`,
        career: member.career,
        semester: member.semester,
        role: member.role,
        joinedAt: member.joinedAt,
        mainPhoto: this.getMainPhoto(member.photos),
        isCreator: member.userId === group.creatorId
      }));

      // Ordenar: creador primero, luego por fecha de unión
      enrichedMembers.sort((a, b) => {
        if (a.isCreator) return -1;
        if (b.isCreator) return 1;
        return new Date(a.joinedAt) - new Date(b.joinedAt);
      });

      res.json({
        success: true,
        data: enrichedMembers,
        meta: {
          groupId: groupId,
          groupName: group.name,
          totalMembers: enrichedMembers.length,
          maxMembers: group.maxMembers,
          hasAvailableSpots: group.hasAvailableSpots()
        }
      });

    } catch (error) {
      console.error('Error obteniendo miembros del grupo:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Método helper
  getMainPhoto(photos) {
    if (!photos || photos.length === 0) return null;
    const parsedPhotos = typeof photos === 'string' ? JSON.parse(photos) : photos;
    return parsedPhotos.find(photo => photo.isMain) || parsedPhotos[0] || null;
  }

  // Helper para saber si un grupo está activo
  isActiveGroup(group) {
    // Puedes ajustar la lógica según tu modelo de datos
    return group.status === 'active';
  }

   async searchStudyGroups(req, res) {
    try {
      const userId = req.user.userId;
      const { q: searchTerm, campus, limit = 20 } = req.query;

      if (!searchTerm || searchTerm.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: 'El término de búsqueda debe tener al menos 2 caracteres'
        });
      }

      // Obtener información del usuario para filtros por defecto
      const user = await this.userRepository.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }

      const targetCampus = campus || user.academicProfile?.campus;
      
      const studyGroups = await this.studyGroupRepository.searchGroups(
        searchTerm.trim(),
        targetCampus,
        parseInt(limit)
      );

      // Enriquecer con información adicional
      const enrichedGroups = await Promise.all(
        studyGroups.map(async (group) => {
          const members = await this.studyGroupRepository.findGroupMembers(group.id);
          const isMember = members.some(m => m.userId === userId);
          const isCreator = group.creatorId === userId;
          
          return {
            id: group.id,
            name: group.name,
            description: group.description,
            subject: group.subject,
            career: group.career,
            semester: group.semester,
            campus: group.campus,
            maxMembers: group.maxMembers,
            currentMembers: group.currentMembers,
            isPrivate: group.isPrivate,
            status: group.status,
            createdAt: group.createdAt,
            isMember,
            isCreator,
            canJoin: user && group.canUserJoin(user.academicProfile) && !isMember,
            hasAvailableSpots: group.hasAvailableSpots(),
            memberCount: members.length,
            creatorInfo: group.creatorInfo
          };
        })
      );

      res.json({
        success: true,
        data: enrichedGroups,
        meta: {
          searchTerm: searchTerm.trim(),
          total: enrichedGroups.length,
          campus: targetCampus,
          limit: parseInt(limit)
        }
      });

    } catch (error) {
      console.error('Error buscando grupos de estudio:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  async getPopularSubjects(req, res) {
    try {
      const userId = req.user.userId;
      const { campus, limit = 10 } = req.query;

      // Obtener información del usuario para filtros por defecto
      const user = await this.userRepository.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }

      const targetCampus = campus || user.academicProfile?.campus;
      
      const popularSubjects = await this.studyGroupRepository.getPopularSubjects(
        targetCampus,
        parseInt(limit)
      );

      res.json({
        success: true,
        data: popularSubjects,
        meta: {
          campus: targetCampus,
          total: popularSubjects.length
        }
      });

    } catch (error) {
      console.error('Error obteniendo materias populares:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
}


module.exports = StudyGroupController;