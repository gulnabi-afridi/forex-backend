import cloudinary from "../utils/cloudinary.js";
import streamifier from "streamifier";
import crypto from "crypto";

class CloudinaryService {
  constructor() {
    this.baseFolder = "trade-stats/bots";
  }

  /**
   * Generate folder path for bot files using bot ID
   * @param {string} botId - ID of the bot
   * @param {string} version - Version of the bot
   * @param {boolean} isPreset - Whether file is a preset
   * @returns {string} - Cloudinary folder path
   */
  generateFolderPath(botId, version, isPreset = false) {
    const basePath = `${this.baseFolder}/${botId}/${version}`;
    return isPreset ? `${basePath}/presets` : basePath;
  }

  /**
   * Generate folder path for specific preset
   * @param {string} botId - ID of the bot
   * @param {string} version - Version of the bot
   * @param {string} presetId - ID of the preset
   * @returns {string} - Cloudinary folder path for preset
   */
  generatePresetFolderPath(botId, version, presetId) {
    return `${this.baseFolder}/${botId}/${version}/presets/${presetId}`;
  }

  /**
   * Check if a file with the same name already exists in the folder
   * @param {string} folderPath - Cloudinary folder path
   * @param {string} filename - Name of the file to check
   * @returns {Promise<Object|null>} - Existing file or null
   */
  async checkDuplicate(folderPath, filename) {
    try {
      const publicId = `${folderPath}/${filename.split(".")[0]}`;

      // Try to get the resource
      const result = await cloudinary.api.resource(publicId, {
        resource_type: "raw",
      });

      if (result) {
        return {
          public_id: result.public_id,
          url: result.secure_url,
          created_at: result.created_at,
        };
      }

      return null;
    } catch (error) {
      // If error is "Not Found", then no duplicate exists
      if (error.error && error.error.http_code === 404) {
        return null;
      }
      // For other errors, log and return null
      console.error("Check duplicate error:", error);
      return null;
    }
  }

  /**
   * Calculate file hash for duplicate detection
   * @param {Buffer} fileBuffer - File buffer
   * @returns {string} - File hash
   */
  calculateFileHash(fileBuffer) {
    return crypto.createHash("md5").update(fileBuffer).digest("hex");
  }

  /**
   * Delete file from Cloudinary by public_id
   * @param {string} publicId - Cloudinary public_id of the file
   * @param {string} resourceType - Resource type (default: 'raw')
   * @returns {Promise<Object>} - Delete result
   */
  async deleteFile(publicId, resourceType = "raw") {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });

      if (result.result === "ok" || result.result === "not found") {
        return {
          success: true,
          message: "File deleted successfully",
          data: result,
        };
      } else {
        return {
          success: false,
          message: "Failed to delete file",
          data: result,
        };
      }
    } catch (error) {
      throw new Error(`Delete file failed: ${error.message}`);
    }
  }

  /**
   * Upload preset file with organized folder structure
   * @param {Object} file - File object
   * @param {string} botId - ID of the bot
   * @param {string} version - Version of the bot
   * @param {string} presetId - ID of the preset
   * @returns {Promise<Object>} - Upload result
   */
  async uploadPresetFile(file, botId, version, presetId) {
    try {
      const folderPath = this.generatePresetFolderPath(
        botId,
        version,
        presetId
      );
      const fileBuffer = file.buffer || file;
      const filename = file.originalname || file.name || "preset_file";

      // Upload to Cloudinary
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: folderPath,
            resource_type: "raw",
            public_id: filename.split(".")[0],
            use_filename: true,
            unique_filename: false,
            overwrite: false,
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve({
                success: true,
                message: "Preset file uploaded successfully",
                data: {
                  public_id: result.public_id,
                  url: result.secure_url,
                  format: result.format,
                  resource_type: result.resource_type,
                  created_at: result.created_at,
                  bytes: result.bytes,
                  folder: folderPath,
                },
              });
            }
          }
        );

        streamifier.createReadStream(fileBuffer).pipe(uploadStream);
      });
    } catch (error) {
      throw new Error(`Preset upload failed: ${error.message}`);
    }
  }

  /**
   * Delete specific preset folder and files
   * @param {string} botId - ID of the bot
   * @param {string} version - Version of the bot
   * @param {string} presetId - ID of the preset
   * @returns {Promise<Object>} - Delete result
   */
  async deletePreset(botId, version, presetId) {
    try {
      const folderPath = this.generatePresetFolderPath(
        botId,
        version,
        presetId
      );
      const result = await cloudinary.api.delete_resources_by_prefix(
        folderPath,
        {
          resource_type: "raw",
        }
      );

      // Delete empty folders
      try {
        await cloudinary.api.delete_folder(folderPath);
      } catch (e) {
        // Ignore folder deletion errors (might already be deleted)
      }

      return {
        success: true,
        message: "Preset files deleted successfully",
        data: result,
      };
    } catch (error) {
      throw new Error(`Delete preset failed: ${error.message}`);
    }
  }

  /**
   * Upload file to Cloudinary (for bot files and images)
   * @param {Object} file - File object (from multer or buffer)
   * @param {string} botId - ID of the bot
   * @param {string} version - Version of the bot
   * @param {boolean} isPreset - Whether file is a preset (legacy parameter)
   * @param {boolean} checkDup - Whether to check for duplicates
   * @returns {Promise<Object>} - Upload result
   */
  async uploadFile(file, botId, version, isPreset = false, checkDup = true) {
    try {
      const folderPath = this.generateFolderPath(botId, version, isPreset);
      const fileBuffer = file.buffer || file;
      const filename = file.originalname || file.name || "unnamed_file";

      // Check for duplicate by filename
      if (checkDup) {
        const duplicate = await this.checkDuplicate(folderPath, filename);
        if (duplicate) {
          return {
            success: false,
            message: "File with same name already exists",
            duplicate: true,
            existingFile: duplicate,
          };
        }
      }

      // Upload to Cloudinary
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: folderPath,
            resource_type: "raw",
            public_id: filename.split(".")[0],
            use_filename: true,
            unique_filename: false,
            overwrite: false,
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve({
                success: true,
                message: "File uploaded successfully",
                data: {
                  public_id: result.public_id,
                  url: result.secure_url,
                  format: result.format,
                  resource_type: result.resource_type,
                  created_at: result.created_at,
                  bytes: result.bytes,
                  folder: folderPath,
                },
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
}

export default new CloudinaryService();
