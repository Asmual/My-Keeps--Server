import { Router } from 'express';
import { getUserProfile, updateUserProfile } from '../controllers/userController';

const router = Router();

router.route('/profile')
  .get(getUserProfile)
  .patch(updateUserProfile);

export default router;
