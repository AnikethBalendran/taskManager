const express = require('express');
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const emailService = require('../services/emailService');
const storageService = require('../services/storageService');

const router = express.Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticate);

// Multer configuration - memory storage for Firebase uploads
const proofUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(require('path').extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

const attachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    // Allow common image and document types
    const allowed = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx|txt/;
    const extname = allowed.test(require('path').extname(file.originalname).toLowerCase());
    if (extname) {
      return cb(null, true);
    }
    cb(new Error('Unsupported file type'));
  }
});

const addTaskEvent = async (taskId, userId, action) => {
  try {
    await prisma.taskEvent.create({
      data: {
        taskId,
        userId,
        action
      }
    });
  } catch (err) {
    console.error('Failed to create TaskEvent:', err);
  }
};

const withOverdueFlag = (task) => {
  if (!task) return task;
  const now = new Date();
  const isOverdue = task.deadline && new Date(task.deadline) < now && task.status !== 'COMPLETED';
  return { ...task, isOverdue };
};

const withOverdueFlagForList = (tasks) => tasks.map(withOverdueFlag);

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
    
    const {
      title,
      description,
      assignedToId,
      deadline,
      requiresProof,
      correctiveAction,
      remarks,
      expectedClosureDate,
      capexType,
      capexAmount
    } = req.body;

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

    if (
      req.user.role === 'ADMIN' &&
      !['ADMIN', 'SUPERVISOR', 'USER'].includes(assignedUser.role)
    ) {
      return res.status(403).json({ error: 'Invalid assignee role' });
    }

    // Create task
    const task = await prisma.task.create({
      data: {
        title,
        description,
        assignedToId,
        assignedById: req.user.id,
        deadline: new Date(deadline),
        requiresProof: requiresProof === true || requiresProof === 'true',
        status: 'PENDING',
        approvalStatus: 'NONE',
        correctiveAction: correctiveAction || null,
        remarks: remarks || null,
        expectedClosureDate: expectedClosureDate ? new Date(expectedClosureDate) : null,
        capexType: capexType || 'NONE',
        capexAmount: capexAmount ? Number(capexAmount) : null
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

    // Generate CAP ID
    const taskCount = await prisma.task.count({ where: { assignedById: req.user.id } });
    const last6 = req.user.id.replace(/-/g, '').slice(-6);
    const capId = `CAP-${last6}-${String(taskCount).padStart(4, '0')}`;
    await prisma.task.update({ where: { id: task.id }, data: { capId } });
    task.capId = capId;

    // Activity history
    await addTaskEvent(task.id, req.user.id, 'TASK_CREATED');
    await addTaskEvent(task.id, req.user.id, 'TASK_ASSIGNED');

    // Send email notification to assigned user (smart - only new assignee)
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

    res.status(201).json({ task: withOverdueFlag(task) });
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
        where: {
          archived: false
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
          },
          submission: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } else if (req.user.role === 'SUPERVISOR') {
      // Tasks the supervisor created, or tasks assigned to them (e.g. by an admin)
      tasks = await prisma.task.findMany({
        where: {
          archived: false,
          OR: [{ assignedById: req.user.id }, { assignedToId: req.user.id }]
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
          assignedToId: req.user.id,
          archived: false
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

    res.json({ tasks: withOverdueFlagForList(tasks) });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

/**
 * GET /tasks/summary
 * Admin summary of tasks and expenditure over a createdAt time range.
 * counts.completed = approvalStatus APPROVED. counts.pending = submitted, awaiting supervisor.
 * counts.inProgress = not yet submitted for approval (NONE) or rejected and back with assignee (REJECTED).
 * Query params:
 *   from (ISO string) - inclusive lower bound
 *   to   (ISO string) - exclusive upper bound
 * Defaults to last 30 days if not provided.
 */
router.get('/summary', authorize('ADMIN'), async (req, res) => {
  try {
    const now = new Date();
    const defaultTo = now;
    const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const from = req.query.from ? new Date(req.query.from) : defaultFrom;
    const to = req.query.to ? new Date(req.query.to) : defaultTo;

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return res.status(400).json({ error: 'Invalid from/to date range' });
    }

    const baseWhere = {
      createdAt: {
        gte: from,
        lt: to
      },
      archived: false
    };

    // inProgress = not submitted for approval yet (NONE) or rejected pending resubmit (REJECTED), not workflow IN_PROGRESS
    const [createdCount, inProgressCount, completedCount, pendingCount, capexAgg, revexAgg] = await Promise.all([
      prisma.task.count({ where: baseWhere }),
      prisma.task.count({
        where: {
          ...baseWhere,
          approvalStatus: { in: ['NONE', 'REJECTED'] }
        }
      }),
      prisma.task.count({ where: { ...baseWhere, approvalStatus: 'APPROVED' } }),
      prisma.task.count({
        where: {
          ...baseWhere,
          approvalStatus: 'PENDING',
          submittedForApprovalAt: { not: null }
        }
      }),
      prisma.task.aggregate({
        where: {
          ...baseWhere,
          capexType: 'CAPEX'
        },
        _sum: {
          capexAmount: true
        }
      }),
      prisma.task.aggregate({
        where: {
          ...baseWhere,
          capexType: 'REVEX'
        },
        _sum: {
          capexAmount: true
        }
      })
    ]);

    const capexTotal = capexAgg._sum.capexAmount || 0;
    const revexTotal = revexAgg._sum.capexAmount || 0;

    res.json({
      range: {
        from: from.toISOString(),
        to: to.toISOString()
      },
      counts: {
        created: createdCount,
        inProgress: inProgressCount,
        completed: completedCount,
        pending: pendingCount
      },
      financial: {
        capexTotal,
        revexTotal,
        grandTotal: capexTotal + revexTotal
      }
    });
  } catch (error) {
    console.error('Get tasks summary error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks summary' });
  }
});

/**
 * GET /tasks/:id
 * Get full details of a single task
 */
router.get('/:id', async (req, res) => {
  try {
    const taskId = req.params.id;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignedTo: { select: { id: true, email: true, firstName: true, lastName: true } },
        assignedBy: { select: { id: true, email: true } },
        submission: true,
        attachments: { orderBy: { createdAt: 'desc' } },
        updates: {
          include: { user: { select: { id: true, email: true, role: true } } },
          orderBy: { createdAt: 'asc' }
        },
        events: {
          include: { user: { select: { id: true, email: true, role: true } } },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (
      req.user.role !== 'ADMIN' &&
      task.assignedById !== req.user.id &&
      task.assignedToId !== req.user.id
    ) {
      return res.status(403).json({ error: 'Not authorized to view this task' });
    }

    res.json({ task: withOverdueFlag(task) });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

/**
 * PUT /tasks/:id
 * Update a task (role-based field permissions)
 */
router.put('/:id', async (req, res) => {
  try {
    const taskId = req.params.id;

    const task = await prisma.task.findUnique({ where: { id: taskId } });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (req.user.role === 'USER' && task.assignedToId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this task' });
    }
    if (
      req.user.role === 'SUPERVISOR' &&
      task.assignedById !== req.user.id &&
      task.assignedToId !== req.user.id
    ) {
      return res.status(403).json({ error: 'Not authorized to update this task' });
    }

    const isAssigneeOnly =
      (req.user.role === 'USER' && task.assignedToId === req.user.id) ||
      (req.user.role === 'SUPERVISOR' &&
        task.assignedToId === req.user.id &&
        task.assignedById !== req.user.id);

    const {
      title, description, assignedToId, deadline, requiresProof,
      correctiveAction, remarks, expectedClosureDate, capexType, capexAmount,
      teamMembers, completionDetails, status
    } = req.body;

    const updateData = {};

    if (isAssigneeOnly) {
      if (completionDetails !== undefined) updateData.completionDetails = completionDetails;
      if (remarks !== undefined) updateData.remarks = remarks || null;
      if (status === 'IN_PROGRESS' && task.status === 'PENDING') {
        updateData.status = 'IN_PROGRESS';
      }
      // Allow assignee to edit CAPEX/REVEX type and expenditure amount
      if (capexType !== undefined) {
        if (!['NONE', 'CAPEX', 'REVEX'].includes(capexType)) {
          return res.status(400).json({ error: 'Invalid CAPEX/REVEX type' });
        }
        updateData.capexType = capexType;
      }
      if (capexAmount !== undefined) {
        const parsedAmount = capexAmount === null || capexAmount === '' ? null : Number(capexAmount);
        if (parsedAmount !== null && (!isFinite(parsedAmount) || parsedAmount < 0)) {
          return res.status(400).json({ error: 'Expenditure amount must be a non-negative number' });
        }
        updateData.capexAmount = parsedAmount;
      }
    } else {
      // ADMIN or SUPERVISOR (task creator)
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (deadline !== undefined) updateData.deadline = new Date(deadline);
      if (requiresProof !== undefined) updateData.requiresProof = requiresProof === true || requiresProof === 'true';
      if (correctiveAction !== undefined) updateData.correctiveAction = correctiveAction || null;
      if (remarks !== undefined) updateData.remarks = remarks || null;
      if (expectedClosureDate !== undefined) updateData.expectedClosureDate = expectedClosureDate ? new Date(expectedClosureDate) : null;
      if (capexType !== undefined) {
        if (!['NONE', 'CAPEX', 'REVEX'].includes(capexType)) {
          return res.status(400).json({ error: 'Invalid CAPEX/REVEX type' });
        }
        updateData.capexType = capexType;
      }
      if (capexAmount !== undefined) {
        const parsedAmount = capexAmount === null || capexAmount === '' ? null : Number(capexAmount);
        if (parsedAmount !== null && (!isFinite(parsedAmount) || parsedAmount < 0)) {
          return res.status(400).json({ error: 'Expenditure amount must be a non-negative number' });
        }
        updateData.capexAmount = parsedAmount;
      }
      if (teamMembers !== undefined) updateData.teamMembers = teamMembers;
      if (completionDetails !== undefined) updateData.completionDetails = completionDetails;
      if (status !== undefined) updateData.status = status;

      if (assignedToId !== undefined && assignedToId !== task.assignedToId) {
        const newAssignee = await prisma.user.findUnique({ where: { id: assignedToId } });
        if (!newAssignee) {
          return res.status(400).json({ error: 'Assigned user not found' });
        }
        if (req.user.role === 'SUPERVISOR' && newAssignee.role !== 'USER') {
          return res.status(403).json({ error: 'Supervisors can only assign tasks to users' });
        }
        if (
          req.user.role === 'ADMIN' &&
          !['ADMIN', 'SUPERVISOR', 'USER'].includes(newAssignee.role)
        ) {
          return res.status(403).json({ error: 'Invalid assignee role' });
        }
        updateData.assignedToId = assignedToId;
        try {
          await emailService.sendTaskAssignmentEmail(newAssignee.email, task.title, task.description, task.deadline);
        } catch (emailError) {
          console.error('Failed to send assignment email:', emailError);
        }
        await addTaskEvent(taskId, req.user.id, 'TASK_ASSIGNED');
      }
    }

    if (updateData.status === 'IN_PROGRESS' && task.status !== 'IN_PROGRESS') {
      await addTaskEvent(taskId, req.user.id, 'TASK_STARTED');
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        assignedTo: { select: { id: true, email: true, firstName: true, lastName: true } },
        assignedBy: { select: { id: true, email: true } },
        submission: true,
        attachments: { orderBy: { createdAt: 'desc' } },
        events: {
          include: { user: { select: { id: true, email: true, role: true } } },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    res.json({ task: withOverdueFlag(updatedTask) });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

/**
 * DELETE /tasks/:id
 * Admin: any task. Supervisor: only tasks they created (assignedById).
 * Exported for app-level registration in server.js (ensures DELETE is always reachable).
 */
async function deleteTaskHandler(req, res) {
  try {
    const taskId = req.params.id;

    if (req.user.role === 'USER') {
      return res.status(403).json({ error: 'Not authorized to delete tasks' });
    }

    const task = await prisma.task.findUnique({ where: { id: taskId } });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (req.user.role === 'SUPERVISOR' && task.assignedById !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete tasks you assigned' });
    }

    await prisma.task.delete({ where: { id: taskId } });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
}

router.delete('/:id', deleteTaskHandler);

/**
 * POST /tasks/:id/updates
 * Add an in-app status update (comment) to a task.
 * Allowed for anyone who can view the task: ADMIN, creator, or assignee.
 */
router.post('/:id/updates', async (req, res) => {
  try {
    const taskId = req.params.id;
    const rawMessage = req.body?.message;

    if (typeof rawMessage !== 'string') {
      return res.status(400).json({ error: 'message is required' });
    }

    const message = rawMessage.trim();
    if (!message) {
      return res.status(400).json({ error: 'message cannot be empty' });
    }
    if (message.length > 2000) {
      return res.status(400).json({ error: 'message is too long (max 2000 characters)' });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, assignedById: true, assignedToId: true }
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (
      req.user.role !== 'ADMIN' &&
      task.assignedById !== req.user.id &&
      task.assignedToId !== req.user.id
    ) {
      return res.status(403).json({ error: 'Not authorized to update this task' });
    }

    const update = await prisma.taskUpdate.create({
      data: {
        taskId,
        userId: req.user.id,
        message
      },
      include: {
        user: { select: { id: true, email: true, role: true } }
      }
    });

    await addTaskEvent(taskId, req.user.id, 'STATUS_UPDATE');

    res.status(201).json({ update });
  } catch (error) {
    console.error('Create task update error:', error);
    res.status(500).json({ error: 'Failed to create task update' });
  }
});

/**
 * POST /tasks/:id/submit
 * Submit for approval (USER or SUPERVISOR assignee)
 * Supports both first-time submissions and resubmissions after rejection.
 */
router.post(
  '/:id/submit',
  authorize('USER', 'SUPERVISOR'),
  proofUpload.single('proofImage'),
  async (req, res) => {
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

    // Allow submission when:
    // - First time: approvalStatus === 'NONE'
    // - Resubmission: approvalStatus === 'REJECTED' && status === 'IN_PROGRESS'
    if (task.approvalStatus === 'PENDING' || task.approvalStatus === 'APPROVED') {
      return res.status(400).json({ error: 'Task has already been submitted for approval' });
    }

    if (task.approvalStatus === 'REJECTED' && task.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: 'Rejected tasks must be in progress before resubmitting' });
    }

    // Check if proof is required
    const hasExistingProof = !!task.submission?.proofImagePath;
    if (task.requiresProof && !req.file && !hasExistingProof) {
      return res.status(400).json({ error: 'Proof image is required for this task' });
    }

    const uploadedProofUrl = req.file
      ? (await storageService.uploadTaskFile(taskId, req.file)).url
      : null;

    // Update task status and create submission, transition to COMPLETED + approval PENDING
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'COMPLETED',
        approvalStatus: 'PENDING',
        submittedForApprovalAt: new Date(),
        submission: {
          upsert: {
            create: {
              proofImagePath: uploadedProofUrl || task.submission?.proofImagePath || null
            },
            update: {
              proofImagePath: uploadedProofUrl || task.submission?.proofImagePath || null,
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

    await addTaskEvent(taskId, req.user.id, 'TASK_COMPLETED');
    await addTaskEvent(taskId, req.user.id, 'TASK_SUBMITTED');

    res.json({ task: withOverdueFlag(updatedTask) });
  } catch (error) {
    console.error('Submit task error:', error);
    res.status(500).json({ error: 'Failed to submit task' });
  }
});

/**
 * POST /tasks/:id/approve
 * Approve a submitted task (Admin or Supervisor)
 */
router.post('/:id/approve', authorize('ADMIN', 'SUPERVISOR'), async (req, res) => {
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

    // Prevent users from approving their own tasks
    if (task.assignedToId === req.user.id) {
      return res.status(403).json({ error: 'You cannot approve your own task' });
    }

    // Verify task was created by current supervisor/admin
    if (task.assignedById !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'You can only approve tasks you created or as an admin' });
    }

    // Check if task is submitted for approval
    if (task.approvalStatus !== 'PENDING') {
      return res.status(400).json({ error: 'Task must be submitted for approval first' });
    }

    // Update task status
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        approvalStatus: 'APPROVED'
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

    await addTaskEvent(taskId, req.user.id, 'TASK_APPROVED');

    res.json({ task: withOverdueFlag(updatedTask) });
  } catch (error) {
    console.error('Approve task error:', error);
    res.status(500).json({ error: 'Failed to approve task' });
  }
});

/**
 * POST /tasks/:id/reject
 * Reject a submitted task (Admin or Supervisor)
 * On rejection, the task is reopened for the assignee.
 */
router.post('/:id/reject', authorize('ADMIN', 'SUPERVISOR'), async (req, res) => {
  try {
    const taskId = req.params.id;
    const { approvalNotes } = req.body || {};

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

    // Prevent users from rejecting their own tasks
    if (task.assignedToId === req.user.id) {
      return res.status(403).json({ error: 'You cannot reject your own task' });
    }

    // Verify task was created by current supervisor/admin
    if (task.assignedById !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'You can only reject tasks you created or as an admin' });
    }

    // Check if task is submitted for approval
    if (task.approvalStatus !== 'PENDING') {
      return res.status(400).json({ error: 'Task must be submitted for approval first' });
    }

    // Update task status: mark as rejected and reopen for corrections
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'IN_PROGRESS',
        approvalStatus: 'REJECTED',
        approvalNotes: approvalNotes || null,
        submittedForApprovalAt: null
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

    // Record activity events in order
    await addTaskEvent(taskId, req.user.id, 'TASK_REJECTED');
    await addTaskEvent(taskId, req.user.id, 'TASK_REOPENED');

    // Send rejection email to assignee (best-effort)
    try {
      await emailService.sendTaskRejectedEmail(
        {
          id: updatedTask.id,
          title: updatedTask.title,
          assignedTo: updatedTask.assignedTo
        },
        approvalNotes
      );
    } catch (emailError) {
      console.error('Failed to send task rejection email:', emailError);
    }

    res.json({ task: withOverdueFlag(updatedTask) });
  } catch (error) {
    console.error('Reject task error:', error);
    res.status(500).json({ error: 'Failed to reject task' });
  }
});

/**
 * POST /tasks/:id/attachments
 * Upload an attachment to a task
 */
router.post('/:id/attachments', attachmentUpload.single('file'), async (req, res) => {
  try {
    const taskId = req.params.id;

    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Authorization: Admin, Supervisor who created it, or assigned user
    if (
      req.user.role !== 'ADMIN' &&
      task.assignedById !== req.user.id &&
      task.assignedToId !== req.user.id
    ) {
      return res.status(403).json({ error: 'Not authorized to upload attachments for this task' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'File is required' });
    }

    const uploadResult = await storageService.uploadTaskFile(taskId, req.file);

    let attachment;
    try {
      attachment = await prisma.attachment.create({
        data: {
          taskId,
          url: uploadResult.url,
          filename: req.file.originalname
        }
      });
    } catch (prismaErr) {
      throw prismaErr;
    }

    await addTaskEvent(taskId, req.user.id, 'FILE_UPLOADED');

    res.status(201).json({ attachment });
  } catch (error) {
    console.error('Upload attachment error:', error);
    res.status(500).json({ error: 'Failed to upload attachment' });
  }
});

/**
 * GET /tasks/:id/attachments
 * List attachments for a task
 */
router.get('/:id/attachments', async (req, res) => {
  try {
    const taskId = req.params.id;

    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Authorization: Admin, creator, or assignee
    if (
      req.user.role !== 'ADMIN' &&
      task.assignedById !== req.user.id &&
      task.assignedToId !== req.user.id
    ) {
      return res.status(403).json({ error: 'Not authorized to view attachments for this task' });
    }

    const attachments = await prisma.attachment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ attachments });
  } catch (error) {
    console.error('Get attachments error:', error);
    res.status(500).json({ error: 'Failed to fetch attachments' });
  }
});

/**
 * GET /tasks/:id/history
 * Get activity history for a task
 */
router.get('/:id/history', async (req, res) => {
  try {
    const taskId = req.params.id;

    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Authorization: Admin, creator, or assignee
    if (
      req.user.role !== 'ADMIN' &&
      task.assignedById !== req.user.id &&
      task.assignedToId !== req.user.id
    ) {
      return res.status(403).json({ error: 'Not authorized to view task history' });
    }

    const events = await prisma.taskEvent.findMany({
      where: { taskId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json({ events });
  } catch (error) {
    console.error('Get task history error:', error);
    res.status(500).json({ error: 'Failed to fetch task history' });
  }
});

module.exports = router;
module.exports.deleteTaskHandler = deleteTaskHandler;

