import jwt from 'jsonwebtoken';

export const protect = (req, res, next) => {
  console.log('Auth middleware called');
  console.log('Authorization header:', req.headers.authorization);
  
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('No valid authorization header');
    return res.status(401).json({ message: 'Not authorized' });
  }

  try {
    const token = authHeader.split(' ')[1];
    console.log('Token received:', token.substring(0, 20) + '...'); // Log first 20 chars
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded);
    
    req.user = decoded; // { userId, employeeId, role, activeRole }
    next();
  } catch (error) {
    console.log('Token verification failed:', error.message);
    res.status(401).json({ message: 'Token invalid or expired' });
  }
};