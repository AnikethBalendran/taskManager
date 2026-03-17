# Role-Based Task Management System

A complete role-based task management web application for managing CAPEX/REVEX and operational tasks. Built with Node.js, Express, PostgreSQL, Prisma, and React, with Firebase Storage for files and SMTP (Nodemailer) for emails.

## Features

- **Authentication & Security**
  - JWT-based authentication stored in **HttpOnly cookies**
  - Protected Express routes with `authenticate` middleware
  - **Role-based authorization** (`authorize`) for ADMIN, SUPERVISOR, USER
  - CORS configured for the React frontend

- **Role-Based Access Control**
  - **Admin**
    - Create and manage users and roles
    - View **all tasks** across the system
    - View tasks per user (drill-down)
    - Approve/reject tasks created by anyone
  - **Supervisor**
    - Create and assign tasks to **users**
    - View and manage tasks they created
    - Approve/reject submissions for their tasks
    - View activity history per task
  - **User**
    - View tasks assigned to them
    - Start work, add completion details, and **submit tasks for approval**
    - Handle **rejected tasks** and resubmit with corrections
    - Upload proof images and additional attachments

- **Task Management & Workflow**
  - Two independent state machines:
    - `status`: `PENDING → IN_PROGRESS → COMPLETED`
    - `approvalStatus`: `NONE → PENDING → APPROVED | REJECTED`
  - **Workflow behavior**
    - New task: `status = PENDING`, `approvalStatus = NONE`
    - User starts work: `status = IN_PROGRESS`
    - User submits task:
      - `status = COMPLETED`
      - `approvalStatus = PENDING`
      - `submittedForApprovalAt` timestamp set
    - Supervisor/Admin review:
      - Approve: `approvalStatus = APPROVED`
      - Reject:
        - `status = IN_PROGRESS`
        - `approvalStatus = REJECTED`
        - `approvalNotes` must contain feedback
        - `submittedForApprovalAt` cleared
      - Rejected tasks are **automatically reopened** and can be resubmitted by the user
  - **Overdue detection**
    - `isOverdue` is computed on the fly (not stored) based on `deadline < now` when `status !== 'COMPLETED'`

- **Task Fields & CAPEX/REVEX**
  - Core fields: `title`, `description`, `deadline`, `assignedTo`, `assignedBy`, `requiresProof`
  - Financial and planning fields:
    - `capexType`: `NONE | CAPEX | REVEX`
    - `capexAmount`
    - `correctiveAction`
    - `remarks`
    - `expectedClosureDate`
    - `teamMembers` (string array)
    - `completionDetails`
  - **CAP ID** auto-generation
    - Format: `CAP-<last6charsOfCreatorId>-NNNN` based on creator and task count

- **Dashboards & UI**
  - **Admin Dashboard**
    - Manage users (create/update email & role)
    - View all tasks with status filters and CAPEX/REVEX info
    - Drill-down into a **specific user’s active tasks**
    - Approve/reject tasks and open detailed task views
  - **Supervisor Dashboard**
    - Create tasks for users, including `requiresProof`
    - View tasks they created with status chips and due-date highlighting
    - View per-task **activity history** (audit trail)
    - Approve/reject submissions and view proof images
  - **User Dashboard**
    - See all assigned tasks with status and approval badges
    - Visual overdue highlighting based on deadlines
    - Submit tasks, including **fix & resubmit** for rejected items
    - Upload proof images (when required)
  - **Task Detail Page**
    - Rich per-task view used by all roles
    - Edit core details (Admin / creator Supervisor), including CAPEX/REVEX fields, timelines, team members, remarks
    - Manage completion details and approval feedback
    - Upload and manage **attachments** (Admin + task creator Supervisor)
    - See chronological **activity history** (TaskEvents)
  - **Profile Management**
    - All roles can view and update:
      - First/last name
      - Phone
      - Profile picture URL

- **File Uploads & Attachments**
  - Proof image uploads and generic attachments are handled via the **backend** only
  - Uses `multer` with **memoryStorage** and validation:
    - Proof images: JPEG/JPG/PNG/GIF up to 5 MB
    - Attachments: common image and document types (PDF, DOC(X), XLS(X), PPT(X), TXT) up to 10 MB
  - Files are uploaded to **Firebase Storage** via the Firebase Admin SDK
  - Backend returns a **public HTTPS URL** for each file
  - Frontend uses these URLs directly (no extra API prefix)
  - Attachment deletion removes the DB record (storage deletion is not enforced)

