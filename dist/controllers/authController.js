"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.login = exports.register = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_jwt_key_mykeeps_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
// Generate JWT token with user id and email
const generateToken = (id, email) => {
    return jsonwebtoken_1.default.sign({ id, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};
// POST /api/auth/register
const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            res.status(400).json({ success: false, message: 'Name, email, and password are required' });
            return;
        }
        if (password.length < 6) {
            res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
            return;
        }
        const existingUser = await User_1.User.findOne({ email: email.toLowerCase().trim() });
        if (existingUser) {
            res.status(409).json({ success: false, message: 'Email already in use' });
            return;
        }
        // Hash password with bcrypt
        const saltRounds = 10;
        const hashedPassword = await bcrypt_1.default.hash(password, saltRounds);
        const user = await User_1.User.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
        });
        const token = generateToken(String(user._id), user.email);
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            token,
            user: {
                id: String(user._id),
                name: user.name,
                email: user.email,
                image: user.image || '',
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Registration failed',
            error: error.message,
        });
    }
};
exports.register = register;
// POST /api/auth/login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ success: false, message: 'Email and password are required' });
            return;
        }
        const user = await User_1.User.findOne({ email: email.toLowerCase().trim() });
        if (!user || !user.password) {
            res.status(401).json({ success: false, message: 'Invalid email or password' });
            return;
        }
        // Compare bcrypt password
        const isMatch = await bcrypt_1.default.compare(password, user.password);
        if (!isMatch) {
            res.status(401).json({ success: false, message: 'Invalid email or password' });
            return;
        }
        const token = generateToken(String(user._id), user.email);
        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: String(user._id),
                name: user.name,
                email: user.email,
                image: user.image || '',
                gender: user.gender || '',
                phoneNumber: user.phoneNumber || '',
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Login failed',
            error: error.message,
        });
    }
};
exports.login = login;
// GET /api/auth/me (Protected Route via JWT)
const getMe = async (req, res) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Not authenticated' });
        return;
    }
    res.status(200).json({
        success: true,
        user: {
            id: String(req.user._id),
            name: req.user.name,
            email: req.user.email,
            image: req.user.image || '',
            gender: req.user.gender || '',
            phoneNumber: req.user.phoneNumber || '',
        },
    });
};
exports.getMe = getMe;
