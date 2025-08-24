import express from 'express';
import { 
  registerUser, 
  loginUser, 
  switchRole, 
  getManagers, 
  getMe, 
  getAllUsers,
  deleteUser,
  updateUser,
  getUserDetails,
  getUserFullDetails,
  getUserCalendar,
  getUserLeaves
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
router.get('/:id/details', protect, getUserDetails);
router.get('/:id/full-details', protect, getUserFullDetails);
router.get('/:id/calendar', protect, getUserCalendar);
router.put('/:id', protect, updateUser);
router.delete('/:id', protect, deleteUser);
router.get('/:id/leaves', protect, getUserLeaves);

export default router;