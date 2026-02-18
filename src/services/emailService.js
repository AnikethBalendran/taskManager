const sgMail = require('@sendgrid/mail');

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Send email when task is assigned
 */
const sendTaskAssignmentEmail = async (userEmail, taskTitle, taskDescription, deadline) => {
  if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
    console.warn('SendGrid not configured, skipping email');
    return;
  }

  const msg = {
    to: userEmail,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject: `New Task Assigned: ${taskTitle}`,
    html: `
      <h2>You have been assigned a new task</h2>
      <p><strong>Title:</strong> ${taskTitle}</p>
      <p><strong>Description:</strong> ${taskDescription}</p>
      <p><strong>Deadline:</strong> ${new Date(deadline).toLocaleString()}</p>
      <p>Please log in to your dashboard to view and complete this task.</p>
    `
  };

  try {
    await sgMail.send(msg);
    console.log(`Task assignment email sent to ${userEmail}`);
  } catch (error) {
    console.error('Error sending task assignment email:', error);
    throw error;
  }
};

/**
 * Send reminder email when deadline is approaching
 */
const sendDeadlineReminderEmail = async (userEmail, taskTitle, taskDescription, deadline) => {
  if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
    console.warn('SendGrid not configured, skipping email');
    return;
  }

  const msg = {
    to: userEmail,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject: `Reminder: Task Deadline Approaching - ${taskTitle}`,
    html: `
      <h2>Task Deadline Reminder</h2>
      <p><strong>Title:</strong> ${taskTitle}</p>
      <p><strong>Description:</strong> ${taskDescription}</p>
      <p><strong>Deadline:</strong> ${new Date(deadline).toLocaleString()}</p>
      <p>This task is due within 24 hours. Please complete it soon!</p>
    `
  };

  try {
    await sgMail.send(msg);
    console.log(`Deadline reminder email sent to ${userEmail}`);
  } catch (error) {
    console.error('Error sending deadline reminder email:', error);
    throw error;
  }
};

module.exports = {
  sendTaskAssignmentEmail,
  sendDeadlineReminderEmail
};

