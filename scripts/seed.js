const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv/config');

// Define schemas inline since we can't import TS models
const userSchema = new mongoose.Schema({
  username: { type: String },
  name: { type: String, required: true },
  email: { type: String },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['admin', 'manager', 'member'], default: 'member' },
  position: { type: String, default: 'Team Member' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const backlogSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  project: { type: String, required: true },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  storyPoints: { type: Number, default: 0 },
  status: { type: String, enum: ['backlog', 'in-sprint', 'done'], default: 'backlog' },
  taskStatus: { type: String, enum: ['pending', 'in-progress', 'completed'], default: 'pending' },
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sprint: { type: mongoose.Schema.Types.ObjectId, ref: 'Sprint' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

const sprintSchema = new mongoose.Schema({
  name: { type: String, required: true },
  goal: { type: String },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { type: String, enum: ['planned', 'active', 'completed'], default: 'planned' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Backlog = mongoose.models.Backlog || mongoose.model('Backlog', backlogSchema);
const Sprint = mongoose.models.Sprint || mongoose.model('Sprint', sprintSchema);

async function seed() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/projectmanagement');
    console.log('✓ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Backlog.deleteMany({});
    await Sprint.deleteMany({});
    console.log('✓ Cleared existing data');

    // Create users
    const hashedPassword = await bcrypt.hash('password123', 10);

    const users = await User.create([
      {
        username: 'admin',
        name: 'John Admin',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin',
        position: 'Project Manager',
        isActive: true
      },
      {
        username: 'manager',
        name: 'Sarah Manager',
        email: 'manager@example.com',
        password: hashedPassword,
        role: 'manager',
        position: 'Team Lead',
        isActive: true
      },
      {
        username: 'developer',
        name: 'Mike Developer',
        email: 'developer@example.com',
        password: hashedPassword,
        role: 'member',
        position: 'Senior Developer',
        isActive: true
      },
      {
        username: 'designer',
        name: 'Lisa Designer',
        email: 'designer@example.com',
        password: hashedPassword,
        role: 'member',
        position: 'UI/UX Designer',
        isActive: true
      }
    ]);
    console.log('✓ Created users (password for all: password123)');

    // Create sprints
    const now = new Date();
    const sprints = await Sprint.create([
      {
        name: 'Sprint 1 - Foundation',
        goal: 'Setup project infrastructure and core features',
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
        endDate: new Date(now.getFullYear(), now.getMonth(), 14),
        status: 'completed',
        createdBy: users[0]._id
      },
      {
        name: 'Sprint 2 - User Management',
        goal: 'Implement user authentication and authorization',
        startDate: new Date(now.getFullYear(), now.getMonth(), 15),
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0),
        status: 'active',
        createdBy: users[0]._id
      },
      {
        name: 'Sprint 3 - Dashboard',
        goal: 'Build dashboard and analytics features',
        startDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 14),
        status: 'planned',
        createdBy: users[0]._id
      }
    ]);
    console.log('✓ Created sprints');

    // Create backlogs
    const backlogs = await Backlog.create([
      // Sprint 1 - Completed
      {
        title: 'Setup MongoDB database',
        description: 'Configure MongoDB connection and setup collections',
        project: 'Project Management System',
        priority: 'high',
        storyPoints: 5,
        status: 'done',
        taskStatus: 'completed',
        assignee: users[2]._id,
        sprint: sprints[0]._id,
        createdBy: users[0]._id
      },
      {
        title: 'Create user authentication',
        description: 'Implement JWT-based authentication system',
        project: 'Project Management System',
        priority: 'high',
        storyPoints: 8,
        status: 'done',
        taskStatus: 'completed',
        assignee: users[2]._id,
        sprint: sprints[0]._id,
        createdBy: users[0]._id
      },

      // Sprint 2 - Active
      {
        title: 'Design user profile page',
        description: 'Create mockups and UI design for user profile',
        project: 'Project Management System',
        priority: 'medium',
        storyPoints: 3,
        status: 'in-sprint',
        taskStatus: 'completed',
        assignee: users[3]._id,
        sprint: sprints[1]._id,
        createdBy: users[0]._id
      },
      {
        title: 'Implement role-based access control',
        description: 'Add permissions for admin, manager, and member roles',
        project: 'Project Management System',
        priority: 'high',
        storyPoints: 5,
        status: 'in-sprint',
        taskStatus: 'in-progress',
        assignee: users[2]._id,
        sprint: sprints[1]._id,
        createdBy: users[0]._id
      },
      {
        title: 'Add change password feature',
        description: 'Allow users to change their password from settings',
        project: 'Project Management System',
        priority: 'medium',
        storyPoints: 3,
        status: 'in-sprint',
        taskStatus: 'pending',
        assignee: users[2]._id,
        sprint: sprints[1]._id,
        createdBy: users[0]._id
      },

      // Backlog - Not in sprint
      {
        title: 'Create analytics dashboard',
        description: 'Build dashboard with charts and statistics',
        project: 'Project Management System',
        priority: 'high',
        storyPoints: 8,
        status: 'backlog',
        taskStatus: 'pending',
        assignee: users[2]._id,
        createdBy: users[0]._id
      },
      {
        title: 'Add email notifications',
        description: 'Send email alerts for task assignments and updates',
        project: 'Project Management System',
        priority: 'low',
        storyPoints: 5,
        status: 'backlog',
        taskStatus: 'pending',
        createdBy: users[0]._id
      },
      {
        title: 'Implement file upload',
        description: 'Allow users to attach files to tasks',
        project: 'Project Management System',
        priority: 'medium',
        storyPoints: 5,
        status: 'backlog',
        taskStatus: 'pending',
        createdBy: users[0]._id
      },
      {
        title: 'Create mobile responsive design',
        description: 'Make the application mobile-friendly',
        project: 'Project Management System',
        priority: 'high',
        storyPoints: 8,
        status: 'backlog',
        taskStatus: 'pending',
        assignee: users[3]._id,
        createdBy: users[0]._id
      },
      {
        title: 'Add search and filter functionality',
        description: 'Implement advanced search across tasks and backlogs',
        project: 'Project Management System',
        priority: 'medium',
        storyPoints: 5,
        status: 'backlog',
        taskStatus: 'pending',
        createdBy: users[0]._id
      },

      // E-commerce project
      {
        title: 'Setup payment gateway',
        description: 'Integrate Stripe for payment processing',
        project: 'E-Commerce Platform',
        priority: 'high',
        storyPoints: 13,
        status: 'backlog',
        taskStatus: 'pending',
        assignee: users[2]._id,
        createdBy: users[1]._id
      },
      {
        title: 'Design product catalog',
        description: 'Create product listing and detail pages',
        project: 'E-Commerce Platform',
        priority: 'high',
        storyPoints: 8,
        status: 'backlog',
        taskStatus: 'pending',
        assignee: users[3]._id,
        createdBy: users[1]._id
      }
    ]);
    console.log('✓ Created backlog items');

    console.log('\n=== Seed Data Summary ===');
    console.log(`Users created: ${users.length}`);
    console.log('Login credentials (email/password):');
    console.log('  - admin@example.com / password123 (Admin)');
    console.log('  - manager@example.com / password123 (Manager)');
    console.log('  - developer@example.com / password123 (Developer)');
    console.log('  - designer@example.com / password123 (Designer)');
    console.log(`\nSprints created: ${sprints.length}`);
    console.log(`Backlogs created: ${backlogs.length}`);
    console.log('\n✓ Database seeded successfully!');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seed();
