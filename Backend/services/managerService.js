import sql from '../db.js';

export const getManagerTeam = async (managerId) => {
  try {
    const teamMembers = await sql`
      SELECT 
        u.id,
        u.employee_id,
        u.name,
        u.email,
        u.role,
        ed.employment_type,
        ed.confirmation_date,
        COUNT(l.id) as total_leaves,
        SUM(CASE WHEN l.status = 'approved' THEN l.total_days ELSE 0 END) as approved_days
      FROM users u
      LEFT JOIN employee_details ed ON u.id = ed.user_id
      LEFT JOIN leaves l ON u.id = l.user_id
      WHERE u.manager_id = ${managerId} OR u.id = ${managerId}
      GROUP BY u.id, u.employee_id, u.name, u.email, u.role, ed.employment_type, ed.confirmation_date
      ORDER BY u.name
    `;

    return teamMembers;
  } catch (error) {
    console.error('Error fetching manager team:', error);
    throw new Error('Failed to fetch team members');
  }
};

export const getManagerLeaves = async (managerId) => {
  try {
    const leaves = await sql`
      SELECT 
        l.*,
        u.name as employee_name,
        u.employee_id,
        u.email as employee_email,
        m.name as manager_name
      FROM leaves l
      JOIN users u ON l.user_id = u.id
      LEFT JOIN users m ON u.manager_id = m.id
      WHERE u.manager_id = ${managerId} OR l.manager_id = ${managerId}
      ORDER BY l.created_at DESC
    `;

    return leaves;
  } catch (error) {
    console.error('Error fetching manager leaves:', error);
    throw new Error('Failed to fetch team leaves');
  }
};

export const getEmployeeDetails = async (employeeId, managerId) => {
  try {
    // Verify the employee is managed by this manager
    const [employee] = await sql`
      SELECT u.*, ed.* 
      FROM users u
      LEFT JOIN employee_details ed ON u.id = ed.user_id
      WHERE u.id = ${employeeId} AND (u.manager_id = ${managerId} OR u.id = ${managerId})
    `;

    if (!employee) {
      throw new Error('Employee not found or access denied');
    }

    // Get leave statistics
    const [leaveStats] = await sql`
      SELECT 
        COUNT(*) as total_leaves,
        SUM(total_days) as total_days,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_leaves,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_leaves,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_leaves,
        SUM(CASE WHEN status = 'approved' THEN total_days ELSE 0 END) as approved_days,
        SUM(CASE WHEN status = 'pending' THEN total_days ELSE 0 END) as pending_days,
        SUM(CASE WHEN status = 'rejected' THEN total_days ELSE 0 END) as rejected_days
      FROM leaves 
      WHERE user_id = ${employeeId}
    `;

    // Get current year leave entitlements
    const currentYear = new Date().getFullYear();
    const [entitlements] = await sql`
      SELECT * FROM leave_entitlements 
      WHERE user_id = ${employeeId} AND year = ${currentYear}
    `;

    // Get recent leaves
    const recentLeaves = await sql`
      SELECT * FROM leaves 
      WHERE user_id = ${employeeId} 
      ORDER BY created_at DESC 
      LIMIT 10
    `;

    return {
      employee,
      leaveStats: leaveStats || {
        total_leaves: 0,
        total_days: 0,
        approved_leaves: 0,
        pending_leaves: 0,
        rejected_leaves: 0,
        approved_days: 0,
        pending_days: 0,
        rejected_days: 0
      },
      entitlements: entitlements || {},
      recentLeaves: recentLeaves || []
    };
  } catch (error) {
    console.error('Error fetching employee details:', error);
    throw error;
  }
};

export const reviewLeave = async (leaveId, managerId, action, comments = '') => {
  try {
    // Verify the manager has permission to review this leave
    const [leave] = await sql`
      SELECT l.*, u.manager_id 
      FROM leaves l
      JOIN users u ON l.user_id = u.id
      WHERE l.id = ${leaveId} AND (u.manager_id = ${managerId} OR l.manager_id = ${managerId})
    `;

    if (!leave) {
      throw new Error('Leave not found or access denied');
    }

    if (leave.status !== 'pending') {
      throw new Error('Leave is not pending review');
    }

    const updateData = {
      status: action,
      approved_by: action === 'approved' ? managerId : null,
      approved_at: action === 'approved' ? new Date() : null,
      rejection_reason: action === 'rejected' ? comments : null,
      reviewed_at: new Date()
    };

    const [updatedLeave] = await sql`
      UPDATE leaves 
      SET ${sql(updateData)}
      WHERE id = ${leaveId}
      RETURNING *
    `;

    // If approved, deduct from leave entitlements
    if (action === 'approved') {
      await updateLeaveEntitlements(leave.user_id, leave.leave_type, leave.total_days);
    }

    return updatedLeave;
  } catch (error) {
    console.error('Error reviewing leave:', error);
    throw error;
  }
};

const updateLeaveEntitlements = async (userId, leaveType, days) => {
  try {
    const currentYear = new Date().getFullYear();
    
    let updateField = '';
    switch (leaveType) {
      case 'annual':
        updateField = 'annual_leave_taken';
        break;
      case 'casual':
        updateField = 'casual_leave_taken';
        break;
      case 'maternity':
        updateField = 'maternity_leave_taken';
        break;
      case 'paternity':
        updateField = 'paternity_leave_taken';
        break;
      case 'birthday':
        updateField = 'birthday_leave_taken';
        break;
      default:
        return; // No deduction for other leave types
    }

    await sql`
      UPDATE leave_entitlements 
      SET 
        ${sql(updateField)} = ${sql(updateField)} + ${days},
        ${updateField.replace('_taken', '_remaining')} = 
          ${updateField.replace('_taken', '_entitled')} - (${sql(updateField)} + ${days})
      WHERE user_id = ${userId} AND year = ${currentYear}
    `;
  } catch (error) {
    console.error('Error updating leave entitlements:', error);
    throw error;
  }
};

export const getTeamLeaveStats = async (managerId) => {
  try {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const [stats] = await sql`
      SELECT 
        COUNT(DISTINCT u.id) as total_team_members,
        COUNT(CASE WHEN l.status = 'pending' THEN 1 END) as pending_approvals,
        COUNT(CASE WHEN l.status = 'approved' AND EXTRACT(MONTH FROM l.start_date) = ${currentMonth} AND EXTRACT(YEAR FROM l.start_date) = ${currentYear} THEN 1 END) as approved_this_month,
        COUNT(CASE WHEN l.status = 'rejected' AND EXTRACT(MONTH FROM l.start_date) = ${currentMonth} AND EXTRACT(YEAR FROM l.start_date) = ${currentYear} THEN 1 END) as rejected_this_month
      FROM users u
      LEFT JOIN leaves l ON u.id = l.user_id
      WHERE u.manager_id = ${managerId}
    `;

    return stats || {
      total_team_members: 0,
      pending_approvals: 0,
      approved_this_month: 0,
      rejected_this_month: 0
    };
  } catch (error) {
    console.error('Error fetching team stats:', error);
    throw error;
  }
};