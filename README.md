# Role-Based Task Management System

A complete MVP web application for managing tasks with role-based access control (RBAC). Built with Node.js, Express, PostgreSQL, Prisma, and React.

## Features

- **Authentication**: JWT-based authentication with HttpOnly cookies
- **Role-Based Access Control**: Three roles (Admin, Supervisor, User) with different permissions
- **Task Management**: Create, assign, submit, approve, and reject tasks
- **File Uploads**: Upload proof images for tasks that require proof
- **Email Notifications**: SendGrid integration for task assignments and deadline reminders
- **Scheduled Jobs**: Automated deadline reminder emails using node-cron

## Tech Stack

### Backend
- Node.js
- Express
- PostgreSQL
- Prisma ORM
- JWT authentication
- bcrypt for password hashing
- Multer for file uploads
- SendGrid for email
- node-cron for scheduled tasks

### Frontend
- React
- React Router
- Axios
- CSS

## Project Structure

```
TaskManager/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── server.js              # Express server entry point
│   ├── middleware/
│   │   └── auth.js            # Authentication & authorization middleware
│   ├── routes/
│   │   ├── auth.js            # Authentication routes
│   │   ├── users.js           # User management routes
│   │   └── tasks.js           # Task management routes
│   ├── services/
│   │   └── emailService.js    # SendGrid email service
│   └── cron/
│       └── jobScheduler.js    # Scheduled cron jobs
├── uploads/                   # Uploaded proof images (created automatically)
├── frontend/
│   ├── src/
│   │   ├── pages/             # React pages/components
│   │   ├── services/          # API service layer
│   │   └── App.js             # Main React app
│   └── public/
├── package.json               # Backend dependencies
├── .env.example               # Environment variables template
└── README.md                  # This file
```

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### 1. Database Setup

1. Create a PostgreSQL database:
```sql
CREATE DATABASE taskmanager;
```

2. Update the `DATABASE_URL` in your `.env` file (see step 2).

### 2. Backend Setup

1. Navigate to the project root directory:
```bash
cd TaskManager
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory (copy from `.env.example`):
```bash
cp .env.example .env
```

4. Update `.env` with your configuration:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/taskmanager?schema=public"
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
PORT=3001
NODE_ENV=development
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@taskmanager.com
FRONTEND_URL=http://localhost:3000
```

5. Generate Prisma Client:
```bash
npm run prisma:generate
```

6. Run database migrations:
```bash
npm run prisma:migrate
```

7. (Optional) Seed initial admin user. You can use Prisma Studio to create the first admin user:
```bash
npm run prisma:studio
```

Or create it manually via SQL:
```sql
-- Password: admin123 (hashed with bcrypt)
INSERT INTO users (id, email, password_hash, role, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'admin@example.com',
  '$2b$10$rOzJqZqZqZqZqZqZqZqZqOZqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZq',
  'ADMIN',
  NOW(),
  NOW()
);
```

**Note**: For production, use a proper password hashing tool or create users through the admin interface after first login.

### 3. Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the frontend directory (optional, defaults to `http://localhost:3001`):
```env
REACT_APP_API_URL=http://localhost:3001
```

### 4. Running the Application

#### Backend

From the project root:
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

The backend will run on `http://localhost:3001`

#### Frontend

From the `frontend` directory:
```bash
npm start
```

The frontend will run on `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /auth/login` - Login with email and password
- `POST /auth/logout` - Logout
- `GET /auth/me` - Get current user info

### Users (Admin only)
- `POST /users` - Create a new user
- `GET /users` - Get all users (Admin sees all, Supervisor sees users only)

### Tasks
- `POST /tasks` - Create a task (Supervisor only)
- `GET /tasks` - Get tasks (role-based filtering)
- `POST /tasks/:id/submit` - Submit a task (User only)
- `POST /tasks/:id/approve` - Approve a task (Supervisor only)
- `POST /tasks/:id/reject` - Reject a task (Supervisor only)

## Role Permissions

### ADMIN
- Create users
- Assign roles to users
- View all tasks

### SUPERVISOR
- Create tasks
- Assign tasks to users
- View tasks they created
- Approve/reject submitted tasks
- View users (for task assignment)

### USER
- View tasks assigned to them
- Submit tasks as complete
- Upload proof images if required

## Task Workflow

1. **Admin** creates users with appropriate roles
2. **Supervisor** creates a task and assigns it to a user
   - Email notification is sent to the assigned user
3. **User** completes the task and submits it
   - If proof is required, user must upload an image
   - Task status changes to `SUBMITTED`
4. **Supervisor** reviews the submission
   - Can approve → status becomes `APPROVED`
   - Can reject → status becomes `REJECTED`

## Email Notifications

The system sends emails via SendGrid:
- When a task is assigned to a user
- When a task deadline is within 24 hours (automated cron job)

**Note**: Make sure to configure your SendGrid API key in the `.env` file. If SendGrid is not configured, the application will continue to work but emails will not be sent.

## Scheduled Jobs

A cron job runs every hour to check for tasks with deadlines within 24 hours and sends reminder emails to assigned users.

## File Uploads

- Proof images are stored in the `/uploads` directory
- Only image files (jpeg, jpg, png, gif) are accepted
- Maximum file size: 5MB
- Files are automatically named with a unique identifier

## Creating the First Admin User

Since the system requires authentication, you need to create the first admin user manually. Here are two options:

### Option 1: Using Prisma Studio
1. Run `npm run prisma:studio`
2. Navigate to the Users table
3. Create a new user with:
   - Email: your email
   - password_hash: Use an online bcrypt generator or Node.js script to hash your password
   - role: ADMIN

### Option 2: Using a Node.js script
Create a file `scripts/createAdmin.js`:

```javascript
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createAdmin() {
  const email = 'admin@example.com';
  const password = 'admin123';
  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: 'ADMIN'
    }
  });

  console.log('Admin user created:', admin);
}

createAdmin()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Run it with: `node scripts/createAdmin.js`

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Verify `DATABASE_URL` in `.env` is correct
- Check database credentials

### Authentication Issues
- Ensure `JWT_SECRET` is set in `.env`
- Clear browser cookies if experiencing login issues
- Check that cookies are enabled in your browser

### Email Not Sending
- Verify `SENDGRID_API_KEY` is set correctly
- Check SendGrid account status
- Verify `SENDGRID_FROM_EMAIL` is a verified sender in SendGrid

### File Upload Issues
- Ensure the `uploads` directory exists (created automatically)
- Check file permissions
- Verify file type and size restrictions

## Development Notes

- The backend uses HttpOnly cookies for JWT storage
- CORS is configured to allow requests from the frontend URL
- All routes except `/auth/login` require authentication
- Role-based access control is enforced via middleware

## License

ISC

