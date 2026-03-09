# Skill Training Platform

A full-stack skill-based employee training website where managers can assign projects to employees based on skills, and employees can track and complete their assigned skill tasks.

## Features

### Manager Features
- Create and manage projects
- Define required skills for projects
- Assign employees to projects
- View employee skill profiles
- Track project progress
- Real-time dashboard updates

### Employee Features
- View assigned projects and tasks
- See required skills for each project
- Mark skills as completed
- Receive notifications for new assignments
- Track personal progress
- Real-time notifications and task updates

## Tech Stack

- **Frontend**: React.js
- **Backend**: Node.js with Express
- **Database**: PostgreSQL (Neon/Supabise for Vercel)
- **Authentication**: JWT
- **Deployment**: Vercel

## Project Structure

```
skill-train-platform/
├── server/                 # Backend Node.js application
│   ├── database/          # Database schema and seeds
│   │   ├── schema.sql     # Database tables
│   │   └── seeds.sql      # Sample data
│   ├── src/
│   │   ├── config/        # Configuration files
│   │   ├── controllers/   # API controllers
│   │   ├── middleware/    # Auth middleware
│   │   └── routes/        # API routes
│   └── package.json
├── client/                 # Frontend React application
│   ├── public/
│   ├── src/
│   │   ├── context/       # React contexts
│   │   ├── pages/         # React components
│   │   └── services/      # API services
│   └── package.json
├── vercel.json            # Vercel deployment config
└── README.md
```

## Local Development Setup

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Database Setup

1. Create a PostgreSQL database:
```sql
CREATE DATABASE skill_train;
```

2. Run the schema and seeds:
```bash
# Connect to the database and run the schema
psql -d skill_train -f server/database/schema.sql

# (Optional) Add sample data
psql -d skill_train -f server/database/seeds.sql
```

### Backend Setup

1. Navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

4. Start the server:
```bash
npm start
```

The server will run on http://localhost:5000

### Frontend Setup

1. Navigate to the client directory:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
```

3. Start the React development server:
```bash
npm start
```

The frontend will run on http://localhost:3000

## Vercel Deployment

### Step 1: Set Up PostgreSQL Database

Use one of these free PostgreSQL providers:
- **Neon** (https://neon.tech) - Recommended, free tier available
- **Supabase** (https://supabase.com) - Free tier available
- **Railway** (https://railway.app) - Free tier available

1. Create a new project and get your database connection string (DATABASE_URL)
2. Run the schema.sql and seeds.sql in your database's SQL editor

### Step 2: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/skill-builder.git
git push -u origin main
```

### Step 3: Deploy to Vercel

1. Go to https://vercel.com and sign in with GitHub
2. Click "New Project"
3. Import your GitHub repository
4. Vercel will auto-detect the configuration from vercel.json

### Step 4: Set Environment Variables

In Vercel Dashboard > Settings > Environment Variables, add:

```
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
DB_SSL=true
JWT_SECRET=your-super-secret-jwt-key-change-this
NODE_ENV=production
```

### Step 5: Redeploy

After setting environment variables, redeploy the project.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users/employees` - Get all employees (Manager only)
- `GET /api/users/managers` - Get all managers
- `GET /api/users/:id` - Get user by ID
- `POST /api/users/:id/skills` - Add skill to user
- `DELETE /api/users/:id/skills/:skillId` - Remove skill from user

### Skills
- `GET /api/skills` - Get all skills
- `GET /api/skills/:id` - Get skill by ID
- `POST /api/skills` - Create skill (Manager only)
- `PUT /api/skills/:id` - Update skill (Manager only)
- `DELETE /api/skills/:id` - Delete skill (Manager only)

### Projects
- `GET /api/projects` - Get all projects
- `GET /api/projects/:id` - Get project by ID
- `POST /api/projects` - Create project (Manager only)
- `PUT /api/projects/:id` - Update project (Manager only)
- `DELETE /api/projects/:id` - Delete project (Manager only)
- `POST /api/projects/:id/assign` - Assign employee to project (Manager only)
- `POST /api/projects/:id/skills` - Add required skill to project (Manager only)

### Tasks
- `GET /api/tasks/my` - Get current user's tasks
- `GET /api/tasks/stats` - Get task statistics
- `PUT /api/tasks/:id/complete` - Mark task as completed

### Notifications
- `GET /api/notifications` - Get user's notifications
- `GET /api/notifications/unread-count` - Get unread count
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read

## Usage Flow

1. **Register** as a Manager or Employee
2. **Login** with your credentials
3. **Manager**:
   - Create projects with required skills
   - View employees and their skills
   - Assign employees to projects
   - Employees automatically get tasks for required skills

4. **Employee**:
   - View assigned projects and tasks
   - See what skills are required
   - Mark tasks as completed when skill is learned
   - Notifications appear when assigned to new projects
   - Dashboard auto-refreshes every 5 seconds for real-time updates

## Test Accounts

After running seeds.sql, you can use these accounts:

**Managers:**
- Email: manager@company.com
- Email: lead@company.com

**Employees:**
- Email: amit@company.com
- Email: sneha@company.com
- Email: vikram@company.com
- Email: priya.p@company.com
- Email: ravi@company.com

**Password for all:** password123

## Development

To run both servers simultaneously:

```bash
# Terminal 1 - Backend
cd server && npm start

# Terminal 2 - Frontend
cd client && npm start
```

## License

MIT