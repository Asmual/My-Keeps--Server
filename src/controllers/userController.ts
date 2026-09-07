import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User';

// GET /api/user/profile
export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, email } = req.query;

    if (!userId && !email) {
      res.status(400).json({ success: false, message: 'userId or email is required' });
      return;
    }

    const orConditions: Record<string, unknown>[] = [];
    if (userId && typeof userId === 'string') {
      if (mongoose.isValidObjectId(userId)) {
        orConditions.push({ _id: new mongoose.Types.ObjectId(userId) });
      }
      orConditions.push({ id: userId });
    }
    if (email && typeof email === 'string') {
      orConditions.push({ email: email.toLowerCase() });
    }

    const user = await User.findOne({ $or: orConditions });
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
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile',
      error: (error as Error).message,
    });
  }
};

// PATCH /api/user/profile
export const updateUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, email, name, image, gender, phoneNumber } = req.body;

    if (!userId && !email) {
      res.status(400).json({ success: false, message: 'userId or email is required' });
      return;
    }

    const orConditions: Record<string, unknown>[] = [];
    if (userId) {
      if (mongoose.isValidObjectId(userId)) {
        orConditions.push({ _id: new mongoose.Types.ObjectId(userId) });
      }
      orConditions.push({ id: userId });
    }
    if (email) {
      orConditions.push({ email: String(email).toLowerCase() });
    }

    const updateFields: Record<string, unknown> = {};
    if (typeof name === 'string') updateFields.name = name.trim();
    if (typeof image === 'string') updateFields.image = image;
    if (typeof gender === 'string') updateFields.gender = gender;
    if (typeof phoneNumber === 'string') updateFields.phoneNumber = phoneNumber.trim();

    const updatedUser = await User.findOneAndUpdate(
      { $or: orConditions },
      { $set: updateFields },
      { new: true }
    );

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
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update user profile',
      error: (error as Error).message,
    });
  }
};
