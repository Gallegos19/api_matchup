const jwt = require('jsonwebtoken');
const config = require('../config/environment');

class JwtService {
  generateToken(payload, expiresIn = config.JWT_EXPIRE) {
    return jwt.sign(payload, config.JWT_SECRET, { expiresIn });
  }

  verifyToken(token) {
    return jwt.verify(token, config.JWT_SECRET);
  }

  generateVerificationToken(userId) {
    return this.generateToken({ userId, type: 'email_verification' }, '24h');
  }

  generateRefreshToken(userId) {
    return this.generateToken({ userId, type: 'refresh' }, '30d');
  }
}



module.exports = JwtService;
