const readmeContent = `
# MatchUP Backend

Backend API para MatchUP - App de citas y amistad universitaria con arquitectura hexagonal.

## 🚀 Inicio Rápido

### Prerrequisitos
- Node.js 18+
- Docker y Docker Compose
- PostgreSQL (o usar Docker)

### Instalación

1. **Clonar e instalar dependencias:**
\`\`\`bash
git clone <repo>
cd matchup-backend
npm install
\`\`\`

2. **Configurar variables de entorno:**
\`\`\`bash
cp .env.example .env
# Editar .env con tus credenciales
\`\`\`

3. **Levantar base de datos:**
\`\`\`bash
docker-compose up -d postgres
\`\`\`

4. **Ejecutar migraciones:**
\`\`\`bash
npm run migrate
\`\`\`

5. **Iniciar servidor:**
\`\`\`bash
npm run dev
\`\`\`

## 📚 API Endpoints

### Autenticación
- \`POST /api/v1/auth/register\` - Registrar usuario
- \`POST /api/v1/auth/login\` - Iniciar sesión
- \`GET /api/v1/auth/verify-email/:token\` - Verificar email

### Usuarios
- \`GET /api/v1/users/profile\` - Obtener perfil
- \`PUT /api/v1/users/profile\` - Actualizar perfil
- \`POST /api/v1/users/photos\` - Subir fotos
- \`GET /api/v1/users/search\` - Buscar usuarios

### Matches
- \`GET /api/v1/matches/potential\` - Obtener matches potenciales
- \`POST /api/v1/matches\` - Crear match (like/dislike)
- \`GET /api/v1/matches\` - Obtener mis matches

### Chat
- \`GET /api/v1/chat/conversations\` - Obtener conversaciones
- \`GET /api/v1/chat/:matchId/messages\` - Obtener mensajes
- \`POST /api/v1/chat/:matchId/messages\` - Enviar mensaje

## 🏗️ Arquitectura

Arquitectura hexagonal con:
- **Dominio**: Entidades, value objects, servicios
- **Aplicación**: Casos de uso
- **Infraestructura**: Repositorios, servicios externos
- **Interfaces**: Controladores HTTP, rutas

## 🔧 Desarrollo

\`\`\`bash
npm run dev      # Desarrollo con nodemon
npm run migrate  # Ejecutar migraciones
npm test         # Ejecutar tests
\`\`\`

## 📋 Variables de Entorno

Ver \`.env.example\` para todas las variables requeridas.

**Mínimas requeridas:**
- \`DATABASE_URL\`
- \`JWT_SECRET\`
- \`EMAIL_USER\` y \`EMAIL_PASSWORD\` (para verificación)

## 🚀 Producción

1. Configurar variables de entorno de producción
2. Usar PostgreSQL gestionado (AWS RDS, etc.)
3. Configurar servicio de email (SendGrid, etc.)
4. Configurar almacenamiento de archivos (Cloudinary, S3)

## 🤝 Contribuir

1. Fork del proyecto
2. Crear rama feature
3. Commit cambios
4. Push a la rama
5. Crear Pull Request
`;