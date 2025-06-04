const express = require("express");
const { MatchController } = require("../controllers");
const { authMiddleware } = require("../middleware");

const createMatchRoutes = (dependencies) => {
  const router = express.Router();
  const matchController = new MatchController(
    dependencies.matchRepository,
    dependencies.userRepository
  );

  // ✅ AGREGADO: authMiddleware para todas las rutas de matches
  router.get("/potential", authMiddleware, async (req, res) => {
    try {
      await matchController.getPotentialMatches(req, res);
    } catch (error) {
      console.error("Error en ruta potential matches:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      });
    }
  });

  // ✅ Crear match
  router.post("/", authMiddleware, async (req, res) => {
    try {
      await matchController.createMatch(req, res);
    } catch (error) {
      console.error("Error creando match:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      });
    }
  });

  // ✅ Obtener mis matches
  router.get("/", authMiddleware, async (req, res) => {
    try {
      await matchController.getMatches(req, res);
    } catch (error) {
      console.error("Error obteniendo matches:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      });
    }
  });

  // ✅ Deshacer match
  router.delete("/:matchId", authMiddleware, async (req, res) => {
    try {
      await matchController.unmatch(req, res);
    } catch (error) {
      console.error("Error deshaciendo match:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      });
    }
  });

  // ✅ Estadísticas de matches
  router.get("/statistics", authMiddleware, async (req, res) => {
    try {
      await matchController.getMatchStatistics(req, res);
    } catch (error) {
      console.error("Error obteniendo estadísticas:", error);
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
      });
    }
  });

  return router;
};

module.exports = createMatchRoutes;