import mongoose from 'mongoose';

const backlogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  project: {
    type: String,
    required: [true, 'Project is required'],
    trim: true
  },
  storyPoints: {
    type: Number,
    min: 0,
    default: 0
  },
  status: {
    type: String,
    enum: ['backlog', 'in-sprint', 'done'],
    default: 'backlog'
  },
  taskStatus: {
    type: String,
    enum: ['pending', 'in-progress', 'completed'],
    default: 'pending'
  },
  sprint: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sprint',
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  department: {
    type: String,
    trim: true,
    default: ''
  },
  startDate: {
    type: Date,
    default: null
  },
  endDate: {
    type: Date,
    default: null
  },
  startedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  checklist: [{
    id: {
      type: String,
      required: true
    },
    text: {
      type: String,
      required: true
    },
    completed: {
      type: Boolean,
      default: false
    }
  }]
}, {
  timestamps: true
});

// Middleware to automatically set timestamps when status changes
backlogSchema.pre('save', function(next) {
  if (this.isModified('taskStatus')) {
    if (this.taskStatus === 'in-progress' && !this.startedAt) {
      this.startedAt = new Date();
    } else if (this.taskStatus === 'completed' && !this.completedAt) {
      this.completedAt = new Date();
    }
  }
  next();
});

const Backlog = mongoose.models.Backlog || mongoose.model('Backlog', backlogSchema);

export default Backlog;
