import { NextRequest } from 'next/server';
import { requireAuth, errorResponse, successResponse } from '@/lib/utils/apiHelpers';
import Sprint from '@/lib/models/Sprint';
import Project from '@/lib/models/Project';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    // Only super-admin can run migrations
    if (user.role !== 'super-admin') {
      return errorResponse('Only super-admin can run migrations', 403);
    }

    // Get all sprints
    const sprints = await Sprint.find({});

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const sprint of sprints) {
      // Skip if project is already an ObjectId
      if (sprint.project && mongoose.Types.ObjectId.isValid(sprint.project) &&
          typeof sprint.project !== 'string') {
        skippedCount++;
        continue;
      }

      // If project is a string (project name), find the matching project
      if (sprint.project && typeof sprint.project === 'string') {
        const projectName = sprint.project;

        // Find project by name
        const project = await Project.findOne({ name: projectName });

        if (project) {
          // Update sprint with project ObjectId
          await Sprint.findByIdAndUpdate(sprint._id, {
            project: project._id
          });
          migratedCount++;
        } else {
          // Project not found - log error but don't fail
          errors.push(`Sprint "${sprint.name}" has project "${projectName}" which doesn't exist`);
          errorCount++;
        }
      } else {
        // No project set
        skippedCount++;
      }
    }

    return successResponse({
      message: 'Migration completed',
      results: {
        total: sprints.length,
        migrated: migratedCount,
        skipped: skippedCount,
        errors: errorCount,
        errorDetails: errors
      }
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Not authorized', 401);
    }
    console.error('Migration error:', error);
    return errorResponse('Migration failed: ' + error.message);
  }
}
