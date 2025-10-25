import cloudinary from '../utils/cloudinary.js';
import streamifier from 'streamifier';
import crypto from 'crypto';

class CloudinaryService {
  constructor() {
    this.baseFolder = 'trade-stats/bots';
  }

  /**
   * Generate folder path for bot files
   * @param {string} botName - Name of the bot
   * @param {string} version - Version of the bot
   * @param {boolean} isPreset - Whether file is a preset
   * @returns {string} - Cloudinary folder path
   */
  generateFolderPath(botName, version, isPreset = false) {
    const basePath = `${this.baseFolder}/${botName}/${version}`;
    return isPreset ? `${basePath}/presets` : basePath;
  }

  /**
   * Calculate file hash for duplicate detection
   * @param {Buffer} fileBuffer - File buffer
   * @returns {string} - MD5 hash of file
   */
  calculateFileHash(fileBuffer) {
    return crypto.createHash('md5').update(fileBuffer).digest('hex');
  }

  /**
   * Check if file already exists in folder
   * @param {string} folderPath - Cloudinary folder path
   * @param {string} filename - Name of the file
   * @returns {Promise<Object|null>} - Existing file info or null
   */
  async checkDuplicate(folderPath, filename) {
    try {
      const publicId = `${folderPath}/${filename.split('.')[0]}`;
      const result = await cloudinary.api.resource(publicId, { resource_type: 'raw' });
      return result;
    } catch (error) {
      if (error.error && error.error.http_code === 404) {
        return null; // File doesn't exist
      }
      throw error;
    }
  }

  /**
   * Check duplicate by content hash
   * @param {string} folderPath - Cloudinary folder path
   * @param {Buffer} fileBuffer - File buffer
   * @returns {Promise<Object|null>} - Duplicate file info or null
   */
  async checkDuplicateByHash(folderPath, fileBuffer) {
    try {
      const fileHash = this.calculateFileHash(fileBuffer);
      const resources = await cloudinary.api.resources({
        type: 'upload',
        resource_type: 'raw',
        prefix: folderPath,
        max_results: 500
      });

      for (const resource of resources.resources) {
        const existingFile = await cloudinary.api.resource(resource.public_id, {
          resource_type: 'raw'
        });
        
        // Compare etag or checksum if available
        if (existingFile.etag && existingFile.etag === fileHash) {
          return existingFile;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error checking duplicate by hash:', error);
      return null;
    }
  }

  /**
   * Upload file to Cloudinary
   * @param {Object} file - File object (from multer or buffer)
   * @param {string} botName - Name of the bot
   * @param {string} version - Version of the bot
   * @param {boolean} isPreset - Whether file is a preset
   * @param {boolean} checkDup - Whether to check for duplicates
   * @returns {Promise<Object>} - Upload result
   */
  async uploadFile(file, botName, version, isPreset = false, checkDup = true) {
    try {
      const folderPath = this.generateFolderPath(botName, version, isPreset);
      const fileBuffer = file.buffer || file;
      const filename = file.originalname || file.name || 'unnamed_file';

      // Check for duplicate by filename
      if (checkDup) {
        const duplicate = await this.checkDuplicate(folderPath, filename);
        if (duplicate) {
          return {
            success: false,
            message: 'File with same name already exists',
            duplicate: true,
            existingFile: duplicate
          };
        }
      }

      // Upload to Cloudinary
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: folderPath,
            resource_type: 'raw',
            public_id: filename.split('.')[0],
            use_filename: true,
            unique_filename: false,
            overwrite: false
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve({
                success: true,
                message: 'File uploaded successfully',
                data: {
                  public_id: result.public_id,
                  url: result.secure_url,
                  format: result.format,
                  resource_type: result.resource_type,
                  created_at: result.created_at,
                  bytes: result.bytes,
                  folder: folderPath
                }
              });
            }
          }
        );

        streamifier.createReadStream(fileBuffer).pipe(uploadStream);
      });
    } catch (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  /**
   * Delete file from Cloudinary
   * @param {string} publicId - Cloudinary public_id
   * @returns {Promise<Object>} - Delete result
   */
  async deleteFile(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: 'raw'
      });

      return {
        success: result.result === 'ok',
        message: result.result === 'ok' ? 'File deleted successfully' : 'File not found',
        data: result
      };
    } catch (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  /**
   * Delete entire bot folder (including all versions)
   * @param {string} botName - Name of the bot
   * @returns {Promise<Object>} - Delete result
   */
  async deleteBot(botName) {
    try {
      const folderPath = `${this.baseFolder}/${botName}`;
      const result = await cloudinary.api.delete_resources_by_prefix(folderPath, {
        resource_type: 'raw'
      });

      // Delete empty folders
      await cloudinary.api.delete_folder(folderPath);

      return {
        success: true,
        message: 'Bot and all its versions deleted successfully',
        data: result
      };
    } catch (error) {
      throw new Error(`Delete bot failed: ${error.message}`);
    }
  }

  /**
   * Delete specific bot version
   * @param {string} botName - Name of the bot
   * @param {string} version - Version of the bot
   * @returns {Promise<Object>} - Delete result
   */
  async deleteBotVersion(botName, version) {
    try {
      const folderPath = this.generateFolderPath(botName, version);
      const result = await cloudinary.api.delete_resources_by_prefix(folderPath, {
        resource_type: 'raw'
      });

      // Delete empty folders
      try {
        await cloudinary.api.delete_folder(`${folderPath}/presets`);
        await cloudinary.api.delete_folder(folderPath);
      } catch (e) {
        // Ignore folder deletion errors
      }

      return {
        success: true,
        message: 'Bot version deleted successfully',
        data: result
      };
    } catch (error) {
      throw new Error(`Delete bot version failed: ${error.message}`);
    }
  }


}

export default new CloudinaryService();