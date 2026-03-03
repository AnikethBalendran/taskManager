const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const emailService = require('../services/emailService');

const router = express.Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticate);

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'proof-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Helper function to get relative path for storage
const getRelativePath = (filePath) => {
  if (!filePath) return null;
  // Convert absolute path to relative path from project root
  const projectRoot = path.join(__dirname, '../..');
  return path.relative(projectRoot, filePath).replace(/\\/g, '/');
};

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter
});

/**
 * POST /tasks
 * Create a new task (Supervisor or Admin)
 * Admin can assign tasks to SUPERVISOR or USER roles
 * Supervisor can assign tasks to USER role only
 * 
 * Fix: Explicitly allow both ADMIN and SUPERVISOR roles using authorize middleware
 * Added debug logging to verify role is correctly set
 */
router.post('/', authorize('ADMIN', 'SUPERVISOR'), async (req, res) => {
  try {
    // Debug: Log user info for troubleshooting
    console.log(`[POST /tasks] User: ${req.user.email}, Role: ${req.user.role}`);
    
    const { title, description, assignedToId, deadline, requiresProof } = req.body;

    if (!title || !description || !assignedToId || !deadline) {
      return res.status(400).json({ error: 'Title, description, assignedToId, and deadline are required' });
    }

    // Verify assigned user exists
    const assignedUser = await prisma.user.findUnique({
      where: { id: assignedToId }
    });

    if (!assignedUser) {
      return res.status(400).json({ error: 'Assigned user not found' });
    }

    // Role-based validation: Supervisor can only assign to USER, Admin can assign to SUPERVISOR or USER
    if (req.user.role === 'SUPERVISOR' && assignedUser.role !== 'USER') {
      return res.status(403).json({ error: 'Supervisors can only assign tasks to users' });
    }

    if (req.user.role === 'ADMIN' && !['SUPERVISOR', 'USER'].includes(assignedUser.role)) {
      return res.status(403).json({ error: 'Admin can only assign tasks to supervisors or users' });
    }

    // Create task
    const task = await prisma.task.create({
      data: {
        title,
        description,
        assignedToId,
        assignedById: req.user.id,
        deadline: new Date(deadline),
        requiresProof: requiresProof === true || requiresProof === 'true'
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            email: true
          }
        },
        assignedBy: {
          select: {
            id: true,
            email: true
          }
        }
      }
    });

    // Send email notification to assigned user
    try {
      await emailService.sendTaskAssignmentEmail(
        assignedUser.email,
        task.title,
        task.description,
        task.deadline
      );
    } catch (emailError) {
      console.error('Failed to send assignment email:', emailError);
      // Don't fail the request if email fails
    }

    res.status(201).json({ task });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

/**
 * GET /tasks
 * Get tasks (role-based filtering)
 */
router.get('/', async (req, res) => {
  try {
    let tasks;

    if (req.user.role === 'ADMIN') {
      // Admin can see all tasks
      tasks = await prisma.task.findMany({
        include: {
          assignedTo: {
            select: {
              id: true,
              email: true
            }
          },
          assignedBy: {
            select: {
              id: true,
              email: true
            }
          },
          submission: true
        },
        orderBy: {
          createdAt: 'desc'
      }
      });
    } else if (req.user.role === 'SUPERVISOR') {
      // Supervisor can see tasks they created
      tasks = await prisma.task.findMany({
        where: {
          assignedById: req.user.id
        },
        include: {
          assignedTo: {
            select: {
              id: true,
              email: true
            }
          },
          submission: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } else {
      // User can only see tasks assigned to them
      tasks = await prisma.task.findMany({
        where: {
          assignedToId: req.user.id
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
          createdAt: 'desc'
        }
      });
    }

    res.json({ tasks });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

/**
 * POST /tasks/:id/submit
 * Submit a task (User only, for tasks assigned to them)
 */
router.post('/:id/submit', authorize('USER'), upload.single('proofImage'), async (req, res) => {
  try {
    const taskId = req.params.id;

    // Find task
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { submission: true }
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Verify task is assigned to current user
    if (task.assignedToId !== req.user.id) {
      return res.status(403).json({ error: 'You can only submit tasks assigned to you' });
    }

    // Check if task is already submitted
    if (task.status === 'SUBMITTED' || task.status === 'APPROVED' || task.status === 'REJECTED') {
      return res.status(400).json({ error: 'Task has already been submitted' });
    }

    // Check if proof is required
    if (task.requiresProof && !req.file) {
      return res.status(400).json({ error: 'Proof image is required for this task' });
    }

    // Update task status and create submission
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'SUBMITTED',
        submission: {
          upsert: {
            create: {
              proofImagePath: req.file ? getRelativePath(req.file.path) : null
            },
            update: {
              proofImagePath: req.file ? getRelativePath(req.file.path) : null,
              submittedAt: new Date()
            }
          }
        }
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            email: true
          }
        },
        submission: true
      }
    });

    res.json({ task: updatedTask });
  } catch (error) {
    console.error('Submit task error:', error);
    res.status(500).json({ error: 'Failed to submit task' });
  }
});

/**
 * POST /tasks/:id/approve
 * Approve a submitted task (Supervisor only)
 */
router.post('/:id/approve', authorize('SUPERVISOR'), async (req, res) => {
  try {
    const taskId = req.params.id;

    // Find task
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignedTo: {
          select: {
            id: true,
            email: true
          }
        }
      }
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Verify task was created by current supervisor
    if (task.assignedById !== req.user.id) {
      return res.status(403).json({ error: 'You can only approve tasks you created' });
    }

    // Check if task is submitted
    if (task.status !== 'SUBMITTED') {
      return res.status(400).json({ error: 'Task must be submitted before approval' });
    }

    // Update task status
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'APPROVED'
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            email: true
          }
        },
        submission: true
      }
    });

    res.json({ task: updatedTask });
  } catch (error) {
    console.error('Approve task error:', error);
    res.status(500).json({ error: 'Failed to approve task' });
  }
});

/**
 * POST /tasks/:id/reject
 * Reject a submitted task (Supervisor only)
 */
router.post('/:id/reject', authorize('SUPERVISOR'), async (req, res) => {
  try {
    const taskId = req.params.id;

    // Find task
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignedTo: {
          select: {
            id: true,
            email: true
          }
        }
      }
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Verify task was created by current supervisor
    if (task.assignedById !== req.user.id) {
      return res.status(403).json({ error: 'You can only reject tasks you created' });
    }

    // Check if task is submitted
    if (task.status !== 'SUBMITTED') {
      return res.status(400).json({ error: 'Task must be submitted before rejection' });
    }

    // Update task status
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'REJECTED'
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            email: true
          }
        },
        submission: true
      }
    });

    res.json({ task: updatedTask });
  } catch (error) {
    console.error('Reject task error:', error);
    res.status(500).json({ error: 'Failed to reject task' });
  }
});

module.exports = router;