- **Email Notifications (SMTP / Nodemailer)**
  - Uses **Nodemailer** with SMTP (not SendGrid)
  - Configured via environment variables; if env is incomplete, emails are **gracefully disabled** and the rest of the app continues to work
  - Email types:
    - **Task assignment** notifications
    - **Deadline reminders** (within 24 hours)
    - **Task rejection** notifications with supervisor feedback

- **Scheduled Jobs**
  - `node-cron` job runs hourly:
    - Finds non-archived tasks with deadlines in the next 24 hours and `approvalStatus !== 'APPROVED'`
    - Sends reminder emails to assignees (if SMTP is configured)

- **Audit Trail (Task Events)**
  - Every key action is logged as a `TaskEvent`, including:
    - `TASK_CREATED`, `TASK_ASSIGNED`, `TASK_STARTED`, `TASK_COMPLETED`
    - `TASK_SUBMITTED`, `TASK_APPROVED`, `TASK_REJECTED`, `TASK_REOPENED`
    - `FILE_UPLOADED`
  - Used by Supervisor dashboard and Task Detail page to render a human-readable history

## Tech Stack

### Backend

- Node.js + Express
- PostgreSQL
- Prisma ORM
- JWT authentication with HttpOnly cookies
- bcrypt password hashing
- multer for file uploads (memory storage)
- **Firebase Admin SDK** for file storage (public URLs)
- **Nodemailer (SMTP)** for email notifications
- `node-cron` for scheduled jobs

### Frontend

- React + React Router
- Axios (with `withCredentials` for cookie-based auth)
- Tailwind CSS + custom utility classes in `index.css`
- Role-specific dashboards (`/admin`, `/supervisor`, `/user`) and a task detail route (`/tasks/:id`)

## Project Structure

```text
TaskManager/
├── prisma/
│   ├── schema.prisma              # Database schema (User, Task, TaskSubmission, Attachment, TaskEvent)
│   └── migrations/                # Prisma migrations
├── src/
│   ├── server.js                  # Express server entry point
│   ├── middleware/
│   │   └── auth.js                # Authentication & authorization middleware
│   ├── routes/
│   │   ├── auth.js                # Authentication routes
│   │   ├── users.js               # User management & profiles
│   │   ├── tasks.js               # Task CRUD, workflow, submissions, history, attachments
│   │   └── attachments.js         # Attachment deletion
│   ├── services/
│   │   ├── emailService.js        # Nodemailer-based email service (SMTP)
│   │   └── storageService.js      # Firebase Storage uploads
│   └── cron/
│       └── jobScheduler.js        # Scheduled cron jobs (deadline reminders)
├── uploads/                       # Legacy/local uploads (Firebase is primary storage)
├── frontend/
│   ├── src/
│   │   ├── pages/                 # React pages: Login + dashboards + TaskDetailPage
│   │   ├── services/              # API service layer (Axios)
│   │   ├── App.js                 # Main React app + routing
│   │   └── index.css              # Tailwind base + custom components
│   └── public/
├── package.json                   # Backend dependencies & scripts
├── frontend/package.json          # Frontend dependencies & scripts
├── env.example.txt                # Environment variables template
└── README.md                      # This file
```

## Data Model (Prisma / PostgreSQL)

Key models (simplified):

- **User**
  - Fields: `id`, `email`, `passwordHash`, `role (ADMIN|SUPERVISOR|USER)`, profile fields (`firstName`, `lastName`, `phone`, `profilePicture`)
  - Relations:
    - `assignedTasks` (tasks assigned to user)
    - `createdTasks` (tasks created by user)
    - `taskEvents` (audit log entries by user)

- **Task**
  - Fields:
    - Core: `title`, `description`, `deadline`, `requiresProof`
    - Assignment: `assignedToId`, `assignedById`
    - State: `status`, `approvalStatus`, `submittedForApprovalAt`, `approvalNotes`
    - CAPEX/REVEX: `capexType`, `capexAmount`, `capId`
    - Planning: `correctiveAction`, `remarks`, `expectedClosureDate`, `teamMembers[]`, `completionDetails`, `archived`
  - Relations:
    - `assignedTo`, `assignedBy`
    - `submission` (TaskSubmission, optional)
    - `attachments[]`
    - `events[]` (TaskEvent)

