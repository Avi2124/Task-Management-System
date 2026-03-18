import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import path from "path";
import { AppError } from "../utils/AppError.js";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(
      new AppError(
        "Only PDF, DOC and DOCX files are allowed",
        400,
        "INVALID_FILE_TYPE"
      ),
      false
    );
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const uploadTaskRefDoc = [
  upload.single("refDoc"),

  async (req, res, next) => {
    if (!req.file) return next();

    try {
      const originalExtension = path.extname(req.file.originalname || "").replace(".", "").toLowerCase();
      const baseFileName = path.basename(req.file.originalname || "document", path.extname(req.file.originalname || ""));
      const sanitizedBaseName = baseFileName.replace(/[^a-zA-Z0-9-_]/g, "-") || "document";
      const attachmentFileName = `${sanitizedBaseName}.${originalExtension || "file"}`;

      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "task-ref-docs",
            resource_type: "raw",
            public_id: `${Date.now()}-${sanitizedBaseName}`,
            use_filename: false,
            unique_filename: false,
            overwrite: false,
            filename_override: attachmentFileName,
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );

        streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
      });

      const downloadUrl = cloudinary.url(result.public_id, {
        resource_type: "raw",
        type: "upload",
        secure: true,
        flags: `attachment:${attachmentFileName}`,
        format: originalExtension || result.format,
      });

      req.fileUrl = downloadUrl;
      req.filePublicId = result.public_id;
      req.fileData = {
        url: downloadUrl,
        viewUrl: result.secure_url,
        publicId: result.public_id,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
      };

      next();
    } catch (error) {
      next(error);
    }
  },
];