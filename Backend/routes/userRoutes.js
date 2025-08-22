import express from 'express';
import { 
  registerUser, 
  loginUser, 
  switchRole, 
  getManagers, 
  getMe, 
  getAllUsers 
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/login', loginUser);

// Protected routes (all require authentication)
router.post('/register', protect, registerUser);
router.post('/switch-role', protect, switchRole);
router.get('/managers', protect, getManagers);
router.get('/me', protect, getMe);
router.get('/all', protect, getAllUsers);

export default router;