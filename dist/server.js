"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables before anything else
dotenv_1.default.config();
const app_1 = require("./app");
const db_1 = require("./config/db");
const reminderScheduler_1 = require("./services/reminderScheduler");
const startServer = async () => {
    const PORT = process.env.PORT || 5000;
    // 1. Connect to MongoDB
    await (0, db_1.connectDB)();
    // 2. Start background email reminder scheduler
    (0, reminderScheduler_1.startReminderScheduler)();
    // 3. Initialize Express application
    const app = (0, app_1.createApp)();
    // 4. Start listening
    const server = app.listen(PORT, () => {
        console.log(`🚀 My Keeps Server is listening on http://localhost:${PORT}`);
        console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
    // Graceful shutdown
    const shutdown = () => {
        console.log('\n🛑 Shutting down server gracefully...');
        (0, reminderScheduler_1.stopReminderScheduler)();
        server.close(() => {
            console.log('✅ Server closed.');
            process.exit(0);
        });
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
};
startServer().catch((err) => {
    console.error('Fatal Server Boot Error:', err);
    process.exit(1);
});
