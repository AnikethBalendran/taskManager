const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticate);

/**
 * DELETE /attachments/:id
 * Soft-delete an attachment record (does not remove from storage)
 */
router.delete('/:id', authorize('ADMIN', 'SUPERVISOR'), async (req, res) => {
  try {
    const id = req.params.id;

    const attachment = await prisma.attachment.findUnique({
      where: { id },
      include: {
        task: true
      }
    });

    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    // Supervisors can only delete attachments for tasks they created
    if (req.user.role === 'SUPERVISOR' && attachment.task.assignedById !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this attachment' });
    }

    await prisma.attachment.delete({
      where: { id }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete attachment error:', error);
    res.status(500).json({ error: 'Failed to delete attachment' });
  }
});

module.exports = router;

