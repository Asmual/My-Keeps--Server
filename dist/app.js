"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const noteRoutes_1 = __importDefault(require("./routes/noteRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const createApp = () => {
    const app = (0, express_1.default)();
    // CORS Middleware: Allow local dev, Vercel deployments, and configured CLIENT_URL
    const configuredOrigins = process.env.CLIENT_URL
        ? process.env.CLIENT_URL.split(',').map((u) => u.trim())
        : [];
    app.use((0, cors_1.default)({
        origin: (origin, callback) => {
            // Allow server-to-server or tools without origin header (Postman, curl, Render health checks)
            if (!origin)
                return callback(null, true);
            if (configuredOrigins.includes('*') ||
                configuredOrigins.includes(origin) ||
                origin.includes('localhost') ||
                origin.endsWith('.vercel.app')) {
                return callback(null, true);
            }
            return callback(null, true); // Permissive for production web apps
        },
        credentials: true,
    }));
    app.use(express_1.default.json());
    app.use(express_1.default.urlencoded({ extended: true }));
    // Root / Health Check
    const healthCheck = (_req, res) => {
        res.status(200).json({
            success: true,
            message: '🚀 My Keeps Backend API is running.',
            version: '1.0.0',
            database: 'MongoDB Atlas',
            timestamp: new Date().toISOString(),
        });
    };
    app.get('/', healthCheck);
    app.get('/health', healthCheck);
    // API Routes
    app.use('/api/auth', authRoutes_1.default);
    app.use('/api/notes', noteRoutes_1.default);
    app.use('/api/user', userRoutes_1.default);
    // 404 Handler
    app.use((_req, res) => {
        res.status(404).json({
            success: false,
            message: 'Endpoint not found',
        });
    });
    // Global Error Handler
    app.use((err, _req, res, _next) => {
        console.error('Unhandled Server Error:', err.stack);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined,
        });
    });
    return app;
};
exports.createApp = createApp;
exports.default = exports.createApp;