- **TaskSubmission**
  - One-to-one with Task
  - Fields: `taskId`, `proofImagePath`, `submittedAt`

- **Attachment**
  - Fields: `taskId`, `url`, `filename`, `createdAt`
  - Relation: many-to-one with Task

- **TaskEvent**
  - Fields: `taskId`, `userId`, `action`, `createdAt`
  - Relations: many-to-one with Task and User

## Environment Variables

### Backend (`.env` in project root)

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/taskmanager?schema=public
JWT_SECRET=your-super-secret-jwt-key
PORT=3001
NODE_ENV=development

# Email (SMTP via Nodemailer)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
EMAIL_FROM=no-reply@example.com

# Firebase Storage (required for file uploads)
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-firebase-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=your-bucket-name.appspot.com

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

### Frontend (`frontend/.env`, optional)

```env
REACT_APP_API_URL=http://localhost:3001
```

If omitted, the frontend defaults to `http://localhost:3001`.

## Setup Instructions

### Prerequisites

- Node.js (v16+)
- PostgreSQL (v12+)
- npm or yarn
- A Firebase project + service account (for file uploads)
- An SMTP provider (for email notifications, optional but recommended)

### 1. Database Setup

1. Create a PostgreSQL database:

```sql
CREATE DATABASE taskmanager;
```

2. Set `DATABASE_URL` in `.env` (see Environment Variables).

### 2. Backend Setup

```bash
cd TaskManager
npm install

# Copy and edit env file
cp env.example.txt .env

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Optional: create `frontend/.env` to set API URL (defaults to `http://localhost:3001`).

### 4. Running the Application

#### Backend

From the project root:

```bash
npm run dev   # development with auto-reload
```

Or:

```bash
npm start     # production-style run
```

The backend runs on `http://localhost:3001`.

#### Frontend

From the `frontend` directory:

```bash
npm start
```

The frontend runs on `http://localhost:3000`.

## API Overview

### Authentication

- `POST /auth/login` — Login with email and password, sets HttpOnly JWT cookie
- `POST /auth/logout` — Logout and clear cookie
- `GET /auth/me` — Get current user info from cookie

### Users

- `POST /users` — Create a user (**Admin only**)
- `GET /users` — List users (Admin: all; Supervisor: only `USER` accounts)
- `GET /users/me` — Get profile for current user
- `PUT /users/me` — Update current user profile (name, phone, picture)
- `PUT /users/:id` — Update another user’s email and role (**Admin only**)
- `GET /users/:id/tasks` — Get active (non-archived) tasks for a user (**Admin only**)

### Tasks

- `POST /tasks` — Create a task (**Admin, Supervisor**)
- `GET /tasks` — Get tasks:
  - Admin: all non-archived tasks
  - Supervisor: tasks they created
  - User: tasks assigned to them
- `GET /tasks/:id` — Get full task details (with attachments & events) for authorized users
- `PUT /tasks/:id` — Update a task
  - User: can update limited fields (e.g. completion details, remarks, IN_PROGRESS transition)
  - Admin/Supervisor (creator): can update core fields, CAPEX/REVEX, deadlines, assignee, etc.
- `POST /tasks/:id/submit` — Submit task for approval (**User only**, assigned to them)
- `POST /tasks/:id/approve` — Approve submitted task (**Admin or creator Supervisor**)
- `POST /tasks/:id/reject` — Reject submitted task with feedback (**Admin or creator Supervisor**)
- `GET /tasks/:id/history` — Get task activity history (TaskEvents)
- `GET /tasks/:id/attachments` — List attachments for a task
- `POST /tasks/:id/attachments` — Upload attachment (role-based access enforced)

### Attachments

- `DELETE /attachments/:id` — Delete an attachment record (**Admin, creator Supervisor**)

## Development Notes

- JWT tokens are stored in **HttpOnly cookies** for security.
- All protected routes require the `authenticate` middleware.
- Role checks always go through the `authorize()` middleware.
- File uploads:
  - Always go via the backend and **never directly to Firebase** from the frontend.
  - Backend uses Firebase Admin SDK and returns public URLs.
- Prisma schema is the single source of truth for the database; changes must go through migrations.
- Email and Firebase features are **optional but recommended**; if not configured, the core app still works (without emails or uploads).

## License

ISC

