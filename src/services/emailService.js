const nodemailer = require('nodemailer');

let transporter = null;
let emailConfigured = false;

const initTransporter = () => {
  if (transporter || emailConfigured === false) {
    return transporter;
  }

  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    EMAIL_FROM
  } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !EMAIL_FROM) {
    console.warn(
      'SMTP configuration is incomplete. Email notifications are disabled. ' +
      'Required env vars: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM'
    );
    emailConfigured = false;
    return null;
  }

  try {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    });
    emailConfigured = true;
    return transporter;
  } catch (err) {
    console.error('Failed to initialize Nodemailer transporter:', err);
    emailConfigured = false;
    transporter = null;
    return null;
  }
};

const sendEmail = async ({ to, subject, text, html }) => {
  const tx = initTransporter();
  if (!tx || emailConfigured === false) {
    // Graceful no-op when SMTP is not configured
    return;
  }

  const from = process.env.EMAIL_FROM;

  try {
    await tx.sendMail({ from, to, subject, text, html });
  } catch (err) {
    console.error('Error sending email:', err);
    // Do not throw so that API calls are not broken by email failures
  }
};

/**
 * Send email when task is assigned or reassigned
 */
const sendTaskAssignmentEmail = async (userEmail, taskTitle, taskDescription, deadline) => {
  const subject = `New Task Assigned: ${taskTitle}`;
  const text = [
    'You have been assigned a new task.',
    '',
    `Title: ${taskTitle}`,
    `Description: ${taskDescription}`,
    `Due Date: ${new Date(deadline).toLocaleString()}`,
    '',
    'Please log in to your dashboard to view and complete this task.'
  ].join('\n');

  const html = `
    <h2>You have been assigned a new task</h2>
    <p><strong>Title:</strong> ${taskTitle}</p>
    <p><strong>Description:</strong> ${taskDescription}</p>
    <p><strong>Due Date:</strong> ${new Date(deadline).toLocaleString()}</p>
    <p>Please log in to your dashboard to view and complete this task.</p>
  `;

  await sendEmail({ to: userEmail, subject, text, html });
};

/**
 * Send reminder email when deadline is approaching
 */
const sendDeadlineReminderEmail = async (userEmail, taskTitle, taskDescription, deadline) => {
  const subject = `Reminder: Task Deadline Approaching - ${taskTitle}`;
  const text = [
    'This is a reminder that a task deadline is approaching.',
    '',
    `Title: ${taskTitle}`,
    `Description: ${taskDescription}`,
    `Due Date: ${new Date(deadline).toLocaleString()}`,
    '',
    'This task is due within 24 hours. Please complete it soon.'
  ].join('\n');

  const html = `
    <h2>Task Deadline Reminder</h2>
    <p><strong>Title:</strong> ${taskTitle}</p>
    <p><strong>Description:</strong> ${taskDescription}</p>
    <p><strong>Due Date:</strong> ${new Date(deadline).toLocaleString()}</p>
    <p>This task is due within 24 hours. Please complete it soon.</p>
  `;

  await sendEmail({ to: userEmail, subject, text, html });
};

/**
 * Send email when a submitted task is rejected by a supervisor/admin.
 * The email is sent to the task assignee with feedback and resubmission instructions.
 */
const sendTaskRejectedEmail = async (task, feedback) => {
  if (!task || !task.assignedTo || !task.assignedTo.email) {
    console.warn('sendTaskRejectedEmail called without valid task.assignedTo.email');
    return;
  }

  const to = task.assignedTo.email;
  const subject = 'Task Rejected \u2013 Action Required';

  const feedbackText = feedback ? feedback : 'No additional feedback was provided.';

  const textLines = [
    'Your task has been reviewed and was rejected.',
    '',
    `Task ID: ${task.id}`,
    `Title: ${task.title}`,
    '',
    'Supervisor feedback:',
    feedbackText,
    '',
    'Please review the feedback, update the task as needed, and resubmit it for approval from your dashboard.'
  ];

  const text = textLines.join('\n');

  const html = `
    <h2>Task Rejected - Action Required</h2>
    <p>Your submitted task has been reviewed and was <strong>rejected</strong>.</p>
    <p><strong>Task ID:</strong> ${task.id}</p>
    <p><strong>Title:</strong> ${task.title}</p>
    <h3>Supervisor Feedback</h3>
    <p>${feedbackText.replace(/\n/g, '<br />')}</p>
    <p>Please log in to your dashboard, review the feedback, make the necessary corrections, and resubmit the task for approval.</p>
  `;

  await sendEmail({ to, subject, text, html });
};

module.exports = {
  sendTaskAssignmentEmail,
  sendDeadlineReminderEmail,
  sendTaskRejectedEmail
};

