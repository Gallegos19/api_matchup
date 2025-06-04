const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

// Importación corregida
const UniversityEmail = require("../../../domain/value-objects/UniversityEmail");

class AuthController {
  constructor(userRepository, emailService, jwtService) {
    this.userRepository = userRepository;
    this.emailService = emailService;
    this.jwtService = jwtService;
  }

  async register(req, res) {
    try {
      const {
        email,
        password,
        firstName,
        lastName,
        dateOfBirth,
        career,
        semester,
        campus,
        academicInterests = [],
      } = req.body;

      console.log("📝 Procesando registro:", {
        email,
        firstName,
        lastName,
        career,
      });

      // Validar email universitario
      let universityEmail;
      try {
        universityEmail = new UniversityEmail(email);
      } catch (emailError) {
        console.log("❌ Error validando email:", emailError.message);
        return res.status(400).json({
          success: false,
          error: emailError.message,
        });
      }

      // Extraer studentId ANTES de usar
      const studentId = universityEmail.extractStudentId();
      console.log("🆔 ID de estudiante extraído:", studentId);

      // Verificar si el usuario ya existe
      const existingUser = await this.userRepository.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: "Ya existe una cuenta con este email",
        });
      }

      // Verificar matrícula única
      const existingStudent =
        await this.userRepository.findByStudentId(studentId);
      if (existingStudent) {
        return res.status(400).json({
          success: false,
          error: "Ya existe un usuario con esta matrícula",
        });
      }

      // Hash de la contraseña
      const passwordHash = await bcrypt.hash(password, 12);

      // Detectar carrera desde email
      const detectedCareer = universityEmail.getCareerName();
      console.log("🎓 Carrera detectada desde email:", detectedCareer);

      // Crear datos del usuario
      const userData = {
        id: uuidv4(),
        email: universityEmail.toString(),
        passwordHash,
        firstName,
        lastName,
        dateOfBirth: new Date(dateOfBirth),
        academicProfile: {
          id: uuidv4(),
          studentId: studentId, // Ahora está definido
          career: career || detectedCareer, // Usar la carrera proporcionada o la detectada
          semester: parseInt(semester),
          campus,
          academicInterests,
        },
      };

      console.log("💾 Guardando usuario...", {
        userId: userData.id,
        studentId: userData.academicProfile.studentId,
        career: userData.academicProfile.career,
      });

      // Guardar usuario usando el repositorio
      const user = await this.userRepository.save(userData);

      // Generar token JWT
      const token = this.jwtService.generateToken({
        userId: user.id,
        email: user.email,
      });

      console.log("✅ Usuario registrado exitosamente:", user.id);

      res.status(201).json({
        success: true,
        message: "Usuario registrado exitosamente",
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            isEmailVerified: user.isEmailVerified,
            isProfileComplete: user.isProfileComplete,
            academicProfile: user.academicProfile,
          },
          token,
        },
      });
    } catch (error) {
      console.error("❌ Error en registro:", error);
      console.error("Stack trace:", error.stack);

      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;

      console.log("🔐 Procesando login:", { email });

      // Buscar usuario
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: "Credenciales inválidas",
        });
      }

      // Verificar contraseña
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: "Credenciales inválidas",
        });
      }

      // Verificar que la cuenta esté activa
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          error: "Cuenta desactivada",
        });
      }

      // Generar token
      const token = this.jwtService.generateToken({
        userId: user.id,
        email: user.email,
      });

      console.log("✅ Login exitoso:", user.id);

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            isEmailVerified: user.isEmailVerified,
            isProfileComplete: user.isProfileComplete,
            academicProfile: user.academicProfile,
          },
          token,
        },
      });
    } catch (error) {
      console.error("❌ Error en login:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      });
    }
  }

  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      res.json({
        success: true,
        message: "Refresh token no implementado aún",
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        error: "Token inválido",
      });
    }
  }

  async verifyEmail(req, res) {
    try {
      const { token } = req.params;

      console.log(
        "📧 Verificando email con token:",
        token?.substring(0, 20) + "..."
      );

      if (!token) {
        return res.status(400).json({
          success: false,
          error: "Token de verificación requerido",
        });
      }

      // Verificar y decodificar el token
      let decoded;
      try {
        decoded = this.jwtService.verifyToken(token);
      } catch (tokenError) {
        console.log("❌ Token inválido:", tokenError.message);
        return res.status(400).json({
          success: false,
          error: "Token de verificación inválido o expirado",
        });
      }

      const { userId } = decoded;

      
      // Buscar el usuario
      const user = await this.userRepository.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: "Usuario no encontrado",
        });
      }

      // Verificar si ya está verificado
      if (user.isEmailVerified) {
        return res.status(200).json({
          success: true,
          message: "El email ya estaba verificado",
          data: {
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              isEmailVerified: true,
            },
          },
        });
      }

      // Actualizar usuario como verificado
      const updatedUser = await this.userRepository.update(userId, {
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
        updatedAt: new Date(),
      });
      console.error(updatedUser)
      console.log("✅ Email verificado exitosamente para usuario:", userId);

      // Generar nuevo token JWT (opcional)
      const newToken = this.jwtService.generateToken({
        userId: user.id,
        email: user.email,
      });

      res.json({
        success: true,
        message: "¡Email verificado exitosamente! 🎉",
        data: {
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            isEmailVerified: true,
            emailVerifiedAt: updatedUser.emailVerifiedAt,
          },
          token: newToken, // Para actualizar el token en el frontend
        },
      });
    } catch (error) {
      console.error("❌ Error verificando email:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      });
    }
  }

  async resendVerification(req, res) {
    try {
      const userId = req.user.userId; // Desde authMiddleware

      const user = await this.userRepository.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: "Usuario no encontrado",
        });
      }

      if (user.isEmailVerified) {
        return res.status(400).json({
          success: false,
          error: "El email ya está verificado",
        });
      }

      // Enviar nuevo email de verificación
      await this.emailService.sendVerificationEmail(user.email, user.id);

      res.json({
        success: true,
        message: "Email de verificación reenviado exitosamente",
      });
    } catch (error) {
      console.error("❌ Error reenviando verificación:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      });
    }
  }
}

module.exports = AuthController;
