const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const emailService = require('../services/emailService');

const prisma = new PrismaClient();

/**
 * Scheduled job to check for tasks with deadlines within 24 hours
 * Runs every hour
 */
const checkUpcomingDeadlines = async () => {
  try {
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const tasks = await prisma.task.findMany({
      where: {
        archived: false,
        status: {
          in: ['PENDING', 'IN_PROGRESS', 'COMPLETED']
        },
        approvalStatus: {
          not: 'APPROVED'
        },
        deadline: {
          gte: now,
          lte: in24Hours
        }
      },
      include: {
        assignedTo: {
          select: {
            email: true
          }
        }
      }
    });

    console.log(`Found ${tasks.length} tasks with deadlines within 24 hours`);

    // Send reminder emails
    for (const task of tasks) {
      try {
        await emailService.sendDeadlineReminderEmail(
          task.assignedTo.email,
          task.title,
          task.description,
          task.deadline
        );
      } catch (error) {
        console.error(`Failed to send reminder for task ${task.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error checking upcoming deadlines:', error);
  }
};

/**
 * Start all cron jobs
 */
const start = () => {
  // Run every hour at minute 0
  cron.schedule('0 * * * *', () => {
    console.log('Running deadline reminder check...');
    checkUpcomingDeadlines();
  });

  console.log('Cron jobs started');
};

module.exports = {
  start
};

