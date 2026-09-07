"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteNotes = exports.emptyTrash = exports.deleteNote = exports.updateNote = exports.createNote = exports.getNoteById = exports.getNotes = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Note_1 = require("../models/Note");
// GET /api/notes
const getNotes = async (req, res) => {
    try {
        const { filter, search, label, userId } = req.query;
        const query = {};
        if (userId && typeof userId === 'string') {
            query.userId = userId;
        }
        if (filter === 'archive') {
            query.isArchived = true;
            query.isTrashed = false;
        }
        else if (filter === 'trash') {
            query.isTrashed = true;
        }
        else if (filter === 'checklist') {
            query.isArchived = false;
            query.isTrashed = false;
            query.$or = [{ noteType: 'checklist' }, { 'checklist.0': { $exists: true } }];
        }
        else if (filter === 'important') {
            query.isArchived = false;
            query.isTrashed = false;
            query.isImportant = true;
        }
        else if (filter === 'image') {
            query.isArchived = false;
            query.isTrashed = false;
            query.$or = [{ noteType: 'image' }, { 'images.0': { $exists: true } }];
        }
        else if (filter === 'voice') {
            query.isArchived = false;
            query.isTrashed = false;
            query.$or = [{ noteType: 'voice' }, { audioUrl: { $ne: null } }];
        }
        else {
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
        const notes = await Note_1.Note.find(query).sort({ isPinned: -1, isImportant: -1, updatedAt: -1 });
        res.status(200).json({
            success: true,
            count: notes.length,
            data: notes,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notes',
            error: error.message,
        });
    }
};
exports.getNotes = getNotes;
// GET /api/notes/:id
const getNoteById = async (req, res) => {
    try {
        const { id } = req.params;
        const note = await Note_1.Note.findById(id);
        if (!note) {
            res.status(404).json({ success: false, message: 'Note not found' });
            return;
        }
        res.status(200).json({ success: true, data: note });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch note',
            error: error.message,
        });
    }
};
exports.getNoteById = getNoteById;
// POST /api/notes
const createNote = async (req, res) => {
    try {
        const { title, content, color, isPinned, isImportant, isArchived, labels, checklist, noteType, images, audioUrl, reminder, userId, } = req.body;
        const note = await Note_1.Note.create({
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
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to create note',
            error: error.message,
        });
    }
};
exports.createNote = createNote;
// PATCH /api/notes/:id
const updateNote = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedNote = await Note_1.Note.findByIdAndUpdate(id, req.body, {
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
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update note',
            error: error.message,
        });
    }
};
exports.updateNote = updateNote;
// DELETE /api/notes/:id
const deleteNote = async (req, res) => {
    try {
        const { id } = req.params;
        const note = await Note_1.Note.findByIdAndDelete(id);
        if (!note) {
            res.status(404).json({ success: false, message: 'Note not found' });
            return;
        }
        res.status(200).json({
            success: true,
            message: 'Note permanently deleted',
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete note',
            error: error.message,
        });
    }
};
exports.deleteNote = deleteNote;
// DELETE /api/notes/trash/empty
const emptyTrash = async (req, res) => {
    try {
        const { userId } = req.query;
        const query = { isTrashed: true };
        if (userId && typeof userId === 'string') {
            query.userId = userId;
        }
        const result = await Note_1.Note.deleteMany(query);
        res.status(200).json({
            success: true,
            message: 'Trash emptied successfully',
            deletedCount: result.deletedCount,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to empty trash',
            error: error.message,
        });
    }
};
exports.emptyTrash = emptyTrash;
// DELETE /api/notes (Batch delete or empty trash via query params)
const deleteNotes = async (req, res) => {
    try {
        const { action, userId } = req.query;
        if (action === 'empty-trash') {
            const query = { isTrashed: true };
            if (userId && typeof userId === 'string') {
                query.userId = userId;
            }
            const result = await Note_1.Note.deleteMany(query);
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
                .filter((id) => mongoose_1.default.isValidObjectId(id))
                .map((id) => new mongoose_1.default.Types.ObjectId(id));
            const query = {
                $or: [{ _id: { $in: objectIds } }, { id: { $in: ids } }],
            };
            if (userId && typeof userId === 'string') {
                query.userId = userId;
            }
            const result = await Note_1.Note.deleteMany(query);
            res.status(200).json({
                success: true,
                message: `${result.deletedCount} notes deleted`,
                deletedCount: result.deletedCount,
            });
            return;
        }
        res.status(400).json({ success: false, message: 'Invalid delete request' });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete notes',
            error: error.message,
        });
    }
};
exports.deleteNotes = deleteNotes;
