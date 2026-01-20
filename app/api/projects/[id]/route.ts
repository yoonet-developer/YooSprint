import { NextRequest } from 'next/server';
import { requireAuth, errorResponse, successResponse } from '@/lib/utils/apiHelpers';
import Project from '@/lib/models/Project';
import mongoose from 'mongoose';

// Helper to find project by ID or slug
async function findProject(idOrSlug: string, populate = true) {
  let query;
  // Check if it's a valid MongoDB ObjectId
  if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
    query = Project.findById(idOrSlug);
  } else {
    query = Project.findOne({ slug: idOrSlug });
  }

  if (populate) {
    query = query
      .populate('assignedUsers', 'name yoonetId position')
      .populate('createdBy', 'name yoonetId');
  }

  return query;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    const project = await findProject(id);

    if (!project) {
      return errorResponse('Project not found', 404);
    }

    // Check department access
    if (user.role !== 'super-admin' && user.department && project.department !== user.department) {
      return errorResponse('Not authorized to access this project', 403);
    }

    return successResponse({ project });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Not authorized', 401);
    }
    return errorResponse('Server error');
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    const body = await request.json();

    const existingProject = await findProject(id, false);
    if (!existingProject) {
      return errorResponse('Project not found', 404);
    }

    // Check permissions
    const isSuperAdmin = user.role === 'super-admin';
    const isAdminOrManager = user.role === 'admin' || user.role === 'manager';
    const isSameDepartment = user.department && existingProject.department === user.department;
    const isAssigned = existingProject.assignedUsers.some(
      (assignedUser: any) => assignedUser.toString() === user._id.toString()
    );

    // Super-admin can edit any, admin/manager can edit in their department, assigned users can update progress/timeConsumed
    if (!isSuperAdmin && !isAdminOrManager && !isAssigned) {
      return errorResponse('Not authorized to update this project', 403);
    }

    // If user is only assigned (not admin/manager), limit what they can update
    if (!isSuperAdmin && !isAdminOrManager && isAssigned) {
      // Assigned users can only update progress and timeConsumed
      if (body.progress !== undefined) existingProject.progress = body.progress;
      if (body.timeConsumed !== undefined) existingProject.timeConsumed = body.timeConsumed;
      if (body.status !== undefined) existingProject.status = body.status;
    } else {
      // Admin/Manager/Super-admin can update all fields
      if (body.name !== undefined) existingProject.name = body.name;
      if (body.description !== undefined) existingProject.description = body.description;
      if (body.category !== undefined) existingProject.category = body.category;
      if (body.estimatedTime !== undefined) existingProject.estimatedTime = body.estimatedTime;
      if (body.timeConsumed !== undefined) existingProject.timeConsumed = body.timeConsumed;
      if (body.progress !== undefined) existingProject.progress = body.progress;
      if (body.status !== undefined) existingProject.status = body.status;
      if (body.startDate !== undefined) existingProject.startDate = body.startDate;
      if (body.endDate !== undefined) existingProject.endDate = body.endDate;
      if (body.assignedUsers !== undefined) existingProject.assignedUsers = body.assignedUsers;
      if (body.department !== undefined) existingProject.department = body.department;
    }

    // Auto-update status based on progress
    if (existingProject.progress === 100 && existingProject.status !== 'completed') {
      existingProject.status = 'completed';
    } else if (existingProject.progress > 0 && existingProject.progress < 100 && existingProject.status === 'pending') {
      existingProject.status = 'in-progress';
    }

    await existingProject.save();

    const project = await Project.findById(existingProject._id)
      .populate('assignedUsers', 'name yoonetId position')
      .populate('createdBy', 'name yoonetId');

    return successResponse({ project });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Not authorized', 401);
    }
    if (error.name === 'ValidationError') {
      return errorResponse(error.message, 400);
    }
    return errorResponse('Server error');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    const existingProject = await findProject(id, false);
    if (!existingProject) {
      return errorResponse('Project not found', 404);
    }

    // Only super-admin, admin, or manager can delete
    const isSuperAdmin = user.role === 'super-admin';
    const isAdminOrManager = user.role === 'admin' || user.role === 'manager';
    const isSameDepartment = user.department && existingProject.department === user.department;

    if (!isSuperAdmin && !(isAdminOrManager && isSameDepartment)) {
      return errorResponse('Not authorized to delete this project', 403);
    }

    await Project.findByIdAndDelete(existingProject._id);

    return successResponse({ message: 'Project deleted successfully' });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Not authorized', 401);
    }
    return errorResponse('Server error');
  }
}
