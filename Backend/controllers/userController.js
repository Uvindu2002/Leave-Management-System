import * as userService from '../services/userService.js';
import jwt from 'jsonwebtoken';

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
        role: req.user.role, // ✅ Using role from users table
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
      role: user.role, // ✅ Using role from users table
      manager_id: user.manager_id,
      employment_type: user.employment_type, // ✅ From employee_details
      confirmation_date: user.confirmation_date, // ✅ From employee_details
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
    
    // Check if user is admin (using role from users table)
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