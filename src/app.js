// src/app.js - ACTUALIZADO
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Importar configuración
const config = require('./infrastructure/config/environment');

// Importar middlewares
const { errorHandler, rateLimiters } = require('./interfaces/http/middleware');

const createApp = async () => {
  console.log('🔧 Configurando aplicación Express...');
  
  const app = express();

  // Middlewares de seguridad
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }));

  app.use(cors({
    origin: config.ALLOWED_ORIGINS || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // Rate limiting global (solo para rutas API)
  app.use('/api/', rateLimiters.api);

  // Middlewares de parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Logging (solo en desarrollo)
  if (config.NODE_ENV !== 'test') {
    app.use(morgan('combined'));
  }

  // Health check (sin autenticación)
  app.get('/health', (req, res) => {
    res.json({
      success: true,
      message: 'MatchUP API funcionando correctamente',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: config.NODE_ENV
    });
  });

  // Configurar dependencias
  console.log('🔧 Configurando dependencias...');
  const { setupDependencies } = require('./infrastructure/config/dependencies');
  const dependencies = await setupDependencies();

  // Rutas de la API
  console.log('🛣️ Configurando rutas...');
  
  // Importar las funciones de rutas
  const createAuthRoutes = require('./interfaces/http/routes/authRoutes');
  const createUserRoutes = require('./interfaces/http/routes/userRoutes');
  const createMatchRoutes = require('./interfaces/http/routes/matchRoutes');
  const createChatRoutes = require('./interfaces/http/routes/chatRoutes');
  const createEventRoutes = require('./interfaces/http/routes/eventRoutes');
  const createStudyGroupRoutes = require('./interfaces/http/routes/studyGroupRoutes');

  // Verificar que las funciones estén disponibles
  console.log('🔍 Verificando rutas:');
  console.log('   - Auth routes:', typeof createAuthRoutes);
  console.log('   - User routes:', typeof createUserRoutes);
  console.log('   - Match routes:', typeof createMatchRoutes);
  console.log('   - Chat routes:', typeof createChatRoutes);
  console.log('   - Event routes:', typeof createEventRoutes);
  console.log('   - Study Group routes:', typeof createStudyGroupRoutes);

  // Configurar rutas de autenticación
  try {
    app.use('/api/v1/auth', createAuthRoutes(dependencies));
    console.log('✅ Rutas de auth configuradas');
  } catch (error) {
    console.error('❌ Error configurando rutas de auth:', error);
    throw error;
  }

  // Configurar rutas de usuarios
  try {
    app.use('/api/v1/users', createUserRoutes(dependencies));
    console.log('✅ Rutas de users configuradas');
  } catch (error) {
    console.error('❌ Error configurando rutas de users:', error);
    throw error;
  }

  // Configurar rutas de matches
  try {
    app.use('/api/v1/matches', createMatchRoutes(dependencies));
    console.log('✅ Rutas de matches configuradas');
  } catch (error) {
    console.error('❌ Error configurando rutas de matches:', error);
    throw error;
  }

  // Configurar rutas de chat
  try {
    app.use('/api/v1/chat', createChatRoutes(dependencies));
    console.log('✅ Rutas de chat configuradas');
  } catch (error) {
    console.error('❌ Error configurando rutas de chat:', error);
    throw error;
  }

  // Configurar rutas de eventos
  try {
    app.use('/api/v1/events', createEventRoutes(dependencies));
    console.log('✅ Rutas de events configuradas');
  } catch (error) {
    console.error('❌ Error configurando rutas de events:', error);
    throw error;
  }

  // Configurar rutas de grupos de estudio
  try {
    app.use('/api/v1/study-groups', createStudyGroupRoutes(dependencies));
    console.log('✅ Rutas de study-groups configuradas');
  } catch (error) {
    console.error('❌ Error configurando rutas de study-groups:', error);
    throw error;
  }

  // Documentación API actualizada
  app.get('/api/v1/docs', (req, res) => {
    res.json({
      success: true,
      message: 'MatchUP API Documentation',
      version: '1.0.0',
      baseUrl: `http://localhost:${config.PORT}/api/v1`,
      endpoints: {
        authentication: {
          'POST /auth/register': 'Registrar nuevo usuario',
          'POST /auth/login': 'Iniciar sesión',
          'GET /auth/verify-email/:token': 'Verificar email',
          'POST /auth/refresh-token': 'Renovar token',
          'POST /auth/resend-verification': 'Reenviar verificación de email'
        },
        users: {
          'GET /users/profile': 'Obtener perfil del usuario',
          'PUT /users/profile': 'Actualizar perfil',
          'POST /users/photos': 'Subir fotos',
          'DELETE /users/photos/:photoId': 'Eliminar foto',
          'GET /users/search': 'Buscar usuarios'
        },
        matches: {
          'GET /matches/potential': 'Obtener matches potenciales',
          'POST /matches': 'Crear match (like/dislike)',
          'GET /matches': 'Obtener mis matches',
          'DELETE /matches/:matchId': 'Deshacer match',
          'GET /matches/statistics': 'Estadísticas de matches'
        },
        chat: {
          'GET /chat/conversations': 'Obtener conversaciones',
          'GET /chat/:matchId/messages': 'Obtener mensajes',
          'POST /chat/:matchId/messages': 'Enviar mensaje',
          'GET /chat/:matchId/messages/poll': 'Long polling para nuevos mensajes',
          'PATCH /chat/:matchId/messages/read': 'Marcar mensajes como leídos',
          'PATCH /chat/:matchId/messages/read-all': 'Marcar todos como leídos',
          'GET /chat/unread-count': 'Conteo de mensajes no leídos',
          'POST /chat/:matchId/study-invitation': 'Enviar invitación de estudio',
          'PATCH /chat/messages/:messageId/study-response': 'Responder invitación'
        },
        events: {
          'POST /events': 'Crear evento',
          'GET /events': 'Obtener eventos',
          'GET /events/my-events': 'Mis eventos',
          'GET /events/:eventId': 'Obtener evento específico',
          'POST /events/:eventId/join': 'Unirse a evento',
          'DELETE /events/:eventId/leave': 'Salir de evento',
          'PUT /events/:eventId': 'Actualizar evento',
          'PATCH /events/:eventId/cancel': 'Cancelar evento'
        },
        studyGroups: {
          'POST /study-groups': 'Crear grupo de estudio',
          'GET /study-groups': 'Obtener grupos de estudio',
          'GET /study-groups/search': 'Buscar grupos',
          'GET /study-groups/popular-subjects': 'Materias populares',
          'GET /study-groups/my-groups': 'Mis grupos',
          'GET /study-groups/:groupId': 'Obtener grupo específico',
          'POST /study-groups/:groupId/join': 'Unirse a grupo',
          'DELETE /study-groups/:groupId/leave': 'Salir de grupo',
          'GET /study-groups/:groupId/members': 'Miembros del grupo',
          'PUT /study-groups/:groupId': 'Actualizar grupo',
          'DELETE /study-groups/:groupId': 'Eliminar grupo'
        }
      },
      features: {
        implemented: [
          '✅ Sistema de autenticación JWT',
          '✅ Matching algorítmico por compatibilidad académica',
          '✅ Chat en tiempo real con long polling',
          '✅ Gestión de eventos universitarios',
          '✅ Grupos de estudio colaborativos',
          '✅ Invitaciones de estudio',
          '✅ Sistema de notificaciones',
          '✅ Validación de emails universitarios',
          '✅ Rate limiting y seguridad',
          '✅ Subida de fotos (Cloudinary)',
          '✅ Base de datos PostgreSQL optimizada'
        ],
        upcoming: [
          '🔄 Push notifications reales',
          '🔄 WebSocket para chat en tiempo real',
          '🔄 Sistema de reportes',
          '🔄 Recomendaciones AI-powered',
          '🔄 Integración con calendario académico',
          '🔄 Gamificación y logros'
        ]
      }
    });
  });

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      error: 'Endpoint no encontrado',
      path: req.originalUrl,
      method: req.method,
      availableEndpoints: '/api/v1/docs'
    });
  });

  // Error handler global
  app.use(errorHandler);

  console.log('✅ Aplicación configurada correctamente');
  return app;
};

module.exports = createApp;