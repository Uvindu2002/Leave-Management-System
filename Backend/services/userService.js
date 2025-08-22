import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import sql from '../db.js';

export const createUser = async ({ employee_id, name, email, password, role, manager_id }) => {
  const hashedPassword = await bcrypt.hash(password, 10);

  const [user] = await sql`
    INSERT INTO users (employee_id, name, email, password_hash, role, manager_id)
    VALUES (${employee_id}, ${name}, ${email}, ${hashedPassword}, ${role}, ${manager_id || null})
    RETURNING id, employee_id, name, email, role, manager_id, created_at
  `;

  return user;
};

export const loginUser = async (email, password) => {
  const [user] = await sql`SELECT * FROM users WHERE email = ${email}`;

  if (!user) throw new Error('Invalid email or password');

  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) throw new Error('Invalid email or password');

  // Include activeRole in the JWT token (initially same as role)
  const token = jwt.sign(
    { 
      userId: user.id, 
      employeeId: user.employee_id, 
      role: user.role,
      activeRole: user.role // Add activeRole to token payload
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  return { 
    token, 
    user: { 
      id: user.id, 
      employee_id: user.employee_id, 
      name: user.name, 
      email: user.email, 
      role: user.role,
      manager_id: user.manager_id,
      activeRole: user.role // Also include in user response
    } 
  };
};

export const getManagers = async () => {
  return await sql`
    SELECT id, name, employee_id, email 
    FROM users 
    WHERE role = 'manager'
  `;
};

// Add this new function to get user by ID
export const getUserById = async (userId) => {
  const [user] = await sql`
    SELECT id, employee_id, name, email, role, manager_id 
    FROM users 
    WHERE id = ${userId}
  `;

  if (!user) throw new Error('User not found');

  return user;
};

// Add this function for role switching validation
export const canSwitchToRole = (originalRole, targetRole) => {
  if (targetRole === originalRole) return true;
  if (originalRole === "admin" && targetRole === "employee") return true;
  if (originalRole === "manager" && targetRole === "employee") return true;
  return false;
};

// Add this function to validate role switching
export const validateRoleSwitch = (currentUser, targetRole) => {
  if (!canSwitchToRole(currentUser.role, targetRole)) {
    throw new Error('Role switch not allowed');
  }
  return targetRole;
};