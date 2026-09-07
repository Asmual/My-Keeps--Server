"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const connectDB = async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('❌ MONGODB_URI is not defined in environment variables.');
        process.exit(1);
    }
    try {
        const conn = await mongoose_1.default.connect(uri);
        console.log(`✅ MongoDB Connected Successfully: ${conn.connection.host} / ${conn.connection.name}`);
    }
    catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
        process.exit(1);
    }
    mongoose_1.default.connection.on('disconnected', () => {
        console.warn('⚠️ MongoDB connection lost. Reconnecting...');
    });
    mongoose_1.default.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err);
    });
};
exports.connectDB = connectDB;
exports.default = exports.connectDB;
