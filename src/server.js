const createApp = require('./app');
const config = require('./infrastructure/config/environment');

const startServer = async () => {
  try {
    console.log('🚀 Iniciando MatchUP API...');
    console.log('📋 Configuración:');
    console.log(`   - Entorno: ${config.NODE_ENV}`);
    console.log(`   - Puerto: ${config.PORT}`);
    console.log(`   - Base de datos: ${config.DB_HOST ? 'Configurada' : 'No configurada'}`);
    
    const app = await createApp();
    
    const server = app.listen(config.PORT, () => {
      console.log('');
      console.log('🎉 ¡MatchUP API está ejecutándose!');
      console.log(`🌐 Servidor: http://localhost:${config.PORT}`);
      console.log(`❤️ Health: http://localhost:${config.PORT}/health`);
      console.log(`📚 Docs: http://localhost:${config.PORT}/api/v1/docs`);
      console.log('');
      console.log('📱 Endpoints disponibles:');
      console.log('   - POST /api/v1/auth/register');
      console.log('   - POST /api/v1/auth/login');
      console.log('   - GET  /api/v1/users/profile');
      console.log('   - GET  /api/v1/matches/potential');
      console.log('   - GET  /api/v1/chat/conversations');
      console.log('');
      console.log('✨ ¡Listo para recibir peticiones!');
    });

    // Manejo de errores del servidor
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Puerto ${config.PORT} ya está en uso`);
        console.log('💡 Soluciones:');
        console.log('   - Cambiar PORT en .env');
        console.log('   - Cerrar otra aplicación que use el puerto');
        console.log(`   - Ejecutar: lsof -ti:${config.PORT} | xargs kill -9`);
      } else {
        console.error('❌ Error del servidor:', error);
      }
      process.exit(1);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      console.log(`\n🛑 Señal ${signal} recibida. Cerrando servidor...`);
      
      server.close(async () => {
        console.log('📪 Servidor HTTP cerrado');
        
        try {
          // Cerrar conexiones de base de datos
          const Database = require('./infrastructure/persistence/database');
          await Database.close();
          console.log('🗃️ Conexiones de base de datos cerradas');
          
          console.log('✅ Servidor cerrado correctamente');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error durante el cierre:', error);
          process.exit(1);
        }
      });

      // Forzar cierre después de 10 segundos
      setTimeout(() => {
        console.error('⏰ Tiempo de cierre agotado, forzando cierre...');
        process.exit(1);
      }, 10000);
    };

    // Escuchar señales de cierre
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Manejar errores no capturados
    process.on('uncaughtException', (error) => {
      console.error('💥 Excepción no capturada:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Promise rechazada no manejada:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });

  } catch (error) {
    console.error('❌ Error iniciando servidor:', error);
    process.exit(1);
  }
};

// Solo iniciar si este archivo se ejecuta directamente
if (require.main === module) {
  startServer();
}

module.exports = { startServer };