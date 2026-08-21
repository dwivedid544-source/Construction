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
            params: {
                folder: 'construction_photos',
                allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'],
                public_id: (req, file) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                    return file.fieldname + '-' + uniqueSuffix;
                }
            }
        });
    } catch (err) {
        console.warn('[uploadMiddleware] Cloudinary setup failed, falling back to local disk storage:', err.message);
    }
}

if (!storage) {
    const uploadDir = path.join(__dirname, '../uploads/photos');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
            cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        }
    });
}

// File filter
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type! Please upload only images or PDFs.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 25 * 1024 * 1024 // 25MB limit
    }
});

module.exports = upload;
