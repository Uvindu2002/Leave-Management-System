import * as managerService from '../services/managerService.js';

export const getManagerTeam = async (req, res) => {
  try {
    const teamMembers = await managerService.getManagerTeam(req.user.userId);
    res.json({ members: teamMembers });
  } catch (error) {
    console.error('Get manager team error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch team members' });
  }
};

export const getManagerLeaves = async (req, res) => {
  try {
    const leaves = await managerService.getManagerLeaves(req.user.userId);
    res.json({ leaves });
  } catch (error) {
    console.error('Get manager leaves error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch team leaves' });
  }
};

export const getEmployeeDetails = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const employeeDetails = await managerService.getEmployeeDetails(parseInt(employeeId), req.user.userId);
    res.json(employeeDetails);
  } catch (error) {
    console.error('Get employee details error:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      message: error.message || 'Failed to fetch employee details' 
    });
  }
};

export const reviewLeave = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { action, comments } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Action must be either "approve" or "reject"' });
    }

    const reviewedLeave = await managerService.reviewLeave(
      parseInt(leaveId), 
      req.user.userId, 
      action === 'approve' ? 'approved' : 'rejected',
      comments
    );

    res.json({ 
      message: `Leave ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      leave: reviewedLeave 
    });
  } catch (error) {
    console.error('Review leave error:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      message: error.message || 'Failed to review leave' 
    });
  }
};

export const getTeamStats = async (req, res) => {
  try {
    const stats = await managerService.getTeamLeaveStats(req.user.userId);
    res.json(stats);
  } catch (error) {
    console.error('Get team stats error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch team statistics' });
  }
};

export const getPendingApprovals = async (req, res) => {
  try {
    const leaves = await managerService.getManagerLeaves(req.user.userId);
    const pendingLeaves = leaves.filter(leave => leave.status === 'pending');
    res.json({ leaves: pendingLeaves, count: pendingLeaves.length });
  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch pending approvals' });
  }
};

export const getTeamLeaveCalendar = async (req, res) => {
  try {
    const leaves = await managerService.getManagerLeaves(req.user.userId);
    
    const calendarEvents = leaves.map(leave => {
      const startDate = new Date(leave.start_date);
      const endDate = new Date(leave.end_date);
      
      const isSingleDay = startDate.toDateString() === endDate.toDateString();
      const calendarEndDate = isSingleDay ? startDate : endDate;
      
      return {
        id: leave.id,
        title: `${leave.employee_name} - ${leave.leave_type}`,
        start: startDate,
        end: calendarEndDate,
        allDay: true,
        resource: {
          ...leave,
          isSingleDay: isSingleDay
        }
      };
    });

    res.json(calendarEvents);
  } catch (error) {
    console.error('Get team calendar error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch team calendar' });
  }
};