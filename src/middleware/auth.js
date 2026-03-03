const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Middleware to verify JWT token from HttpOnly cookie
 */
const authenticate = async (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    res.status(500).json({ error: 'Authentication error' });
  }
};

/**
 * Middleware to check if user has required role
 * Supports multiple roles: authorize('ADMIN', 'SUPERVISOR')
 * 
 * Fix: Explicitly handles variable number of allowed roles using rest parameters
 * Added debug logging to diagnose permission issues
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Debug: Log role check for troubleshooting
    console.log(`[AUTHORIZE] User role: ${req.user.role}, Allowed roles: [${allowedRoles.join(', ')}]`);

    // Check if user's role is in the allowed roles array
    // allowedRoles is an array created from rest parameters: ['ADMIN', 'SUPERVISOR']
    // Ensure exact string match (case-sensitive as per Prisma enum)
    if (!allowedRoles.includes(req.user.role)) {
      console.log(`[AUTHORIZE] Access denied for role: ${req.user.role}`);
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        details: `Required roles: ${allowedRoles.join(' or ')}, User role: ${req.user.role}`
      });
    }

    console.log(`[AUTHORIZE] Access granted for role: ${req.user.role}`);
    next();
  };
};

module.exports = { authenticate, authorize };

