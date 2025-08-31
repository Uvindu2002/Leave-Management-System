import express from 'express';
import { applyForLeave, getLeaveBalance, getAllLeaves, accrueMonthlyLeaves } from '../controllers/leaveController.js';
import { protect, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protected routes
router.post('/apply', protect, applyForLeave);
router.get('/balance', protect, getLeaveBalance);
router.get('/all', protect, requireAdmin, getAllLeaves);

// Admin route for manual accrual trigger
router.post('/accrue-leaves', protect, requireAdmin, accrueMonthlyLeaves);

export default router;