import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Note } from '../models/Note';
import { hashNotePassword, verifyNotePassword } from '../utils/security';

// GET /api/notes
export const getNotes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { filter, search, label, userId } = req.query;

    const query: Record<string, unknown> = {};

    if (userId && typeof userId === 'string') {
      query.userId = userId;
    }

    if (filter === 'archive') {
      query.isArchived = true;
      query.isTrashed = false;
    } else if (filter === 'trash') {
      query.isTrashed = true;
    } else if (filter === 'checklist') {
      query.isArchived = false;
      query.isTrashed = false;
      query.$or = [{ noteType: 'checklist' }, { 'checklist.0': { $exists: true } }];
    } else if (filter === 'important') {
      query.isArchived = false;
      query.isTrashed = false;
      query.isImportant = true;
    } else if (filter === 'image') {
      query.isArchived = false;
      query.isTrashed = false;
      query.$or = [{ noteType: 'image' }, { 'images.0': { $exists: true } }];
    } else if (filter === 'voice') {
      query.isArchived = false;
      query.isTrashed = false;
      query.$or = [{ noteType: 'voice' }, { audioUrl: { $ne: null } }];
    } else {
      query.isArchived = false;
      query.isTrashed = false;
    }

    if (label && typeof label === 'string') {
      query.labels = label;
    }

    if (search && typeof search === 'string') {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { labels: { $regex: search, $options: 'i' } },
      ];
    }

    const notes = await Note.find(query).sort({ isPinned: -1, isImportant: -1, updatedAt: -1 });

    const sanitizedNotes = notes.map((note) => {
      const obj = note.toJSON();
      if (obj.isLocked) {
        obj.content = '';
        obj.images = [];
        obj.checklist = [];
        obj.audioUrl = null;
      }
      return obj;
    });

    res.status(200).json({
      success: true,
      count: sanitizedNotes.length,
      data: sanitizedNotes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notes',
      error: (error as Error).message,
    });
  }
};

// GET /api/notes/:id
export const getNoteById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const note = await Note.findById(id);

    if (!note) {
      res.status(404).json({ success: false, message: 'Note not found' });
      return;
    }

    const obj = note.toJSON();
    if (obj.isLocked) {
      obj.content = '';
      obj.images = [];
      obj.checklist = [];
      obj.audioUrl = null;
    }

    res.status(200).json({ success: true, data: obj });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch note',
      error: (error as Error).message,
    });
  }
};

// POST /api/notes
export const createNote = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      title,
      content,
      color,
      isPinned,
      isImportant,
      isArchived,
      labels,
      checklist,
      noteType,
      images,
      audioUrl,
      reminder,
      userId,
      isLocked,
      password,
    } = req.body;

    let locked = Boolean(isLocked);
    let passwordHash: string | null = null;
    if (password && typeof password === 'string' && password.trim().length > 0) {
      locked = true;
      passwordHash = hashNotePassword(password.trim());
    }

    const note = await Note.create({
      title: title || '',
      content: content || '',
      color: color || 'default',
      isPinned: Boolean(isPinned),
      isImportant: Boolean(isImportant),
      isArchived: Boolean(isArchived),
      isTrashed: false,
      labels: labels || [],
      checklist: checklist || [],
      noteType: noteType || 'text',
      images: images || [],
      audioUrl: audioUrl || null,
      reminder: reminder || null,
      userId: userId || null,
      isLocked: locked,
      password: passwordHash,
    });

    const obj = note.toJSON();
    if (obj.isLocked) {
      obj.content = '';
      obj.images = [];
      obj.checklist = [];
      obj.audioUrl = null;
    }

    res.status(201).json({
      success: true,
      message: 'Note created successfully',
      data: obj,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create note',
      error: (error as Error).message,
    });
  }
};

// PATCH /api/notes/:id
export const updateNote = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Lock and password are managed exclusively via dedicated lock/unlock endpoints
    delete updateData.password;
    delete updateData.isLocked;

    const updatedNote = await Note.findByIdAndUpdate(id, updateData, {
      returnDocument: 'after',
      runValidators: true,
    });

    if (!updatedNote) {
      res.status(404).json({ success: false, message: 'Note not found' });
      return;
    }

    const obj = updatedNote.toJSON();
    if (obj.isLocked) {
      obj.content = '';
      obj.images = [];
      obj.checklist = [];
      obj.audioUrl = null;
    }

    res.status(200).json({
      success: true,
      message: 'Note updated successfully',
      data: obj,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update note',
      error: (error as Error).message,
    });
  }
};

