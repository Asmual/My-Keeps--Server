import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Note } from '../models/Note';
import { hashNotePassword, verifyNotePassword } from '../utils/security';

// GET /api/notes
export const getNotes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { filter, search, label, userId } = req.query;

    // Strict multi-tenant isolation: If no userId is provided, return empty array immediately
    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      res.status(200).json({
        success: true,
        count: 0,
        data: [],
      });
      return;
    }

    const query: Record<string, unknown> = {
      userId: userId.trim(),
    };

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
    } else if (filter === 'reminders') {
      query.isArchived = false;
      query.isTrashed = false;
      query.reminder = { $ne: null };
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
      const obj = note.toJSON() as unknown as Record<string, any>;
      const hasPassword = Boolean(obj.isLocked);
      const isTemporarilyUnlocked = Boolean(
        hasPassword &&
          obj.unlockedUntil &&
          new Date(obj.unlockedUntil as string | Date).getTime() > Date.now()
      );
      const isEffectivelyLocked = hasPassword && !isTemporarilyUnlocked;

      if (isEffectivelyLocked) {
        obj.content = '';
        obj.images = [];
        obj.checklist = [];
        obj.audioUrl = null;
      }
      return {
        ...obj,
        isLocked: hasPassword,
        isUnlocked: isTemporarilyUnlocked,
        unlockedUntil: obj.unlockedUntil ? new Date(obj.unlockedUntil as string | Date).toISOString() : null,
      };
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
    const { userId } = req.query;

    const filterQuery: Record<string, unknown> = { _id: id };
    if (userId && typeof userId === 'string') {
      filterQuery.userId = userId.trim();
    }

    const note = await Note.findOne(filterQuery);

    if (!note) {
      res.status(404).json({ success: false, message: 'Note not found' });
      return;
    }

    const obj = note.toJSON() as unknown as Record<string, any>;
    const hasPassword = Boolean(obj.isLocked);
    const isTemporarilyUnlocked = Boolean(
      hasPassword &&
        obj.unlockedUntil &&
        new Date(obj.unlockedUntil as string | Date).getTime() > Date.now()
    );
    const isEffectivelyLocked = hasPassword && !isTemporarilyUnlocked;

    if (isEffectivelyLocked) {
      obj.content = '';
      obj.images = [];
      obj.checklist = [];
      obj.audioUrl = null;
    }

    res.status(200).json({
      success: true,
      data: {
        ...obj,
        isLocked: hasPassword,
        isUnlocked: isTemporarilyUnlocked,
        unlockedUntil: obj.unlockedUntil ? new Date(obj.unlockedUntil as string | Date).toISOString() : null,
      },
    });
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

    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      res.status(401).json({
        success: false,
        message: 'Authentication required. Please sign in to create notes.',
      });
      return;
    }

    let locked = Boolean(isLocked);
    let passwordHash: string | null = null;
    if (password && typeof password === 'string' && password.trim().length >= 4) {
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
      reminder: reminder ? new Date(reminder) : null,
      userId: userId.trim(),
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
    const { userId } = req.body;
    const updateData = { ...req.body };

    // Lock and password are managed exclusively via dedicated lock/unlock endpoints
    delete updateData.password;
    delete updateData.isLocked;
    delete updateData.unlockedUntil;
    delete updateData.userId;

    if (updateData.reminder !== undefined) {
      updateData.reminder = updateData.reminder ? new Date(updateData.reminder) : null;
    }

    const filterQuery: Record<string, unknown> = { _id: id };
    if (userId && typeof userId === 'string') {
      filterQuery.userId = userId.trim();
    }

    // If attempting to move note to trash, verify password if note is locked
    if (req.body.isTrashed === true) {
      const existing = await Note.findOne(filterQuery);
      if (!existing) {
        res.status(404).json({ success: false, message: 'Note not found' });
        return;
      }
      if (existing.isLocked && existing.password) {
        const providedPassword = req.body.password;
        if (!providedPassword || !verifyNotePassword(String(providedPassword).trim(), existing.password)) {
          res.status(403).json({
            success: false,
            message: 'Password required to delete a locked note',
          });
          return;
        }
      }
    }

    const updatedNote = await Note.findOneAndUpdate(filterQuery, updateData, {
      returnDocument: 'after',
      runValidators: true,
    });

    if (!updatedNote) {
      res.status(404).json({ success: false, message: 'Note not found' });
      return;
    }

    const obj = updatedNote.toJSON() as unknown as Record<string, any>;
    const hasPassword = Boolean(obj.isLocked);
    const isTemporarilyUnlocked = Boolean(
      hasPassword &&
        obj.unlockedUntil &&
        new Date(obj.unlockedUntil as string | Date).getTime() > Date.now()
    );
    const isEffectivelyLocked = hasPassword && !isTemporarilyUnlocked;

    if (isEffectivelyLocked) {
      obj.content = '';
      obj.images = [];
      obj.checklist = [];
      obj.audioUrl = null;
    }

    res.status(200).json({
      success: true,
      message: 'Note updated successfully',
      data: {
        ...obj,
        isLocked: hasPassword,
        isUnlocked: isTemporarilyUnlocked,
        unlockedUntil: obj.unlockedUntil ? new Date(obj.unlockedUntil as string | Date).toISOString() : null,
      },
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
    const { userId } = req.query;

    const filterQuery: Record<string, unknown> = { _id: id };
    if (userId && typeof userId === 'string') {
      filterQuery.userId = userId.trim();
    }

    const note = await Note.findOne(filterQuery);

    if (!note) {
      res.status(404).json({ success: false, message: 'Note not found' });
      return;
    }

    // Require password if note is locked
    if (note.isLocked && note.password) {
      const providedPassword = req.body?.password || req.query?.password;
      if (!providedPassword || !verifyNotePassword(String(providedPassword).trim(), note.password)) {
        res.status(403).json({
          success: false,
          message: 'Password required to delete a locked note',
        });
        return;
      }
    }

    await Note.deleteOne(filterQuery);

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
    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    // Locked notes in trash are preserved from bulk emptying
    const query: Record<string, unknown> = {
      isTrashed: true,
      userId: userId.trim(),
      isLocked: { $ne: true },
    };
    const result = await Note.deleteMany(query);

    res.status(200).json({
      success: true,
      message: 'Trash emptied successfully (locked notes preserved)',
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

    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    if (action === 'empty-trash') {
      const query: Record<string, unknown> = {
        isTrashed: true,
        userId: userId.trim(),
        isLocked: { $ne: true },
      };
      const result = await Note.deleteMany(query);
      res.status(200).json({
        success: true,
        message: 'Trash emptied successfully (locked notes preserved)',
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
        userId: userId.trim(),
        isLocked: { $ne: true }, // Protect locked notes from batch delete
      };

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
    const { password, userId, action } = req.body;

    const filterQuery: Record<string, unknown> = { _id: id };
    if (userId && typeof userId === 'string') {
      filterQuery.userId = userId.trim();
    }

    if (action === 'lock-now') {
      const updated = await Note.findOneAndUpdate(
        filterQuery,
        {
          $set: {
            unlockedUntil: null,
          },
        },
        { returnDocument: 'after' }
      );

      if (!updated) {
        res.status(404).json({ success: false, message: 'Note not found' });
        return;
      }

      const obj = updated.toJSON() as unknown as Record<string, any>;
      res.status(200).json({
        success: true,
        message: 'Note locked successfully',
        data: {
          ...obj,
          isLocked: true,
          isUnlocked: false,
          unlockedUntil: null,
          content: '',
          images: [],
          checklist: [],
          audioUrl: null,
        },
      });
      return;
    }

    if (!password || typeof password !== 'string' || password.trim().length < 4) {
      res.status(400).json({ success: false, message: 'Password must be at least 4 characters' });
      return;
    }

    const updated = await Note.findOneAndUpdate(
      filterQuery,
      {
        $set: {
          isLocked: true,
          password: hashNotePassword(password.trim()),
          unlockedUntil: null,
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
      data: {
        id: updated.id,
        isLocked: true,
        isUnlocked: false,
        unlockedUntil: null,
        content: '',
        images: [],
        checklist: [],
        audioUrl: null,
      },
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
    const { password, userId } = req.body;

    const filterQuery: Record<string, unknown> = { _id: id };
    if (userId && typeof userId === 'string') {
      filterQuery.userId = userId.trim();
    }

    const note = await Note.findOne(filterQuery);
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

    // 3-hour unlock window
    const unlockedUntil = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const updated = await Note.findOneAndUpdate(
      filterQuery,
      {
        $set: {
          unlockedUntil,
        },
      },
      { returnDocument: 'after' }
    );

    const obj = updated ? updated.toJSON() : note.toJSON();
    res.status(200).json({
      success: true,
      message: 'Note unlocked for 3 hours',
      data: {
        ...obj,
        isLocked: true,
        isUnlocked: true,
        unlockedUntil: unlockedUntil.toISOString(),
      },
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
    const { password, userId } = req.body;

    const filterQuery: Record<string, unknown> = { _id: id };
    if (userId && typeof userId === 'string') {
      filterQuery.userId = userId.trim();
    }

    const note = await Note.findOne(filterQuery);
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

    const updated = await Note.findOneAndUpdate(
      filterQuery,
      {
        $set: {
          isLocked: false,
          password: null,
          unlockedUntil: null,
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

