import { Router } from 'express';
import {
  getNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
  deleteNotes,
  emptyTrash,
  lockNote,
  unlockNote,
  removeLock,
} from '../controllers/noteController';

const router = Router();

router.route('/')
  .get(getNotes)
  .post(createNote)
  .delete(deleteNotes);

router.delete('/trash/empty', emptyTrash);

router.post('/:id/lock', lockNote);
router.post('/:id/unlock', unlockNote);
router.post('/:id/remove-lock', removeLock);

router.route('/:id')
  .get(getNoteById)
  .patch(updateNote)
  .delete(deleteNote);

export default router;
