"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const noteController_1 = require("../controllers/noteController");
const router = (0, express_1.Router)();
router.route('/')
    .get(noteController_1.getNotes)
    .post(noteController_1.createNote)
    .delete(noteController_1.deleteNotes);
router.delete('/trash/empty', noteController_1.emptyTrash);
router.route('/:id')
    .get(noteController_1.getNoteById)
    .patch(noteController_1.updateNote)
    .delete(noteController_1.deleteNote);
exports.default = router;
