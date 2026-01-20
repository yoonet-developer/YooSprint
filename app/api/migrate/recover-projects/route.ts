import { NextRequest } from 'next/server';
import { requireAuth, errorResponse, successResponse } from '@/lib/utils/apiHelpers';
import Backlog from '@/lib/models/Backlog';
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

    // Find all unique project strings from backlogs
    const backlogs = await Backlog.find({}).lean();
    const sprints = await Sprint.find({}).lean();

    const projectStrings = new Set<string>();
    const backlogsToMigrate: any[] = [];
    const sprintsToMigrate: any[] = [];

    // Check backlogs for string project values
    for (const backlog of backlogs) {
      if (backlog.project) {
        // Check if project is a string (not an ObjectId)
        const isString = typeof backlog.project === 'string' &&
                         !mongoose.Types.ObjectId.isValid(backlog.project);

        // Also check if it's a valid ObjectId string but not linked to a real project
        const isUnlinkedObjectId = typeof backlog.project === 'string' &&
                                    mongoose.Types.ObjectId.isValid(backlog.project);

        if (isString) {
          projectStrings.add(backlog.project);
          backlogsToMigrate.push(backlog);
        }
      }
    }

    // Check sprints for string project values
    for (const sprint of sprints) {
      if (sprint.project) {
        const isString = typeof sprint.project === 'string' &&
                         !mongoose.Types.ObjectId.isValid(sprint.project);

        if (isString) {
          projectStrings.add(sprint.project);
          sprintsToMigrate.push(sprint);
        }
      }
    }

    // Create projects for each unique string
    const createdProjects: string[] = [];
    const projectMap = new Map<string, string>(); // projectName -> projectId

    for (const projectName of projectStrings) {
      // Check if project already exists
      let project = await Project.findOne({ name: projectName });

      if (!project) {
        // Create new project
        project = await Project.create({
          name: projectName,
          description: 'Auto-created from existing backlog data',
          category: 'Balanced',
          estimatedTime: 0,
          timeConsumed: 0,
          progress: 0,
          department: user.department || '',
          createdBy: user._id
        });
        createdProjects.push(projectName);
      }

      projectMap.set(projectName, project._id.toString());
    }

    // Update backlogs with project ObjectIds
    let backlogsMigrated = 0;
    for (const backlog of backlogsToMigrate) {
      const projectId = projectMap.get(backlog.project);
      if (projectId) {
        await Backlog.findByIdAndUpdate(backlog._id, {
          project: new mongoose.Types.ObjectId(projectId)
        });
        backlogsMigrated++;
      }
    }

    // Update sprints with project ObjectIds
    let sprintsMigrated = 0;
    for (const sprint of sprintsToMigrate) {
      const projectId = projectMap.get(sprint.project);
      if (projectId) {
        await Sprint.findByIdAndUpdate(sprint._id, {
          project: new mongoose.Types.ObjectId(projectId)
        });
        sprintsMigrated++;
      }
    }

    return successResponse({
      message: 'Recovery completed',
      results: {
        projectStringsFound: Array.from(projectStrings),
        projectsCreated: createdProjects,
        backlogsMigrated,
        sprintsMigrated
      }
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return errorResponse('Not authorized', 401);
    }
    console.error('Recovery error:', error);
    return errorResponse('Recovery failed: ' + error.message);
  }
}
