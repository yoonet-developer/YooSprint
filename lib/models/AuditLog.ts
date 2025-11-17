import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'user_created',
      'user_updated',
      'user_deleted',
      'user_activated',
      'user_deactivated',
      'user_password_changed',
      'sprint_created',
      'sprint_updated',
      'sprint_deleted',
      'sprint_status_changed',
      'backlog_created',
      'backlog_updated',
      'backlog_deleted',
      'backlog_status_changed',
      'task_created',
      'task_updated',
      'task_deleted',
      'task_status_changed',
      'login_success',
      'login_failed',
      'logout'
    ]
  },
  resourceType: {
    type: String,
    enum: ['user', 'sprint', 'backlog', 'task', 'auth'],
    required: true
  },
  resourceId: {
    type: String,
    default: null
  },
  resourceName: {
    type: String,
    default: ''
  },
  details: {
    type: String,
    default: ''
  },
  changes: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  ipAddress: {
    type: String,
    default: ''
  },
  userAgent: {
    type: String,
    default: ''
  },
  department: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
auditLogSchema.index({ user: 1, timestamp: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ department: 1, timestamp: -1 });

const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
