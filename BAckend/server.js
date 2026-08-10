require('dotenv').config(); // Forced restart applied
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const { errorHandler } = require('./middlewares/errorMiddleware');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const companyRoutes = require('./routes/companyRoutes');
const projectRoutes = require('./routes/projectRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const taskRoutes = require('./routes/taskRoutes');
const timeLogRoutes = require('./routes/timeLogRoutes');
const photoRoutes = require('./routes/photoRoutes');
const drawingRoutes = require('./routes/drawingRoutes');
const issueRoutes = require('./routes/issueRoutes');
const dailyLogRoutes = require('./routes/dailyLogRoutes');
const estimateRoutes = require('./routes/estimateRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const purchaseOrderRoutes = require('./routes/purchaseOrder.routes');
const chatRoutes = require('./routes/chatRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const reportRoutes = require('./routes/reportRoutes');
const roleRoutes = require('./routes/roleRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const planRoutes = require('./routes/planRoutes');
const billingRoutes = require('./routes/billingRoutes');
const jobRoutes = require('./routes/jobRoutes');
const equipmentRoutes = require('./routes/equipmentRoutes');
const rfiRoutes = require('./routes/rfiRoutes');
const payrollRoutes = require('./routes/payrollRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const correctionRoutes = require('./routes/correctionRoutes');
const jobTaskRoutes = require('./routes/jobTaskRoutes');
const taskTemplateRoutes = require('./routes/taskTemplateRoutes');
const todoRoutes = require('./routes/todoRoutes');
const projectDocumentRoutes = require('./routes/projectDocumentRoutes');
const prisma = require('./config/prisma');

const app = express();
const server = http.createServer(app);

// Socket.io Setup
const io = new Server(server, {
    cors: {
        origin: (origin, callback) => {
            // Allow all localhost origins in development (any port)
            if (!origin || process.env.NODE_ENV === 'development') return callback(null, true);
            const allowed = ["https://kaal.ca", "http://localhost:5173", "http://localhost:5174", "http://localhost:3000"];
            if (allowed.includes(origin)) return callback(null, true);
            return callback(new Error('Socket CORS: Not allowed by CORS'));
        },
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        credentials: true
    },
    transports: ['websocket', 'polling']
});

// Connect to Database handled at bottom of file

// Middleware
app.use(helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false,
}));

const allowedOrigins = ["https://kaal.ca", "http://localhost:5173", "http://localhost:3000"];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || process.env.NODE_ENV === 'development' || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express.json({ 
    limit: '50mb',
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(morgan('dev'));

const healthRoutes = require('./routes/healthRoutes');
const { authRateLimiter, apiRateLimiter } = require('./middlewares/rateLimiter');

// Static files
app.use('/uploads', cors(), express.static(path.join(__dirname, 'uploads')));

// Health Check
app.use('/health', healthRoutes);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/timelogs', timeLogRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/drawings', drawingRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/dailylogs', dailyLogRoutes);
app.use('/api/estimates', estimateRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/rfis', rfiRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/corrections', correctionRoutes);
app.use('/api/job-tasks', jobTaskRoutes);
app.use('/api/task-templates', taskTemplateRoutes);
app.use('/api/todos', todoRoutes);
app.use('/api/project-documents', projectDocumentRoutes);

// Root Route
app.get('/', (req, res) => {
    res.send('Construction SaaS Backend API is running...');
});

// Online User Tracking
const onlineUsers = new Map();

const jwt = require('jsonwebtoken');

// Socket.io JWT Authentication Middleware
io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token) {
        return next(new Error('Authentication error: Token missing'));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded; // { userId, role, companyId, ... }
        next();
    } catch (err) {
        return next(new Error('Authentication error: Invalid token'));
    }
});

// Socket.io Connection
io.on('connection', async (socket) => {
    const userId = socket.user?.id || socket.user?.userId;
    if (!userId) {
        console.log('New client connected without valid user ID:', socket.id);
        return;
    }
    console.log('New client connected:', socket.id, 'User:', userId);

    // Join personal room
    socket.join(userId.toString());

    // Join all chat rooms this user participates in (required for io.to(roomId).emit('new_message'))
    try {
        const participants = await prisma.chatParticipant.findMany({
            where: { userId: userId.toString() }
        });
        if (Array.isArray(participants)) {
            participants.forEach(p => {
                const roomId = p.roomId || p.room;
                if (roomId) {
                    socket.join(roomId.toString());
                    console.log(`User ${userId} joined room ${roomId}`);
                }
            });
        }
    } catch (err) {
        console.error('Error joining rooms on connect:', err.message);
    }

    // Register User (Keep for legacy or extra metadata if needed, but token is primary)
    socket.on('register_user', (userData) => {
        if (userData && (userData._id || userData.id)) {
            const uId = userData._id || userData.id;
            onlineUsers.set(socket.id, {
                userId: uId,
                fullName: userData.fullName || userData.name,
                role: userData.role,
                companyId: userData.companyId,
                lat: userData.lat || null,
                lng: userData.lng || null
            });

            // Update every client with new online count
            io.emit('online_users_count', onlineUsers.size);
            io.emit('user_status_change', { userId: uId, status: 'online' });
        }
    });

    // Handle room joining dynamically (e.g. when a new room is created)
    socket.on('join_room', (roomId) => {
        if (!roomId) return;
        socket.join(roomId.toString());
        console.log(`User ${userId} joined room manually: ${roomId}`);
    });

    socket.on('disconnect', () => {
        const user = onlineUsers.get(socket.id);
        if (user) {
            onlineUsers.delete(socket.id);
            io.emit('online_users_count', onlineUsers.size);
            io.emit('user_status_change', { userId: user.userId, status: 'offline' });
        }
        console.log('Client disconnected:', socket.id);
    });
});

// Make io available in routes
app.set('io', io);

// Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

// Connect to Database and Start Server
const startServer = () => {
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log('[Chat policy] PM may initiate direct messages with clients (assertDirectMessagingAllowed in chatController.js)');
    });
};

if (prisma && typeof prisma.$connect === 'function') {
    prisma.$connect()
        .then(() => {
            console.log('[Database] PostgreSQL connected via Prisma Client singleton 🚀');
            startServer();
        })
        .catch(err => {
            console.error('⚠️ [Database Warning] Failed to connect to PostgreSQL via Prisma:', err.message);
            console.error('⚠️ Please verify your PostgreSQL password/credentials in BAckend/.env (DATABASE_URL)');
            console.log('[Server] Starting HTTP server in fallback mode...');
            startServer();
        });
} else {
    startServer();
}

// Process Unhandled Error Safety
process.on('uncaughtException', (err) => {
    console.error('[Uncaught Exception]:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[Unhandled Rejection]:', reason);
});

// Graceful Shutdown for Nodemon and manual restarts
const gracefulShutdown = () => {
    console.log('Shutting down server gracefully...');
    server.close(() => {
        console.log('Server closed and port released.');
        process.exit(0);
    });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
process.once('SIGUSR2', () => {
    server.close(() => {
        process.kill(process.pid, 'SIGUSR2');
    });
});
