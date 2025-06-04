const Database = require('./database');
const fs = require('fs').promises;
const path = require('path');

const runMigrations = async () => {
  try {
    console.log('🔄 Ejecutando migraciones de MatchUP...');
    
    // Verificar conexión a la base de datos
    const testQuery = await Database.query('SELECT NOW()');
    console.log('✅ Conexión a la base de datos exitosa');
    
    // Crear tabla de control de migraciones
    await createMigrationsTable();
    
    const migrationsDir = path.join(__dirname, 'migrations');
    
    // Verificar si existe el directorio de migraciones
    try {
      await fs.access(migrationsDir);
    } catch (error) {
      console.log('📁 Creando directorio de migraciones...');
      await fs.mkdir(migrationsDir, { recursive: true });
      await createBasicMigrations(migrationsDir);
      return;
    }
    
    const files = await fs.readdir(migrationsDir);
    const sqlFiles = files.filter(file => file.endsWith('.sql')).sort();
    
    if (sqlFiles.length === 0) {
      console.log('⚠️ No se encontraron archivos de migración. Creando migraciones básicas...');
      await createBasicMigrations(migrationsDir);
      return;
    }
    
    // Obtener migraciones ya ejecutadas
    const executedMigrations = await getExecutedMigrations();
    
    for (const file of sqlFiles) {
      if (executedMigrations.includes(file)) {
        console.log(`⏭️ Migración ya ejecutada: ${file}`);
        continue;
      }
      
      console.log(`📄 Ejecutando migración: ${file}`);
      
      try {
        const sqlContent = await fs.readFile(path.join(migrationsDir, file), 'utf8');
        await Database.query(sqlContent);
        
        // Registrar migración como ejecutada
        await recordMigration(file);
        console.log(`✅ Migración completada: ${file}`);
        
      } catch (error) {
        console.error(`❌ Error en migración ${file}:`, error.message);
        
        // Si es un error de "ya existe", marcarlo como ejecutado
        if (error.code === '42P07' || error.message.includes('already exists')) {
          console.log(`⚠️ Tabla ya existe, marcando como ejecutada: ${file}`);
          await recordMigration(file);
          continue;
        }
        
        throw error;
      }
    }
    
    console.log('🎉 Todas las migraciones completadas exitosamente');
    
    // Cerrar conexión
    await Database.close();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error ejecutando migraciones:', error);
    await Database.close();
    process.exit(1);
  }
};

const createMigrationsTable = async () => {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  try {
    await Database.query(createTableSQL);
    console.log('📋 Tabla de control de migraciones verificada');
  } catch (error) {
    console.error('❌ Error creando tabla de migraciones:', error);
    throw error;
  }
};

const getExecutedMigrations = async () => {
  try {
    const result = await Database.query('SELECT version FROM schema_migrations ORDER BY version');
    return result.rows.map(row => row.version);
  } catch (error) {
    console.error('❌ Error obteniendo migraciones ejecutadas:', error);
    return [];
  }
};

const recordMigration = async (filename) => {
  try {
    await Database.query(
      'INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT (version) DO NOTHING',
      [filename]
    );
  } catch (error) {
    console.error('❌ Error registrando migración:', error);
  }
};

const createBasicMigrations = async (migrationsDir) => {
  const migrations = [
    {
      filename: '001_create_users_table.sql',
      content: `
-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Tabla de usuarios principales
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    bio TEXT DEFAULT '',
    interests TEXT[] DEFAULT '{}',
    photos JSONB DEFAULT '[]',
    is_email_verified BOOLEAN DEFAULT FALSE,
    is_profile_complete BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de perfiles académicos
CREATE TABLE IF NOT EXISTS academic_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id VARCHAR(50) UNIQUE NOT NULL,
    career VARCHAR(100) NOT NULL,
    semester INTEGER NOT NULL CHECK (semester >= 1 AND semester <= 12),
    campus VARCHAR(50) NOT NULL,
    university VARCHAR(200) DEFAULT 'Universidad Autónoma de Chiapas',
    academic_interests TEXT[] DEFAULT '{}',
    study_schedule JSONB DEFAULT '{}',
    gpa DECIMAL(3,2) CHECK (gpa >= 0 AND gpa <= 4.0),
    graduation_year INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_academic_profiles_user_id ON academic_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_academic_profiles_student_id ON academic_profiles(student_id);
`
    },
    {
      filename: '002_create_matches_table.sql',
      content: `
-- Tabla de matches/conexiones
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id1 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_id2 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'unmatched', 'blocked')),
    matched_at TIMESTAMP WITH TIME ZONE,
    compatibility INTEGER DEFAULT 0 CHECK (compatibility >= 0 AND compatibility <= 100),
    user1_action VARCHAR(20) CHECK (user1_action IN ('like', 'dislike', 'super_like')),
    user2_action VARCHAR(20) CHECK (user2_action IN ('like', 'dislike', 'super_like')),
    last_interaction TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_match_pair UNIQUE (user_id1, user_id2),
    CONSTRAINT no_self_match CHECK (user_id1 != user_id2)
);

-- Índices para matches
CREATE INDEX IF NOT EXISTS idx_matches_user_id1 ON matches(user_id1);
CREATE INDEX IF NOT EXISTS idx_matches_user_id2 ON matches(user_id2);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
`
    },
    {
      filename: '003_create_messages_table.sql',
      content: `
-- Tabla de mensajes
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'emoji', 'study_invitation')),
    metadata JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    is_delivered BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mensajes
CREATE INDEX IF NOT EXISTS idx_messages_match_id ON messages(match_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
`
    },
    {
      filename: '004_create_triggers.sql',
      content: `
-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_academic_profiles_updated_at ON academic_profiles;
CREATE TRIGGER update_academic_profiles_updated_at 
    BEFORE UPDATE ON academic_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_matches_updated_at ON matches;
CREATE TRIGGER update_matches_updated_at 
    BEFORE UPDATE ON matches 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
CREATE TRIGGER update_messages_updated_at 
    BEFORE UPDATE ON messages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`
    }
  ];

  for (const migration of migrations) {
    const filePath = path.join(migrationsDir, migration.filename);
    
    try {
      await fs.access(filePath);
      console.log(`📄 Migración ya existe: ${migration.filename}`);
    } catch {
      await fs.writeFile(filePath, migration.content);
      console.log(`📄 Creada migración: ${migration.filename}`);
    }
    
    // Ejecutar la migración
    console.log(`🔄 Ejecutando: ${migration.filename}`);
    try {
      await Database.query(migration.content);
      await recordMigration(migration.filename);
      console.log(`✅ Completada: ${migration.filename}`);
    } catch (error) {
      if (error.code === '42P07' || error.message.includes('already exists')) {
        console.log(`⚠️ Ya existe, marcando como ejecutada: ${migration.filename}`);
        await recordMigration(migration.filename);
      } else {
        throw error;
      }
    }
  }
};

if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };