import multer from "multer";
import path from "path";

const extensionToMime = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".json": "application/json",
  ".txt": "text/plain",
};

export const singleFileUpload = (fieldName = "botFile") => {
  const storage = multer.memoryStorage();

  const allowedTypes = Object.values(extensionToMime);
  const allowedExtensions = Object.keys(extensionToMime);

  const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    let mimeType = file.mimetype;

    console.log("Incoming file:", file.originalname, "->", file.mimetype);

    if (extensionToMime[ext]) {
      mimeType = extensionToMime[ext];
      file.mimetype = mimeType;
    }

    if (allowedTypes.includes(mimeType) && allowedExtensions.includes(ext)) {
      console.log(`File accepted: ${file.originalname} (${mimeType})`);
      cb(null, true);
    } else {
      console.log(`File rejected: ${file.originalname} (${mimeType})`);
      cb(
        new Error(
          "Only PDF, Images (png/jpg/jpeg), Word, Excel, JSON, and Text files are allowed"
        ),
        false
      );
    }
  };

  const limits = {
    fileSize: 10 * 1024 * 1024, 
  };

  const uploader = multer({ storage, fileFilter, limits });

  return (req, res, next) => {
    const handler = uploader.single(fieldName);

    handler(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        console.log("Multer error:", err);
        return res.status(400).json({
          success: false,
          message: "File upload error",
          error: err.message,
          code: err.code,
        });
      } else if (err) {
        console.log("Upload validation error:", err.message);
        return res.status(400).json({
          success: false,
          message: "Upload failed",
          error: err.message,
        });
      }

      if (req.file) {
        console.log("File received:", {
          name: req.file.originalname,
          type: req.file.mimetype,
          size: `${(req.file.size / 1024).toFixed(2)} KB`,
        });
      } else {
        console.log("No file uploaded");
      }

      next();
    });
  };
};

export const multipleFileUpload = (fields = []) => {
    const storage = multer.memoryStorage();
  
    const allowedTypes = Object.values(extensionToMime);
    const allowedExtensions = Object.keys(extensionToMime);
  
    const fileFilter = (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      let mimeType = file.mimetype;
  
      if (extensionToMime[ext]) {
        mimeType = extensionToMime[ext];
        file.mimetype = mimeType;
      }
  
      if (allowedTypes.includes(mimeType) && allowedExtensions.includes(ext)) {
        cb(null, true);
      } else {
        cb(
          new Error(
            "Only PDF, Images (png/jpg/jpeg), Word, Excel, JSON, and Text files are allowed"
          ),
          false
        );
      }
    };
  
    const uploader = multer({
      storage,
      fileFilter,
      limits: { fileSize: 10 * 1024 * 1024 },
    });
  
    return (req, res, next) => {
      const handler = uploader.fields(fields);
  
      handler(req, res, (err) => {
        if (err instanceof multer.MulterError) {
          return res.status(400).json({
            success: false,
            message: "File upload error",
            error: err.message,
          });
        } else if (err) {
          return res.status(400).json({
            success: false,
            message: "Upload failed",
            error: err.message,
          });
        }
  
        next();
      });
    };
  };
  