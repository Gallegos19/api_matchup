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
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
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

  // Verificar que las funciones estén disponibles
  console.log('🔍 Verificando rutas:');
  console.log('   - Auth routes:', typeof createAuthRoutes);
  console.log('   - User routes:', typeof createUserRoutes);
  console.log('   - Match routes:', typeof createMatchRoutes);
  console.log('   - Chat routes:', typeof createChatRoutes);

  // Configurar rutas
  try {
    app.use('/api/v1/auth', createAuthRoutes(dependencies));
    console.log('✅ Rutas de auth configuradas');
  } catch (error) {
    console.error('❌ Error configurando rutas de auth:', error);
    throw error;
  }

  try {
    app.use('/api/v1/users', createUserRoutes(dependencies));
    console.log('✅ Rutas de users configuradas');
  } catch (error) {
    console.error('❌ Error configurando rutas de users:', error);
    throw error;
  }

  try {
    app.use('/api/v1/matches', createMatchRoutes(dependencies));
    console.log('✅ Rutas de matches configuradas');
  } catch (error) {
    console.error('❌ Error configurando rutas de matches:', error);
    throw error;
  }

  try {
    app.use('/api/v1/chat', createChatRoutes(dependencies));
    console.log('✅ Rutas de chat configuradas');
  } catch (error) {
    console.error('❌ Error configurando rutas de chat:', error);
    throw error;
  }

  // Documentación básica
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
          'POST /auth/refresh-token': 'Renovar token'
        },
        users: {
          'GET /users/profile': 'Obtener perfil del usuario (próximamente)'
        },
        matches: {
          'GET /matches/potential': 'Obtener matches potenciales (próximamente)'
        },
        chat: {
          'GET /chat/conversations': 'Obtener conversaciones (próximamente)'
        }
      }
    });
  });

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      error: 'Endpoint no encontrado',
      path: req.originalUrl,
      method: req.method
    });
  });

  // Error handler global
  app.use(errorHandler);

  console.log('✅ Aplicación configurada correctamente');
  return app;
};

module.exports = createApp;