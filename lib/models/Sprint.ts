import mongoose from 'mongoose';

const sprintSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Sprint name is required'],
    trim: true
  },
  goal: {
    type: String,
    trim: true
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  status: {
    type: String,
    enum: ['planned', 'active', 'completed'],
    default: 'planned'
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  managers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  department: {
    type: String,
    trim: true,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for getting backlog items in this sprint
sprintSchema.virtual('backlogItems', {
  ref: 'Backlog',
  localField: '_id',
  foreignField: 'sprint'
});

const Sprint = mongoose.models.Sprint || mongoose.model('Sprint', sprintSchema);

export default Sprint;
