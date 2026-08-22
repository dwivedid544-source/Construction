const multer = require('multer');
const ImageKit = require('imagekit');
const path = require('path');

// Lazy-initialize to avoid crash at startup when env vars are not set
let _imagekit = null;
const getImageKit = () => {
    if (!_imagekit) {
        _imagekit = new ImageKit({
            publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
            privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
            urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
        });
    }
    return _imagekit;
};

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedExtensions = [
        '.pdf', '.dwg', '.dxf', '.jpg', '.jpeg', '.png', '.gif', '.webp',
        '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', 
        '.txt', '.csv', '.zip', '.rar', '.7z'
    ];
    const allowedMimeTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain', 'text/csv'
    ];
    
    const ext = path.extname(file.originalname).toLowerCase();
    const mimeOk = allowedMimeTypes.includes(file.mimetype);
    const extOk = ext === '' || allowedExtensions.includes(ext); // allow no-extension files
    
    if (mimeOk || (extOk && ext !== '')) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type! Allowed: ${allowedExtensions.join(', ')}`), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

const fs = require('fs');

// Middleware to handle ImageKit upload with automatic reliable local storage fallback
const imageKitUpload = async (req, res, next) => {
    // Handle both single file (req.file) and multiple files (req.files)
    const files = req.file ? [req.file] : (req.files || []);
    
    if (files.length === 0) return next();

    let subFolder = 'general';
    if (req.baseUrl.includes('drawings')) subFolder = 'drawings';
    else if (req.baseUrl.includes('vendors')) subFolder = 'trades';
    else if (req.baseUrl.includes('rfis')) subFolder = 'rfis';
    else if (req.baseUrl.includes('chat')) subFolder = 'chat';
    else if (req.baseUrl.includes('issues')) subFolder = 'issues';
    else if (req.baseUrl.includes('invoices')) subFolder = 'invoices';
    else if (req.baseUrl.includes('project-documents')) subFolder = 'documents';

    const saveLocally = (file) => {
        const uploadDir = path.join(__dirname, `../uploads/${subFolder}`);
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        let ext = path.extname(file.originalname);
        if (!ext) {
            const mimeToExt = {
                'image/jpeg': '.jpg', 'image/jpg': '.jpg',
                'image/png': '.png', 'image/gif': '.gif',
                'image/webp': '.webp', 'image/heic': '.jpg',
                'application/pdf': '.pdf'
            };
            ext = mimeToExt[file.mimetype] || '.jpg';
        }
        const fileName = `${file.fieldname || 'file'}-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
        const targetPath = path.join(uploadDir, fileName);
        fs.writeFileSync(targetPath, file.buffer);
        const relPath = `uploads/${subFolder}/${fileName}`;
        file.path = relPath;
        file.url = `/${relPath}`;
        file.location = `/${relPath}`;
        return relPath;
    };

    const hasImageKitConfig = process.env.IMAGEKIT_PUBLIC_KEY && 
                              process.env.IMAGEKIT_PRIVATE_KEY && 
                              process.env.IMAGEKIT_URL_ENDPOINT;

    if (!hasImageKitConfig) {
        try {
            files.forEach(saveLocally);
            return next();
        } catch (localErr) {
            console.error('Local file save error:', localErr);
            return res.status(500).json({ message: 'Failed to save uploaded file locally', error: localErr.message });
        }
    }

    try {
        const uploadPromises = files.map(async (file) => {
            let ext = path.extname(file.originalname);
            if (!ext) {
                const mimeToExt = {
                    'image/jpeg': '.jpg', 'image/jpg': '.jpg',
                    'image/png': '.png', 'image/gif': '.gif',
                    'image/webp': '.webp', 'image/heic': '.jpg',
                    'application/pdf': '.pdf'
                };
                ext = mimeToExt[file.mimetype] || '.jpg';
            }
            try {
                const uploadResponse = await getImageKit().upload({
                    file: file.buffer,
                    fileName: `${file.fieldname}-${Date.now()}${ext}`,
                    folder: `construction_saas/${subFolder}`,
                    useUniqueFileName: true
                });
                
                file.path = uploadResponse.url;
                file.url = uploadResponse.url;
                file.location = uploadResponse.url;
                file.mimetype = uploadResponse.fileType || file.mimetype;
                return uploadResponse;
            } catch (ikErr) {
                console.warn('[ImageKit] Upload failed, falling back to local disk:', ikErr.message);
                saveLocally(file);
            }
        });

        await Promise.all(uploadPromises);
        next();
    } catch (error) {
        console.warn('ImageKit batch fallback to local disk:', error.message);
        try {
            files.forEach(saveLocally);
            next();
        } catch (fallbackErr) {
            res.status(500).json({ message: 'Error processing uploaded file', error: fallbackErr.message });
        }
    }
};

module.exports = {
    upload,
    imageKitUpload
};
