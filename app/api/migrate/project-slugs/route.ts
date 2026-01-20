import { NextRequest } from 'next/server';
import { requireAuth, errorResponse, successResponse } from '@/lib/utils/apiHelpers';
import Project from '@/lib/models/Project';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    // Only super-admin can run migrations
    if (user.role !== 'super-admin') {
      return errorResponse('Only super-admin can run migrations', 403);
    }

    // Find all projects without slugs
    const projects = await Project.find({ $or: [{ slug: { $exists: false } }, { slug: null }, { slug: '' }] });

    let updatedCount = 0;
    for (const project of projects) {
      // The pre-save middleware will generate the slug
      await project.save();
      updatedCount++;
    }

    return successResponse({
      message: `Migration complete. Updated ${updatedCount} projects with slugs.`,
      updatedCount
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Not authorized', 401);
    }
    console.error('Migration error:', error);
    return errorResponse('Migration failed: ' + error.message);
  }
}
