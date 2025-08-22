import express from 'express';
import { registerUser, loginUser, switchRole, getManagers, getMe} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Admin creates users
router.post('/register', registerUser);

// Login
router.post('/login', loginUser);

// Role switch (admin/manager → employee)
router.post('/switch-role', protect, switchRole);

router.get("/managers", getManagers);

router.get("/me", protect, getMe);


export default router;
