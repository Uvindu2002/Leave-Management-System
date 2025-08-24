import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import sql from '../db.js';

export const createUser = async (userData) => {
  const {
    employee_id,
    name,
    email,
    password,
    role,
    manager_id,
    employment_type,
    confirmation_date
  } = userData;

  console.log('Creating user:', { employee_id, name, email, role });

  // Check if employee_id already exists
  const [existingEmployee] = await sql`
    SELECT id FROM users WHERE employee_id = ${employee_id}
  `;
  if (existingEmployee) {
    throw new Error('Employee ID already exists');
  }

  // Check if email already exists
  const [existingEmail] = await sql`
    SELECT id FROM users WHERE email = ${email}
  `;
  if (existingEmail) {
    throw new Error('Email already exists');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    // Start transaction
    const user = await sql.begin(async (sql) => {
      // Insert user
      const [newUser] = await sql`
        INSERT INTO users (employee_id, name, email, password_hash, role, manager_id)
        VALUES (${employee_id}, ${name}, ${email}, ${hashedPassword}, ${role}, ${manager_id || null})
        RETURNING id, employee_id, name, email, role, manager_id, created_at
      `;

      // Insert employee details
      await sql`
        INSERT INTO employee_details (user_id, employment_type, confirmation_date)
        VALUES (${newUser.id}, ${employment_type}, ${confirmation_date || null})
      `;

      // Initialize leave entitlements for current year
      const currentYear = new Date().getFullYear();
      await initializeLeaveEntitlements(sql, newUser.id, currentYear, employment_type, confirmation_date);

      return newUser;
    });

    console.log('User created successfully:', user.id);
    return user;
  } catch (error) {
    console.error('Error creating user:', error);
    throw new Error('Failed to create user: ' + error.message);
  }
};

const initializeLeaveEntitlements = async (sql, userId, year, employmentType, confirmationDate) => {
  let annualEntitlement = 0;
  let casualEntitlement = 0;

  if (employmentType === 'confirmed' && confirmationDate) {
    // Calculate annual leave based on confirmation date quarter
    const quarter = Math.floor((new Date(confirmationDate).getMonth() + 3) / 3);
    annualEntitlement = [14, 10, 7, 4][quarter - 1] || 0;
    casualEntitlement = 7;
  } else if (employmentType === 'probation') {
    // Probation: 1 day casual leave per completed month
    casualEntitlement = 1;
  }

  // Insert leave entitlements within the same transaction
  await sql`
    INSERT INTO leave_entitlements (
      user_id, year, annual_leave_entitled, annual_leave_remaining,
      casual_leave_entitled, casual_leave_remaining,
      maternity_leave_entitled, paternity_leave_entitled, birthday_leave_entitled
    ) VALUES (
      ${userId}, ${year}, ${annualEntitlement}, ${annualEntitlement},
      ${casualEntitlement}, ${casualEntitlement},
      0, 0, 1
    )
  `;

  console.log('Leave entitlements initialized for user:', userId);
};