// DELETE /api/notes/:id
export const deleteNote = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const note = await Note.findByIdAndDelete(id);

    if (!note) {
      res.status(404).json({ success: false, message: 'Note not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Note permanently deleted',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete note',
      error: (error as Error).message,
    });
  }
};

// DELETE /api/notes/trash/empty
export const emptyTrash = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.query;
    const query: Record<string, unknown> = { isTrashed: true };
    if (userId && typeof userId === 'string') {
      query.userId = userId;
    }
    const result = await Note.deleteMany(query);

    res.status(200).json({
      success: true,
      message: 'Trash emptied successfully',
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to empty trash',
      error: (error as Error).message,
    });
  }
};

// DELETE /api/notes (Batch delete or empty trash via query params)
export const deleteNotes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { action, userId } = req.query;

    if (action === 'empty-trash') {
      const query: Record<string, unknown> = { isTrashed: true };
      if (userId && typeof userId === 'string') {
        query.userId = userId;
      }
      const result = await Note.deleteMany(query);
      res.status(200).json({
        success: true,
        message: 'Trash emptied successfully',
        deletedCount: result.deletedCount,
      });
      return;
    }

    const { ids } = req.body || {};
    if (Array.isArray(ids) && ids.length > 0) {
      const objectIds = ids
        .filter((id) => mongoose.isValidObjectId(id))
        .map((id) => new mongoose.Types.ObjectId(id));

      const query: Record<string, unknown> = {
        $or: [{ _id: { $in: objectIds } }, { id: { $in: ids } }],
      };
      if (userId && typeof userId === 'string') {
        query.userId = userId;
      }

      const result = await Note.deleteMany(query);
      res.status(200).json({
        success: true,
        message: `${result.deletedCount} notes deleted`,
        deletedCount: result.deletedCount,
      });
      return;
    }

    res.status(400).json({ success: false, message: 'Invalid delete request' });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete notes',
      error: (error as Error).message,
    });
  }
};

// POST /api/notes/:id/lock
export const lockNote = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || typeof password !== 'string' || password.trim().length < 4) {
      res.status(400).json({ success: false, message: 'Password must be at least 4 characters' });
      return;
    }

    const updated = await Note.findByIdAndUpdate(
      id,
      {
        $set: {
          isLocked: true,
          password: hashNotePassword(password.trim()),
        },
      },
      { returnDocument: 'after' }
    );

    if (!updated) {
      res.status(404).json({ success: false, message: 'Note not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Note locked successfully',
      data: { id: updated.id, isLocked: true },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to lock note',
      error: (error as Error).message,
    });
  }
};

// POST /api/notes/:id/unlock
export const unlockNote = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    const note = await Note.findById(id);
    if (!note) {
      res.status(404).json({ success: false, message: 'Note not found' });
      return;
    }

    if (!note.isLocked) {
      res.status(200).json({
        success: true,
        message: 'Note is not locked',
        data: note.toJSON(),
      });
      return;
    }

    if (!password || !note.password || !verifyNotePassword(password.trim(), note.password)) {
      res.status(401).json({ success: false, message: 'Incorrect password' });
      return;
    }

    // Password matches! Return full unmasked note
    const obj = note.toJSON();
    res.status(200).json({
      success: true,
      message: 'Note unlocked successfully',
      data: obj,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to unlock note',
      error: (error as Error).message,
    });
  }
};

// POST /api/notes/:id/remove-lock
export const removeLock = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    const note = await Note.findById(id);
    if (!note) {
      res.status(404).json({ success: false, message: 'Note not found' });
      return;
    }

    if (note.isLocked && note.password) {
      if (!password || !verifyNotePassword(password.trim(), note.password)) {
        res.status(401).json({ success: false, message: 'Incorrect password' });
        return;
      }
    }

    const updated = await Note.findByIdAndUpdate(
      id,
      {
        $set: {
          isLocked: false,
          password: null,
        },
      },
      { returnDocument: 'after' }
    );

    res.status(200).json({
      success: true,
      message: 'Note lock removed successfully',
      data: updated?.toJSON(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to remove note lock',
      error: (error as Error).message,
    });
  }
};

