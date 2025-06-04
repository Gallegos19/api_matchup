const { Pool } = require('pg');
require('dotenv').config();

class Database {
  constructor() {
    // Configuración específica para AWS RDS
    const config = {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false // AWS RDS requiere SSL
      },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000, // Más tiempo para AWS
    };

    console.log('🔌 Configurando conexión a AWS RDS...');
    console.log('🌐 Host:', process.env.DB_HOST);
    console.log('🗄️ Base de datos:', process.env.DB_NAME);

    this.pool = new Pool(config);

    this.pool.on('error', (err) => {
      console.error('❌ Error inesperado en cliente de PostgreSQL', err);
    });

    this.pool.on('connect', () => {
      console.log('✅ Nueva conexión establecida con AWS RDS');
    });
  }

  async query(text, params) {
    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log('✅ Consulta ejecutada', { duration: `${duration}ms`, rows: res.rowCount });
      return res;
    } catch (error) {
      console.error('❌ Error en consulta de base de datos', { 
        text: text.substring(0, 100) + '...', 
        error: error.message 
      });
      throw error;
    }
  }

  async getClient() {
    return await this.pool.connect();
  }

  async close() {
    await this.pool.end();
    console.log('🔌 Conexión a AWS RDS cerrada');
  }

  async withTransaction(callback) {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = new Database();