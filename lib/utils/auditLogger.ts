import AuditLog from '@/lib/models/AuditLog';
import { NextRequest } from 'next/server';

interface AuditLogParams {
  user: any;
  action: string;
  resourceType: 'user' | 'sprint' | 'backlog' | 'task' | 'auth';
  resourceId?: string;
  resourceName?: string;
  details?: string;
  changes?: any;
  request?: NextRequest;
}

export async function logAudit({
  user,
  action,
  resourceType,
  resourceId = '',
  resourceName = '',
  details = '',
  changes = null,
  request
}: AuditLogParams) {
  try {
    const auditData: any = {
      user: user._id,
      action,
      resourceType,
      resourceId,
      resourceName,
      details,
      changes,
      department: user.department || '',
      timestamp: new Date()
    };

    // Extract IP and User Agent if request is provided
    if (request) {
      auditData.ipAddress = request.headers.get('x-forwarded-for') ||
                            request.headers.get('x-real-ip') ||
                            'unknown';
      auditData.userAgent = request.headers.get('user-agent') || 'unknown';
    }

    await AuditLog.create(auditData);
  } catch (error) {
    console.error('[Audit Logger] Failed to create audit log:', error);
    // Don't throw - audit logging should not break the main operation
  }
}

// Helper to compare objects and return changes
export function getChanges(oldData: any, newData: any): any {
  const changes: any = {
    before: {},
    after: {}
  };

  const allKeys = new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]);

  for (const key of allKeys) {
    // Skip password field for security
    if (key === 'password') continue;

    if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
      changes.before[key] = oldData[key];
      changes.after[key] = newData[key];
    }
  }

  return Object.keys(changes.before).length > 0 ? changes : null;
}
