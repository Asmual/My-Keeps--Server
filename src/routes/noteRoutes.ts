import { Router } from 'express';
import {
  getNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
  deleteNotes,
  emptyTrash,
} from '../controllers/noteController';

const router = Router();

router.route('/')
  .get(getNotes)
  .post(createNote)
  .delete(deleteNotes);

router.delete('/trash/empty', emptyTrash);

router.route('/:id')
  .get(getNoteById)
  .patch(updateNote)
  .delete(deleteNote);

export default router;
