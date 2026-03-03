const express = require('express');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticate);

/**
 * POST /users
 * Create a new user (Admin only)
 */
router.post('/', authorize('ADMIN'), async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Email, password, and role are required' });
    }

    if (!['ADMIN', 'SUPERVISOR', 'USER'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    res.status(201).json({ user });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

/**
 * GET /users
 * Get all users (Admin can see all, Supervisor can see users for task assignment)
 */
router.get('/', authorize('ADMIN', 'SUPERVISOR'), async (req, res) => {
  try {
    let users;
    
    if (req.user.role === 'ADMIN') {
      // Admin can see all users
      users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } else {
      // Supervisor can only see users (for task assignment)
      users = await prisma.user.findMany({
        where: {
          role: 'USER'
        },
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    }

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * PUT /users/:id
 * Update user email and role (Admin only)
 */
router.put('/:id', authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({ error: 'Email and role are required' });
    }

    if (!['ADMIN', 'SUPERVISOR', 'USER'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if email is already taken by another user
    if (email !== existingUser.email) {
      const emailTaken = await prisma.user.findUnique({
        where: { email }
      });

      if (emailTaken) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        email,
        role
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    res.json({ user: updatedUser });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * GET /users/:id/tasks
 * Get active tasks for a specific user (Admin only)
 * Returns tasks with status OPEN, SUBMITTED, or REJECTED, ordered by deadline ascending
 */
router.get('/:id/tasks', authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get active tasks (OPEN, SUBMITTED, or REJECTED) for this user
    const tasks = await prisma.task.findMany({
      where: {
        assignedToId: id,
        status: {
          in: ['OPEN', 'SUBMITTED', 'REJECTED']
        }
      },
      include: {
        assignedBy: {
          select: {
            id: true,
            email: true
          }
        },
        submission: true
      },
      orderBy: {
        deadline: 'asc'
      }
    });

    res.json({ tasks });
  } catch (error) {
    console.error('Get user tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch user tasks' });
  }
});

module.exports = router;

