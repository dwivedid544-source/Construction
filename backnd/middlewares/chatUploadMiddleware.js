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
                const isImage = file.mimetype.startsWith('image/');
                const resource_type = isImage ? 'image' : 'raw';
                const extension = file.originalname.split('.').pop();
                const cleanName = file.originalname.split('.')[0].replace(/[^a-zA-Z0-9]/g, '_');

                return {
                    folder: 'construction_saas/chat_attachments',
                    resource_type: resource_type,
                    public_id: `attachment-${Date.now()}-${cleanName}${resource_type === 'raw' ? `.${extension}` : ''}`,
                    access_mode: 'public',
                    type: 'upload'
                };
            }
        });
    } catch (err) {
        console.warn('[chatUploadMiddleware] Cloudinary setup failed, falling back to local disk storage:', err.message);
    }
}

if (!storage) {
    const uploadDir = path.join(__dirname, '../uploads/chat');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const ext = path.extname(file.originalname).toLowerCase() || '.bin';
            cb(null, `attachment-${uniqueSuffix}${ext}`);
        }
    });
}

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

module.exports = upload;
