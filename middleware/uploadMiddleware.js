import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${file.fieldname}${ext}`);
    },
});

const fileFilter = (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png'];
    if(!allowed.includes(file.mimetype)){
        return cb(new Error('Only JPG and PNG images are allowed'), false);
    }
    cb(null, true);
};

export const upload = multer({storage, fileFilter, limits: {fileSize: 2 * 1024 * 1024}});