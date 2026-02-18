# Quick Setup Guide

## Step-by-Step Setup

### 1. Install Dependencies

**Backend:**
```bash
npm install
```

**Frontend:**
```bash
cd frontend
npm install
cd ..
```

### 2. Database Setup

1. Create PostgreSQL database:
```sql
CREATE DATABASE taskmanager;
```

2. Create `.env` file in the root directory:
```bash
# Copy the template (or create manually)
# On Windows: copy env.example.txt .env
# On Linux/Mac: cp env.example.txt .env
```

3. Edit `.env` and set your database URL:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/taskmanager?schema=public"
JWT_SECRET=your-random-secret-key-here
PORT=3001
NODE_ENV=development
SENDGRID_API_KEY=your-sendgrid-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
FRONTEND_URL=http://localhost:3000
```

### 3. Initialize Database

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate
```

### 4. Create First Admin User

```bash
node scripts/createAdmin.js
```

Follow the prompts to create your admin account.

### 5. Start the Application

**Terminal 1 - Backend:**
```bash
npm start
# or for development: npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

### 6. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## Environment Variables Explained

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT token signing (use a strong random string)
- `PORT`: Backend server port (default: 3001)
- `SENDGRID_API_KEY`: Your SendGrid API key (optional, but required for emails)
- `SENDGRID_FROM_EMAIL`: Verified sender email in SendGrid
- `FRONTEND_URL`: Frontend URL for CORS configuration

## Troubleshooting

### "Cannot find module '@prisma/client'"
Run: `npm run prisma:generate`

### "Database connection error"
- Check PostgreSQL is running
- Verify DATABASE_URL in .env
- Ensure database exists

### "Port already in use"
Change PORT in .env or stop the process using that port

### "Email not sending"
- SendGrid is optional for MVP
- App will work without it, just no emails will be sent
- Check SendGrid API key if you want email functionality

