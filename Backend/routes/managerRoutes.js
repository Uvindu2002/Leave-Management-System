import express from 'express';
import { 
  getManagerTeam,
  getManagerLeaves,
  getEmployeeDetails,
  reviewLeave,
  getTeamStats,
  getPendingApprovals,
  getTeamLeaveCalendar
} from '../controllers/managerController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requireManager } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes are protected and require manager role
router.use(protect);
router.use(requireManager);

// Team management
router.get('/team', getManagerTeam);
router.get('/team/stats', getTeamStats);
router.get('/team/employee/:employeeId', getEmployeeDetails);

// Leave management
router.get('/leaves', getManagerLeaves);
router.get('/leaves/pending', getPendingApprovals);
router.get('/leaves/calendar', getTeamLeaveCalendar);
router.post('/leaves/:leaveId/review', reviewLeave);

export default router;