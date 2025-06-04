// src/infrastructure/config/dependencies.js - ACTUALIZADO
const Database = require('../persistence/database');

const setupDependencies = async () => {
  console.log('🔧 Configurando dependencias...');
  
  try {
    // Importar repositorios dinámicamente para evitar errores de circular dependency
    const PostgreSQLUserRepository = require('../persistence/postgresql/PostgreSQLUserRepository');
    const PostgreSQLMatchRepository = require('../persistence/postgresql/PostgreSQLMatchRepository');
    const PostgreSQLMessageRepository = require('../persistence/postgresql/PostgreSQLMessageRepository');
    const { PostgreSQLEventRepository } = require('../persistence/postgresql/PostgreSQLEventRepository');
    const PostgreSQLStudyGroupRepository = require('../persistence/postgresql/PostgreSQLStudyGroupRepository');

    // Importar servicios
    const JwtService = require('../security/JwtService');
    const EmailService = require('../external-services/EmailService');
    const FileUploadService = require('../external-services/FileUploadService');
    const NotificationService = require('../external-services/NotificationService');

    // Verificar que Database esté disponible
    if (!Database) {
      throw new Error('Database no está disponible');
    }

    // Inicializar servicios
    const jwtService = new JwtService();
    const emailService = new EmailService();
    const fileUploadService = new FileUploadService();
    const notificationService = new NotificationService();

    // Inicializar repositorios con Database
    const userRepository = new PostgreSQLUserRepository(Database);
    const matchRepository = new PostgreSQLMatchRepository(Database);
    const messageRepository = new PostgreSQLMessageRepository(Database);
    const eventRepository = new PostgreSQLEventRepository(Database);
    const studyGroupRepository = new PostgreSQLStudyGroupRepository(Database);

    console.log('✅ Dependencias configuradas correctamente');

    return {
      database: Database,
      userRepository,
      matchRepository,
      messageRepository,
      eventRepository,
      studyGroupRepository,
      jwtService,
      emailService,
      fileUploadService,
      notificationService
    };

  } catch (error) {
    console.error('❌ Error configurando dependencias:', error);
    throw error;
  }
};

module.exports = { setupDependencies };