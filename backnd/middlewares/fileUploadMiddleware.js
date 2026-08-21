const path = require('path');
const fs = require('fs');
const multer = require('multer');

let storage;

if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    try {
        const cloudinary = require('cloudinary');
        const { CloudinaryStorage } = require('multer-storage-cloudinary');
        cloudinary.v2.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET
        });
        storage = new CloudinaryStorage({
            cloudinary: cloudinary,
            params: async (req, file) => {
                let folder = 'general';
                if (req.baseUrl.includes('drawings')) folder = 'drawings';
                else if (req.baseUrl.includes('rfis')) folder = 'drawings';
                else if (req.baseUrl.includes('vendors')) folder = 'drawings';

                return {
                    folder: `construction_saas/${folder}`,
                    resource_type: 'auto',
                    public_id: `${file.fieldname}-${Date.now()}`,
                };
            },
        });
    } catch (err) {
        console.warn('[fileUploadMiddleware] Cloudinary setup failed, falling back to local disk storage:', err.message);
    }
}

if (!storage) {
    const uploadDir = path.join(__dirname, '../uploads/documents');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const ext = path.extname(file.originalname).toLowerCase() || '.pdf';
            cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        }
    });
}

const fileFilter = (req, file, cb) => {
    const allowedExtensions = ['.pdf', '.dwg', '.dxf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xls', '.xlsx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type! Allowed: PDF, DWG, DXF, JPG, PNG, DOC, DOCX, XLS'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

module.exports = upload;
