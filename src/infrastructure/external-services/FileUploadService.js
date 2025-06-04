const cloudinary = require('cloudinary').v2;
const config = require('../config/environment');
const { v4: uuidv4 } = require('uuid');

cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET
});

class FileUploadService {
  async uploadPhoto(file, userId) {
    try {
      const photoId = uuidv4();
      
      const result = await cloudinary.uploader.upload(file.path || file.buffer, {
        folder: `matchup/users/${userId}`,
        public_id: photoId,
        transformation: [
          { width: 800, height: 800, crop: "fill", quality: "auto" },
          { fetch_format: "auto" }
        ]
      });

      return {
        id: photoId,
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        isMain: false,
        uploadedAt: new Date()
      };

    } catch (error) {
      console.error('Error subiendo foto a Cloudinary:', error);
      throw new Error('Error subiendo archivo');
    }
  }

  async deletePhoto(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    } catch (error) {
      console.error('Error eliminando foto de Cloudinary:', error);
      return false;
    }
  }

  async uploadMultiplePhotos(files, userId) {
    const uploadPromises = files.map(file => this.uploadPhoto(file, userId));
    return await Promise.all(uploadPromises);
  }
}

module.exports = FileUploadService;