export const loginUser = async (email, password) => {
  console.log('Login attempt for email:', email);

  const [user] = await sql`
    SELECT u.*, ed.employment_type, ed.confirmation_date 
    FROM users u
    LEFT JOIN employee_details ed ON u.id = ed.user_id
    WHERE u.email = ${email}
  `;

  if (!user) {
    console.log('Login failed: User not found');
    throw new Error('Invalid email or password');
  }

  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) {
    console.log('Login failed: Invalid password');
    throw new Error('Invalid email or password');
  }

  const token = jwt.sign(
    { 
      userId: user.id, 
      employeeId: user.employee_id, 
      role: user.role,
      activeRole: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  console.log('Login successful for user:', user.id);
  
  return { 
    token, 
    user: { 
      id: user.id, 
      employee_id: user.employee_id, 
      name: user.name, 
      email: user.email, 
      role: user.role,
      manager_id: user.manager_id,
      employment_type: user.employment_type,
      confirmation_date: user.confirmation_date,
      activeRole: user.role
    } 
  };
};

export const getManagers = async () => {
  console.log('Fetching managers list');
  
  const managers = await sql`
    SELECT id, name, employee_id, email, role
    FROM users 
    WHERE role = 'manager'
    ORDER BY name
  `;

  console.log('Managers found:', managers.length);
  return managers;
};

export const getUserById = async (userId) => {
  console.log('Fetching user by ID:', userId);
  
  const [user] = await sql`
    SELECT u.*, ed.employment_type, ed.confirmation_date 
    FROM users u
    LEFT JOIN employee_details ed ON u.id = ed.user_id
    WHERE u.id = ${userId}
  `;

  if (!user) {
    console.log('User not found:', userId);
    throw new Error('User not found');
  }

  console.log('User found:', user.id);
  return user;
};

export const canSwitchToRole = (originalRole, targetRole) => {
  console.log('Checking role switch:', { originalRole, targetRole });
  
  if (targetRole === originalRole) return true;
  if (originalRole === "admin" && targetRole === "employee") return true;
  if (originalRole === "manager" && targetRole === "employee") return true;
  
  console.log('Role switch not allowed');
  return false;
};

// Add this function for role switching validation
export const validateRoleSwitch = (currentUser, targetRole) => {
  console.log('Validating role switch:', { currentUser: currentUser.role, targetRole });
  
  if (!canSwitchToRole(currentUser.role, targetRole)) {
    throw new Error('Role switch not allowed');
  }
  return targetRole;
};

export const getAllUsers = async () => {
  console.log('Fetching all users');
  
  const users = await sql`
    SELECT u.id, u.employee_id, u.name, u.email, u.role, u.manager_id, 
           u.created_at, ed.employment_type, ed.confirmation_date,
           m.name as manager_name
    FROM users u
    LEFT JOIN employee_details ed ON u.id = ed.user_id
    LEFT JOIN users m ON u.manager_id = m.id
    ORDER BY u.name
  `;

  console.log('Total users found:', users.length);
  return users;
};

// Add this function to get user details with leave information
export const getUserDetails = async (userId) => {
  console.log('Fetching user details for ID:', userId);
  
  try {
    // Get user basic info
    const [user] = await sql`
      SELECT u.*, ed.employment_type, ed.confirmation_date, m.name as manager_name
      FROM users u
      LEFT JOIN employee_details ed ON u.id = ed.user_id
      LEFT JOIN users m ON u.manager_id = m.id
      WHERE u.id = ${userId}
    `;

    if (!user) {
      throw new Error('User not found');
    }

    // Get leave entitlements
    const currentYear = new Date().getFullYear();
    const [leaveEntitlements] = await sql`
      SELECT * FROM leave_entitlements 
      WHERE user_id = ${userId} AND year = ${currentYear}
    `;

    // Get recent leaves (last 10)
    const recentLeaves = await sql`
      SELECT * FROM leaves 
      WHERE user_id = ${userId} 
      ORDER BY created_at DESC 
      LIMIT 10
    `;

    // Get leave statistics
    const [leaveStats] = await sql`
      SELECT COUNT(*) as total_leaves, SUM(total_days) as total_days
      FROM leaves 
      WHERE user_id = ${userId} AND status = 'approved'
    `;

    return {
      user,
      leave_entitlements: leaveEntitlements || {},
      recent_leaves: recentLeaves || [],
      leave_stats: leaveStats || { total_leaves: 0, total_days: 0 }
    };
  } catch (error) {
    console.error('Error fetching user details:', error);
    throw error;
  }
};

// Add this function to update user
export const updateUser = async (userId, updateData) => {
  console.log('Updating user ID:', userId);
  
  try {
    const { name, email, role, employment_type, manager_id } = updateData;

    // Check if email already exists (excluding current user)
    const [existingEmail] = await sql`
      SELECT id FROM users WHERE email = ${email} AND id != ${userId}
    `;
    if (existingEmail) {
      throw new Error('Email already exists');
    }

    const [updatedUser] = await sql`
      UPDATE users 
      SET name = ${name}, email = ${email}, role = ${role}, manager_id = ${manager_id || null}
      WHERE id = ${userId}
      RETURNING *
    `;

    // Update employee details if provided
    if (employment_type) {
      await sql`
        UPDATE employee_details 
        SET employment_type = ${employment_type}
        WHERE user_id = ${userId}
      `;
    }

    return updatedUser;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

// Add this function to delete user
export const deleteUser = async (userId) => {
  console.log('Deleting user ID:', userId);
  
  try {
    // Use transaction to ensure all user data is deleted
    await sql.begin(async sql => {
      // Delete from all related tables
      await sql`DELETE FROM leaves WHERE user_id = ${userId}`;
      await sql`DELETE FROM leave_entitlements WHERE user_id = ${userId}`;
      await sql`DELETE FROM employee_details WHERE user_id = ${userId}`;
      await sql`DELETE FROM users WHERE id = ${userId}`;
    });

    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

// Add this function to get user calendar data
export const getUserCalendar = async (userId, year, month) => {
  console.log('Fetching calendar for user ID:', userId, 'Year:', year, 'Month:', month);
  
  try {
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
      WHERE user_id = ${userId}
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
    
    return events;
  } catch (error) {
    console.error('Error fetching user calendar:', error);
    throw error;
  }
};

// Add this function to get user full details
export const getUserFullDetails = async (userId) => {
  console.log('Fetching full details for user ID:', userId);
  
  try {
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
      WHERE u.id = ${userId}
    `;

    if (!user) {
      throw new Error('User not found');
    }

    // Get leave entitlements for current year
    const currentYear = new Date().getFullYear();
    const [leaveEntitlements] = await sql`
      SELECT * FROM leave_entitlements 
      WHERE user_id = ${userId} AND year = ${currentYear}
    `;

    // Get all leaves (for calendar)
    const allLeaves = await sql`
      SELECT * FROM leaves 
      WHERE user_id = ${userId} 
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
      WHERE user_id = ${userId}
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

    return {
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
    };
  } catch (error) {
    console.error('Error fetching user full details:', error);
    throw error;
  }
};