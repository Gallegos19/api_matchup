const express = require("express");
const { AuthController } = require("../controllers");
const { validateRequest, authSchemas, rateLimiters, authMiddleware } = require("../middleware");

const createAuthRoutes = (dependencies) => {
  const router = express.Router();

  // Crear instancia del controlador
  const authController = new AuthController(
    dependencies.userRepository,
    dependencies.emailService,
    dependencies.jwtService
  );

  // Rutas de autenticación
  router.post(
    "/register",
    rateLimiters.auth,
    validateRequest(authSchemas.register),
    async (req, res) => {
      try {
        await authController.register(req, res);
      } catch (error) {
        console.error("Error en ruta register:", error);
        res.status(500).json({
          success: false,
          error: "Error interno del servidor",
        });
      }
    }
  );

  router.post(
    "/login",
    rateLimiters.auth,
    validateRequest(authSchemas.login),
    async (req, res) => {
      try {
        await authController.login(req, res);
      } catch (error) {
        console.error("Error en ruta login:", error);
        res.status(500).json({
          success: false,
          error: "Error interno del servidor",
        });
      }
    }
  );

  router.get("/verify-email/:token", async (req, res) => {
    try {
      await authController.verifyEmail(req, res);
    } catch (error) {
      console.error("Error en ruta verify-email:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      });
    }
  });

  router.post("/resend-verification", authMiddleware, async (req, res) => {
    try {
      await authController.resendVerification(req, res);
    } catch (error) {
      console.error("Error en ruta resend-verification:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      });
    }
  });

  router.post("/refresh-token", async (req, res) => {
    try {
      await authController.refreshToken(req, res);
    } catch (error) {
      console.error("Error en ruta refresh-token:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      });
    }
  });

  return router;
};

module.exports = createAuthRoutes;
