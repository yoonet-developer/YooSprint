# Project Management App - Next.js Version

This is a Next.js conversion of the original Express-based project management application.

## What's Different from the Original?

- **Framework**: Uses Next.js 15 with App Router instead of Express
- **Language**: TypeScript instead of JavaScript
- **Routing**: File-based API routes instead of Express routes
- **Frontend**: React components instead of vanilla JavaScript
- **Database**: Same MongoDB setup, but with Next.js connection pooling

## Project Structure

```
project-management-nextjs/
├── app/                      # Next.js App Router
│   ├── api/                  # API Routes (replaces Express routes)
│   │   ├── auth/            # Authentication endpoints
│   │   │   ├── login/       # Login endpoint
│   │   │   ├── register/    # Registration endpoint
│   │   │   ├── logout/      # Logout endpoint
│   │   │   ├── me/          # Current user endpoint
│   │   │   └── change-password/ # Password change endpoint
│   │   ├── tasks/           # Task management endpoints
│   │   ├── users/           # User management endpoints
│   │   ├── backlogs/        # Backlog endpoints
│   │   └── sprints/         # Sprint endpoints
│   ├── login/               # Login page
│   ├── dashboard/           # Main dashboard
│   ├── tasks/               # Tasks page
│   ├── backlogs/            # Backlogs page
│   ├── sprints/             # Sprints page
│   ├── team/                # Team management page
│   └── layout.tsx           # Root layout
├── lib/                     # Shared utilities
│   ├── models/              # Mongoose models
│   │   ├── User.ts          # User model with roles
│   │   ├── Task.ts          # Task model
│   │   ├── Backlog.ts       # Backlog model
│   │   └── Sprint.ts        # Sprint model
│   ├── middleware/          # Authentication middleware
│   │   └── auth.ts          # JWT verification
│   ├── db.ts                # Database connection
│   └── utils/               # Utility functions
│       └── apiHelpers.ts    # API helper functions & role-based filtering
├── components/              # React components
│   ├── auth/                # Authentication components
│   ├── dashboard/           # Dashboard components
│   ├── tasks/               # Task components
│   └── shared/              # Shared UI components
│       └── AppLayout.tsx    # Main application layout
└── public/                  # Static files

## Setup Instructions

### 1. Install Dependencies

\`\`\`bash
cd project-management-nextjs
npm install
\`\`\`

### 2. Configure Environment Variables

The `.env.local` file is already created with default values:

\`\`\`env
MONGODB_URI=mongodb://localhost:27017/projectmanagement
JWT_SECRET=your-secret-key-change-this-in-production-12345
PORT=3000
NODE_ENV=development
\`\`\`

### 3. Ensure MongoDB is Running

Make sure MongoDB is running on `localhost:27017` (same as the original app).

### 4. Run the Development Server

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Migration Status

### ✅ Completed
- [x] Project structure created
- [x] Package configuration
- [x] TypeScript setup
- [x] Database connection utility
- [x] Authentication middleware
- [x] Login API route
- [x] Environment configuration

### 🚧 To Be Completed
- [ ] Register API route
- [ ] Logout API route
- [ ] Change password API route
- [ ] Me (current user) API route
- [ ] Tasks API routes
- [ ] Users API routes
- [ ] Backlogs API routes
- [ ] Sprints API routes
- [ ] React components for UI
- [ ] Session timeout implementation
- [ ] Client-side authentication
- [ ] Dashboard page
- [ ] Task management pages
- [ ] Team management pages

## Key Features (Same as Original)

- User authentication (login/register)
- Role-based access control (admin, manager, member)
- Task management with status tracking
- Sprint planning and backlog management
- Team member management
- Dashboard with project statistics
- 20-minute session timeout
- Password change functionality

## Development Notes

### API Routes vs Express Routes

**Original (Express):**
\`\`\`javascript
app.post('/api/auth/login', async (req, res) => { ... });
\`\`\`

**Next.js:**
\`\`\`typescript
// app/api/auth/login/route.ts
export async function POST(request: NextRequest) { ... }
\`\`\`

### Database Connection

Next.js uses a cached connection pattern to avoid creating multiple MongoDB connections during development hot-reloading.

### Authentication

The authentication system uses the same JWT approach but adapted for Next.js:
- Tokens stored in HTTP-only cookies
- 20-minute expiration
- Verified in API route handlers

## Building for Production

\`\`\`bash
npm run build
npm start
\`\`\`

## Next Steps

To complete the migration, you need to:

1. Create remaining API routes
2. Build React components for the UI
3. Implement client-side state management
4. Add session timeout logic
5. Create pages for all views (dashboard, tasks, team, etc.)

This is a starting template. The full migration requires implementing all API routes and converting the HTML/CSS/JavaScript frontend to React components.
