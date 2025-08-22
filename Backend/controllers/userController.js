import * as userService from '../services/userService.js';
import jwt from 'jsonwebtoken';

export const registerUser = async (req, res) => {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const data = await userService.loginUser(email, password);
    res.json(data);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

// userController.js - switchRole function
export const switchRole = async (req, res) => {
  try {
    console.log('Switch role request:', req.body);
    console.log('Current user:', req.user);
    
    const { targetRole } = req.body;
    
    // Validate the role switch
    if (!canSwitchToRole(req.user.role, targetRole)) {
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
      { expiresIn: '1h' }
    );

    res.json({ 
      token, 
      activeRole: targetRole
    });
  } catch (error) {
    console.error('Switch role error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getManagers = async (req, res) => {
  try {
    const managers = await userService.getManagers();
    res.json(managers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// userController.js - ensure getMe is properly implemented
export const getMe = async (req, res) => {
  try {
    // req.user should be set by your auth middleware
    console.log('getMe called, user:', req.user);
    
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await userService.getUserById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return user data without sensitive information
    res.json({
      id: user.id,
      employee_id: user.employee_id,
      name: user.name,
      email: user.email,
      role: user.role,
      manager_id: user.manager_id,
      activeRole: user.activeRole || user.role
    });
  } catch (error) {
    console.error('getMe error:', error);
    res.status(500).json({ message: "Server error" });
  }
};