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
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project is required']
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
  }],
  // Time tracking fields
  timeTracked: {
    type: Number,
    default: 0  // Total time tracked in seconds
  },
  isTimerRunning: {
    type: Boolean,
    default: false
  },
  timerStartedAt: {
    type: Date,
    default: null
  },
  timeEntries: [{
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date
    },
    duration: {
      type: Number  // Duration in seconds
    },
    note: {
      type: String,
      trim: true
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
