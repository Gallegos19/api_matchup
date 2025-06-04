const express = require('express');
const multer = require('multer');
const { UserController } = require('../controllers');
const { validateRequest, userSchemas } = require('../middleware/validationMiddleware');
const authMiddleware = require('../middleware/authMiddleware');

const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 4 // Máximo 4 archivos por request
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes'));
    }
  }
});

const createUserRoutes = (dependencies) => {
  const router = express.Router();
  const userController = new UserController(
    dependencies.userRepository,
    dependencies.fileUploadService
  );

  // Todas las rutas requieren autenticación
  router.use(authMiddleware);

  router.get('/profile',
    (req, res) => userController.getProfile(req, res)
  );

  router.put('/profile',
    validateRequest(userSchemas.updateProfile),
    (req, res) => userController.updateProfile(req, res)
  );

  router.post('/photos',
    upload.array('photos', 4),
    (req, res) => userController.uploadPhotos(req, res)
  );

  router.delete('/photos/:photoId',
    (req, res) => userController.deletePhoto(req, res)
  );

  router.get('/search',
    (req, res) => userController.searchUsers(req, res)
  );

  return router;
};
module.exports = createUserRoutes;