const Database = require('../src/infrastructure/persistence/database');
const fs = require('fs').promises;
const path = require('path');

const runMigrations = async () => {
  try {
    console.log('🔄 Ejecutando migraciones...');
    
    const migrationsDir = path.join(__dirname, '../src/infrastructure/persistence/migrations');
    const files = await fs.readdir(migrationsDir);
    const sqlFiles = files.filter(file => file.endsWith('.sql')).sort();
    
    for (const file of sqlFiles) {
      console.log(`📄 Ejecutando migración: ${file}`);
      const sqlContent = await fs.readFile(path.join(migrationsDir, file), 'utf8');
      await Database.query(sqlContent);
      console.log(`✅ Migración completada: ${file}`);
    }
    
    console.log('🎉 Todas las migraciones completadas exitosamente');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error ejecutando migraciones:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };

console.log('🏗️ Backend de MatchUP completado con arquitectura hexagonal');
console.log('📋 Estructura implementada:');
console.log('   ✅ Entidades de dominio');
console.log('   ✅ Casos de uso');
console.log('   ✅ Repositorios PostgreSQL');
console.log('   ✅ Controladores HTTP');
console.log('   ✅ Rutas y middlewares');
console.log('   ✅ Sistema de autenticación JWT');
console.log('   ✅ Validaciones con Joi');
console.log('   ✅ Rate limiting');
console.log('   ✅ Manejo de errores');
console.log('   ✅ Long polling para chat');
console.log('   ✅ Subida de archivos');
console.log('   ✅ Algoritmo de matching');
console.log('');
console.log('🚀 Para iniciar el proyecto:');
console.log('   1. npm install');
console.log('   2. Configurar .env con tus variables');
console.log('   3. docker-compose up -d (para PostgreSQL)');
console.log('   4. npm run migrate (ejecutar migraciones)');
console.log('   5. npm run dev (desarrollo) o npm start (producción)');