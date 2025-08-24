import * as userService from '../services/userService.js';
import jwt from 'jsonwebtoken';
import sql from '../db.js'; // ✅ Add missing import

export const registerUser = async (req, res) => {
  try {
    console.log('User registration request by:', req.user.userId);
    
    // Check if user is admin (using role from users table)
    if (req.user.role !== 'admin') {
      console.log('Registration failed: User is not admin');
      return res.status(403).json({ message: 'Only administrators can create users' });
    }

    const user = await userService.createUser(req.body);
    
    res.status(201).json({ 
      message: 'User created successfully',
      user 
    });
  } catch (error) {
    console.error('User registration error:', error.message);
    res.status(400).json({ message: error.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    console.log('Login request for email:', req.body.email);
    
    const { email, password } = req.body;
    const data = await userService.loginUser(email, password);
    
    res.json(data);
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(401).json({ message: error.message });
  }
};

export const switchRole = async (req, res) => {
  try {
    console.log('Role switch request by user:', req.user.userId);
    
    const { targetRole } = req.body;
    
    // Validate the role switch (using role from users table)
    if (!userService.canSwitchToRole(req.user.role, targetRole)) {
      console.log('Role switch not allowed');
      return res.status(403).json({ message: 'Role switch not allowed' });
    }

    // Generate new token with updated activeRole
    const token = jwt.sign(
      { 
        userId: req.user.userId, 
        employeeId: req.user.employeeId, 
        role: req.user.role,
        activeRole: targetRole 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('Role switch successful to:', targetRole);
    
    res.json({ 
      token, 
      activeRole: targetRole,
      message: `Role switched to ${targetRole} successfully`
    });
  } catch (error) {
    console.error('Switch role error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

export const getManagers = async (req, res) => {
  try {
    console.log('Get managers request by user:', req.user.userId);
    
    const managers = await userService.getManagers();
    res.json(managers);
  } catch (error) {
    console.error('Get managers error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

export const getMe = async (req, res) => {
  try {
    console.log('Get me request by user:', req.user.userId);
    
    const user = await userService.getUserById(req.user.userId);
    
    res.json({
      id: user.id,
      employee_id: user.employee_id,
      name: user.name,
      email: user.email,
      role: user.role,
      manager_id: user.manager_id,
      employment_type: user.employment_type,
      confirmation_date: user.confirmation_date,
      activeRole: req.user.activeRole || user.role
    });
  } catch (error) {
    console.error('getMe error:', error.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    console.log('Get all users request by user:', req.user.userId);
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      console.log('Access denied: User is not admin');
      return res.status(403).json({ message: 'Access denied' });
    }

    const users = await userService.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Get all users error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// Get user details with leave information
export const getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get user basic info
    const [user] = await sql`
      SELECT u.*, ed.employment_type, ed.confirmation_date, m.name as manager_name
      FROM users u
      LEFT JOIN employee_details ed ON u.id = ed.user_id
      LEFT JOIN users m ON u.manager_id = m.id
      WHERE u.id = ${id}
    `;

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get leave entitlements
    const currentYear = new Date().getFullYear();
    const [leaveEntitlements] = await sql`
      SELECT * FROM leave_entitlements 
      WHERE user_id = ${id} AND year = ${currentYear}
    `;

    // Get recent leaves (last 10)
    const recentLeaves = await sql`
      SELECT * FROM leaves 
      WHERE user_id = ${id} 
      ORDER BY created_at DESC 
      LIMIT 10
    `;

    // Get leave statistics
    const [leaveStats] = await sql`
      SELECT COUNT(*) as total_leaves, SUM(total_days) as total_days
      FROM leaves 
      WHERE user_id = ${id} AND status = 'approved'
    `;

    res.json({
      user,
      leave_entitlements: leaveEntitlements || {},
      recent_leaves: recentLeaves || [],
      leave_stats: leaveStats || { total_leaves: 0, total_days: 0 }
    });

  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update user
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, employment_type, manager_id } = req.body;

    // Check if email already exists (excluding current user)
    const [existingEmail] = await sql`
      SELECT id FROM users WHERE email = ${email} AND id != ${id}
    `;
    if (existingEmail) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const [updatedUser] = await sql`
      UPDATE users 
      SET name = ${name}, email = ${email}, role = ${role}, manager_id = ${manager_id || null}
      WHERE id = ${id}
      RETURNING *
    `;

    // Update employee details if provided
    if (employment_type) {
      await sql`
        UPDATE employee_details 
        SET employment_type = ${employment_type}
        WHERE user_id = ${id}
      `;
    }

    res.json({ 
      message: 'User updated successfully',
      user: updatedUser 
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prevent self-deletion
    if (parseInt(id) === req.user.userId) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    // Use transaction to ensure all user data is deleted
    await sql.begin(async sql => {
      // Delete from all related tables
      await sql`DELETE FROM leaves WHERE user_id = ${id}`;
      await sql`DELETE FROM leave_entitlements WHERE user_id = ${id}`;
      await sql`DELETE FROM employee_details WHERE user_id = ${id}`;
      await sql`DELETE FROM users WHERE id = ${id}`;
    });

    res.json({ message: 'User deleted successfully' });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getUserCalendar = async (req, res) => {
  try {
    const { id } = req.params;
    const { year, month } = req.query;
    
    let query = sql`
      SELECT 
        id, 
        leave_type,
        start_date,
        end_date,
        status,
        total_days,
        created_at
      FROM leaves 
      WHERE user_id = ${id}
    `;
    
    if (year) {
      query = sql`${query} AND EXTRACT(YEAR FROM start_date) = ${year}`;
    }
    
    if (month) {
      query = sql`${query} AND EXTRACT(MONTH FROM start_date) = ${month}`;
    }
    
    query = sql`${query} ORDER BY start_date`;
    
    const leaves = await query;
    
    // Format for calendar
    const events = leaves.map(leave => ({
      id: leave.id,
      title: `${leave.leave_type} (${leave.status})`,
      start: new Date(leave.start_date),
      end: new Date(new Date(leave.end_date).setDate(new Date(leave.end_date).getDate() + 1)),
      allDay: true,
      extendedProps: {
        type: leave.leave_type,
        status: leave.status,
        days: leave.total_days
      }
    }));
    
    res.json(events);
  } catch (error) {
    console.error('Get user calendar error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user details with comprehensive information
export const getUserFullDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get user basic info with manager details
    const [user] = await sql`
      SELECT 
        u.*, 
        ed.employment_type, 
        ed.confirmation_date,
        ed.probation_start_date,
        ed.probation_end_date,
        m.name as manager_name,
        m.email as manager_email
      FROM users u
      LEFT JOIN employee_details ed ON u.id = ed.user_id
      LEFT JOIN users m ON u.manager_id = m.id
      WHERE u.id = ${id}
    `;

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get leave entitlements for current year
    const currentYear = new Date().getFullYear();
    const [leaveEntitlements] = await sql`
      SELECT * FROM leave_entitlements 
      WHERE user_id = ${id} AND year = ${currentYear}
    `;

    // Get all leaves (for calendar)
    const allLeaves = await sql`
      SELECT * FROM leaves 
      WHERE user_id = ${id} 
      ORDER BY created_at DESC
    `;

    // Get leave statistics
    const [leaveStats] = await sql`
      SELECT 
        COUNT(*) as total_leaves, 
        SUM(total_days) as total_days,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_leaves,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_leaves,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_leaves
      FROM leaves 
      WHERE user_id = ${id}
    `;

    // Get employment duration
    let employmentDuration = null;
    if (user.confirmation_date) {
      const startDate = new Date(user.confirmation_date);
      const today = new Date();
      const diffTime = Math.abs(today - startDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      employmentDuration = {
        days: diffDays,
        months: Math.floor(diffDays / 30),
        years: Math.floor(diffDays / 365)
      };
    }

    res.json({
      user,
      leave_entitlements: leaveEntitlements || {},
      leaves: allLeaves || [],
      leave_stats: leaveStats || { 
        total_leaves: 0, 
        total_days: 0,
        approved_leaves: 0,
        pending_leaves: 0,
        rejected_leaves: 0
      },
      employment_duration: employmentDuration
    });

  } catch (error) {
    console.error('Get user full details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add this controller function
export const getUserLeaves = async (req, res) => {
  try {
    const { id } = req.params;
    
    const leaves = await sql`
      SELECT 
        id, 
        leave_type,
        start_date,
        end_date,
        status,
        total_days,
        created_at
      FROM leaves 
      WHERE user_id = ${id}
      ORDER BY start_date DESC
    `;
    
    res.json(leaves);
  } catch (error) {
    console.error('Get user leaves error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};