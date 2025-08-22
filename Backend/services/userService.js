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