import { Request, Response } from 'express';
import { Note } from '../models/Note';

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

    res.status(200).json({
      success: true,
      count: notes.length,
      data: notes,
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

    res.status(200).json({ success: true, data: note });
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
    } = req.body;

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
    });

    res.status(201).json({
      success: true,
      message: 'Note created successfully',
      data: note,
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
    const updatedNote = await Note.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedNote) {
      res.status(404).json({ success: false, message: 'Note not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Note updated successfully',
      data: updatedNote,
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
