const nodemailer = require('nodemailer');
const config = require('../config/environment');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.EMAIL_HOST,
      port: config.EMAIL_PORT,
      secure: false,
      auth: {
        user: config.EMAIL_USER,
        pass: config.EMAIL_PASSWORD
      }
    });
  }

  async sendVerificationEmail(email, userId) {
    try {
      const JwtService = require('../security/JwtService');
      const jwtService = new JwtService();
      const verificationToken = jwtService.generateVerificationToken(userId);
      
      const verificationUrl = `${config.FRONTEND_URL || 'http://localhost:3000'}/verify-email/${verificationToken}`;
      
      const mailOptions = {
        from: config.EMAIL_USER,
        to: email,
        subject: '🎓 Verifica tu cuenta de MatchUP',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #6366f1;">¡Bienvenido a MatchUP! 🎓</h2>
            <p>Gracias por registrarte en MatchUP, la app para estudiantes universitarios.</p>
            <p>Para completar tu registro, por favor verifica tu email haciendo clic en el siguiente enlace:</p>
            <a href="${verificationUrl}" 
               style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
              Verificar Email
            </a>
            <p style="color: #666; font-size: 14px;">
              Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:<br>
              ${verificationUrl}
            </p>
            <p style="color: #666; font-size: 14px;">
              Este enlace expira en 24 horas.
            </p>
          </div>
        `
      };
      
      await this.transporter.sendMail(mailOptions);
      console.log(`📧 Email de verificación enviado a: ${email}`);
      
    } catch (error) {
      console.error('Error enviando email de verificación:', error);
      // No lanzar error para no interrumpir el registro
    }
  }

  async sendPasswordResetEmail(email, resetToken) {
    try {
      const resetUrl = `${config.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
      
      const mailOptions = {
        from: config.EMAIL_USER,
        to: email,
        subject: '🔐 Restablecer contraseña - MatchUP',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #6366f1;">Restablecer Contraseña</h2>
            <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta de MatchUP.</p>
            <p>Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
            <a href="${resetUrl}" 
               style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
              Restablecer Contraseña
            </a>
            <p style="color: #666; font-size: 14px;">
              Si no solicitaste este cambio, puedes ignorar este email.
            </p>
            <p style="color: #666; font-size: 14px;">
              Este enlace expira en 1 hora.
            </p>
          </div>
        `
      };
      
      await this.transporter.sendMail(mailOptions);
      console.log(`📧 Email de restablecimiento enviado a: ${email}`);
      
    } catch (error) {
      console.error('Error enviando email de restablecimiento:', error);
      throw error;
    }
  }
}

module.exports = EmailService;
