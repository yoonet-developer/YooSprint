import { NextRequest } from 'next/server';
import { requireAuth, errorResponse, successResponse } from '@/lib/utils/apiHelpers';
import Project from '@/lib/models/Project';
import User from '@/lib/models/User';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    let filter: any = {};

    // Filter by department for non-super-admins
    if (user.role !== 'super-admin' && user.department) {
      filter.department = user.department;
    }

    const projects = await Project.find(filter)
      .populate('assignedUsers', 'name yoonetId position')
      .populate('createdBy', 'name yoonetId')
      .sort({ createdAt: -1 });

    return successResponse({ projects });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Not authorized', 401);
    }
    console.error('Get projects error:', error);
    return errorResponse('Server error');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    // Only super-admin, admin and managers can create projects
    if (user.role !== 'super-admin' && user.role !== 'admin' && user.role !== 'manager') {
      return errorResponse('Not authorized to create projects', 403);
    }

    const body = await request.json();
    const { name, description, category, estimatedTime, startDate, endDate, assignedUsers, department } = body;

    // Validate required fields
    if (!name || estimatedTime === undefined) {
      return errorResponse('Missing required fields (name, estimatedTime)', 400);
    }

    // Set department from user if not provided (for non-super-admins)
    const projectDepartment = department || (user.role !== 'super-admin' ? user.department : '');

    const project = await Project.create({
      name,
      description: description || '',
      category,
      estimatedTime,
      timeConsumed: 0,
      progress: 0,
      status: 'pending',
      startDate: startDate || null,
      endDate: endDate || null,
      assignedUsers: assignedUsers || [],
      department: projectDepartment,
      createdBy: user._id
    });

    const populatedProject = await Project.findById(project._id)
      .populate('assignedUsers', 'name yoonetId position')
      .populate('createdBy', 'name yoonetId');

    return successResponse({ project: populatedProject }, 201);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Not authorized', 401);
    }
    console.error('Create project error:', error);
    return errorResponse(error.message || 'Server error');
  }
}
