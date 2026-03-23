import multer from "multer";
import cloudinary from "../config/cloudinary.js";
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
      const originalExtension = path
        .extname(req.file.originalname || "")
        .replace(".", "")
        .toLowerCase();

      const baseFileName = path.basename(
        req.file.originalname || "document",
        path.extname(req.file.originalname || "")
      );

      const sanitizedBaseName =
        baseFileName.replace(/[^a-zA-Z0-9-_ ]/g, "-").trim() || "document";

      const isPdf = req.file.mimetype === "application/pdf";
      const resourceType = isPdf ? "image" : "raw";

      // IMPORTANT:
      // For raw DOC/DOCX files, keep extension in public_id itself
      const publicId = isPdf
        ? `${Date.now()}-${sanitizedBaseName}`
        : `${Date.now()}-${sanitizedBaseName}.${originalExtension}`;

      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "task-ref-docs",
            resource_type: resourceType,
            public_id: publicId,
            use_filename: false,
            unique_filename: false,
            overwrite: false,
            filename_override: req.file.originalname,
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );

        streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
      });

      const extension = (originalExtension || result.format || "").toLowerCase();

      const commonOptions = {
        resource_type: resourceType,
        type: "upload",
        secure: true,
        version: result.version,
      };

      let viewUrl = null;
      let downloadUrl = null;

      if (isPdf) {
        viewUrl = cloudinary.url(result.public_id, {
          ...commonOptions,
          format: "pdf",
        });

        downloadUrl = cloudinary.url(result.public_id, {
          ...commonOptions,
          format: "pdf",
          flags: "attachment",
        });
      } else {
        // For raw DOC/DOCX, do NOT add format here
        // because extension is already inside public_id
        downloadUrl = cloudinary.url(result.public_id, {
          ...commonOptions,
          flags: "attachment",
        });
      }

      req.fileData = {
        url: downloadUrl,
        viewUrl,
        publicId: result.public_id,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        extension,
        resourceType,
        version: result.version,
      };

      next();
    } catch (error) {
      next(error);
    }
  },
];