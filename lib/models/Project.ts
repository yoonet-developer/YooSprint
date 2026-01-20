import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true
  },
  slug: {
    type: String,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    enum: ['Budget-friendly', 'Balanced', 'High-end'],
    default: 'Balanced'
  },
  estimatedTime: {
    type: Number,
    required: [true, 'Estimated time is required'],
    min: [0, 'Estimated time cannot be negative']
  },
  timeConsumed: {
    type: Number,
    default: 0,
    min: [0, 'Time consumed cannot be negative']
  },
  progress: {
    type: Number,
    default: 0,
    min: [0, 'Progress cannot be less than 0'],
    max: [100, 'Progress cannot exceed 100']
  },
  startDate: {
    type: Date,
    default: null
  },
  endDate: {
    type: Date,
    default: null
  },
  assignedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  department: {
    type: String,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Helper function to generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim();
}

// Pre-save middleware to generate slug
projectSchema.pre('save', async function(next) {
  if (this.isModified('name') || !this.slug) {
    let baseSlug = generateSlug(this.name);
    let slug = baseSlug;
    let counter = 1;

    // Check for uniqueness and add counter if needed
    const Project = mongoose.models.Project || mongoose.model('Project', projectSchema);
    while (await Project.findOne({ slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    this.slug = slug;
  }
  next();
});

// Check if model already exists to prevent OverwriteModelError in Next.js hot reload
const Project = mongoose.models.Project || mongoose.model('Project', projectSchema);

export default Project;
