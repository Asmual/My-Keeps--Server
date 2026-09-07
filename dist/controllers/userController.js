"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserProfile = exports.getUserProfile = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = require("../models/User");
// GET /api/user/profile
const getUserProfile = async (req, res) => {
    try {
        const { userId, email } = req.query;
        if (!userId && !email) {
            res.status(400).json({ success: false, message: 'userId or email is required' });
            return;
        }
        const orConditions = [];
        if (userId && typeof userId === 'string') {
            if (mongoose_1.default.isValidObjectId(userId)) {
                orConditions.push({ _id: new mongoose_1.default.Types.ObjectId(userId) });
            }
            orConditions.push({ id: userId });
        }
        if (email && typeof email === 'string') {
            orConditions.push({ email: email.toLowerCase() });
        }
        const user = await User_1.User.findOne({ $or: orConditions });
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        res.status(200).json({
            success: true,
            user: {
                id: String(user._id),
                name: user.name,
                email: user.email,
                image: user.image || '',
                gender: user.gender || '',
                phoneNumber: user.phoneNumber || '',
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user profile',
            error: error.message,
        });
    }
};
exports.getUserProfile = getUserProfile;
// PATCH /api/user/profile
const updateUserProfile = async (req, res) => {
    try {
        const { userId, email, name, image, gender, phoneNumber } = req.body;
        if (!userId && !email) {
            res.status(400).json({ success: false, message: 'userId or email is required' });
            return;
        }
        const orConditions = [];
        if (userId) {
            if (mongoose_1.default.isValidObjectId(userId)) {
                orConditions.push({ _id: new mongoose_1.default.Types.ObjectId(userId) });
            }
            orConditions.push({ id: userId });
        }
        if (email) {
            orConditions.push({ email: String(email).toLowerCase() });
        }
        const updateFields = {};
        if (typeof name === 'string')
            updateFields.name = name.trim();
        if (typeof image === 'string')
            updateFields.image = image;
        if (typeof gender === 'string')
            updateFields.gender = gender;
        if (typeof phoneNumber === 'string')
            updateFields.phoneNumber = phoneNumber.trim();
        const updatedUser = await User_1.User.findOneAndUpdate({ $or: orConditions }, { $set: updateFields }, { new: true });
        if (!updatedUser) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: String(updatedUser._id),
                name: updatedUser.name,
                email: updatedUser.email,
                image: updatedUser.image || '',
                gender: updatedUser.gender || '',
                phoneNumber: updatedUser.phoneNumber || '',
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update user profile',
            error: error.message,
        });
    }
};
exports.updateUserProfile = updateUserProfile;
