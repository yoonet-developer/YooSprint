# Migration Guide: Express to Next.js

## Overview

This document outlines how your Express-based Project Management App has been migrated to Next.js.

## What's Been Created

### ✅ Completed Structure

1. **Project Configuration**
   - `package.json` - All necessary dependencies
   - `tsconfig.json` - TypeScript configuration
   - `next.config.js` - Next.js configuration
   - `.env.local` - Environment variables
   - `.gitignore` - Git ignore rules

2. **Database Layer**
   - `lib/db.ts` - MongoDB connection utility with connection pooling
   - `lib/models/` - Copied all Mongoose models (User, Task, Backlog, Sprint)

3. **Authentication**
   - `lib/middleware/auth.ts` - JWT authentication utilities
   - `app/api/auth/login/route.ts` - Login API endpoint

4. **Frontend**
   - `app/layout.tsx` - Root layout
   - `app/page.tsx` - Landing page with status information

## Directory Structure Comparison

### Original (Express)
```
project-management-app/
├── backend/
│   ├── models/       → MongoDB models
│   ├── routes/       → API routes
│   └── middleware/   → Auth middleware
├── server.js         → Express server
├── app.js            → Frontend logic
├── index.html        → Main page
└── styles.css        → Styles
```

### Next.js
```
project-management-nextjs/
├── app/
│   ├── api/          → API routes (replaces backend/routes)
│   ├── page.tsx      → Home page
│   └── layout.tsx    → Root layout
├── lib/
│   ├── models/       → MongoDB models (same)
│   ├── middleware/   → Auth middleware (adapted)
│   └── db.ts         → Database connection
```

## Key Differences

### 1. Server Setup

**Express:**
```javascript
const app = express();
app.listen(5000);
```

**Next.js:**
- No manual server setup
- Runs on port 3000 by default
- File-based routing

### 2. API Routes

**Express:**
```javascript
// backend/routes/auth.js
router.post('/login', async (req, res) => { ... });
```

**Next.js:**
```typescript
// app/api/auth/login/route.ts
export async function POST(request: NextRequest) { ... }
```

### 3. Database Connection

**Express:**
- Direct connection in `server.js`
- Single connection instance

**Next.js:**
- Cached connection in `lib/db.ts`
- Prevents multiple connections during hot-reload
- Import and call `dbConnect()` in each API route

### 4. Authentication

**Express:**
```javascript
const protect = async (req, res, next) => { ... };
app.use('/api/tasks', protect, tasksRouter);
```

**Next.js:**
```typescript
// In each API route
const user = await verifyAuth(request);
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### 5. Environment Variables

**Express:** `.env`
```
MONGODB_URI=...
JWT_SECRET=...
PORT=5000
```

**Next.js:** `.env.local`
```
MONGODB_URI=...
JWT_SECRET=...
# PORT is automatic (3000)
```

## What Still Needs to Be Done

### API Routes to Create

1. **Authentication**
   - ✅ `/api/auth/login` - Done
   - ❌ `/api/auth/register`
   - ❌ `/api/auth/logout`
   - ❌ `/api/auth/me`
   - ❌ `/api/auth/change-password`

2. **Tasks**
   - ❌ `/api/tasks` (GET, POST)
   - ❌ `/api/tasks/[id]` (GET, PUT, DELETE)

3. **Users**
   - ❌ `/api/users` (GET, POST)
   - ❌ `/api/users/[id]` (GET, PUT, DELETE)

4. **Backlogs**
   - ❌ `/api/backlogs` (GET, POST)
   - ❌ `/api/backlogs/[id]` (GET, PUT, DELETE)

5. **Sprints**
   - ❌ `/api/sprints` (GET, POST)
   - ❌ `/api/sprints/[id]` (GET, PUT, DELETE)

### React Components to Create

1. **Pages**
   - ❌ Login page (`app/login/page.tsx`)
   - ❌ Register page (`app/register/page.tsx`)
   - ❌ Dashboard (`app/dashboard/page.tsx`)
   - ❌ Tasks page (`app/tasks/page.tsx`)
   - ❌ Team page (`app/team/page.tsx`)
   - ❌ Backlogs page (`app/backlogs/page.tsx`)
   - ❌ Sprints page (`app/sprints/page.tsx`)

2. **Components**
   - ❌ Navigation/Header
   - ❌ Task components
   - ❌ Modal components
   - ❌ Form components
   - ❌ Dashboard widgets

3. **Features**
   - ❌ Session timeout (20 minutes)
   - ❌ Client-side authentication
   - ❌ State management (React hooks or zustand)

## Running Both Applications

### Original Express App
```bash
cd project-management-app
node server.js
# Runs on http://localhost:5000
```

### Next.js App
```bash
cd project-management-nextjs
npm run dev
# Runs on http://localhost:3000
```

Both can run simultaneously since they use different ports!

## Next Steps to Complete Migration

1. **Create remaining API routes** - Copy logic from Express routes to Next.js API routes
2. **Build React components** - Convert HTML/CSS to React components
3. **Add state management** - Use React Context or Zustand for global state
4. **Implement authentication flow** - Login, session management, protected routes
5. **Style with Tailwind or CSS** - Port existing styles or use Tailwind
6. **Test all features** - Ensure feature parity with original app

## Benefits of Next.js Version

- ✅ TypeScript for type safety
- ✅ Better development experience
- ✅ Automatic code splitting
- ✅ Built-in optimization
- ✅ Easy deployment to Vercel
- ✅ Modern React patterns
- ✅ API routes and frontend in one project
- ✅ File-based routing

## Need Help?

Check the README.md for setup instructions and the original `project-management-app` for reference implementation.
