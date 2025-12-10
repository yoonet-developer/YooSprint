import { NextResponse } from 'next/server';
import mongoose, { Connection } from 'mongoose';
import dbConnect from '@/lib/db';
import FileFolder from '@/lib/models/FileFolder';

// MongoDB URI for the docsmanager database
const DOCSMANAGER_URI = process.env.MONGODB_URI?.replace('/projectmanagement', '/docsmanager') || '';

// POST - Migrate data from docsmanager to projectmanagement
export async function POST() {
  let docsManagerConnection: Connection | null = null;

  try {
    // Connect to the main database first
    await dbConnect();

    // Create a separate connection to the docsmanager database
    docsManagerConnection = await mongoose.createConnection(DOCSMANAGER_URI).asPromise();

    // Define the schema for reading from docsmanager
    const DocumentSchema = new mongoose.Schema({
      type: String,
      typeLabel: String,
      link: String,
      title: String,
      timestamp: Date,
    });

    const ProjectSchema = new mongoose.Schema({
      name: String,
      color: String,
      documents: [DocumentSchema],
      createdAt: Date,
      updatedAt: Date,
    });

    // Get the Project model from docsmanager
    const DocsProject = docsManagerConnection.model('Project', ProjectSchema);

    // Fetch all projects from docsmanager
    const docsProjects = await DocsProject.find({}).lean();

    if (!docsProjects || docsProjects.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No projects found in docsmanager database',
        imported: 0
      });
    }

    let importedCount = 0;
    let skippedCount = 0;

    // Import each project as a FileFolder
    for (const project of docsProjects) {
      // Check if folder with same name already exists
      const existingFolder = await FileFolder.findOne({ name: project.name });

      if (existingFolder) {
        // Merge documents - add only new ones
        const existingLinks = new Set(existingFolder.documents.map((d: any) => d.link));
        const newDocs = (project.documents || []).filter((d: any) => !existingLinks.has(d.link));

        if (newDocs.length > 0) {
          existingFolder.documents.push(...newDocs);
          await existingFolder.save();
          importedCount += newDocs.length;
        } else {
          skippedCount++;
        }
      } else {
        // Create new folder
        await FileFolder.create({
          name: project.name,
          color: project.color || '#879BFF',
          documents: project.documents || [],
        });
        importedCount++;
      }
    }

    // Close the docsmanager connection
    await docsManagerConnection.close();

    return NextResponse.json({
      success: true,
      message: `Migration completed successfully`,
      totalProjects: docsProjects.length,
      imported: importedCount,
      skipped: skippedCount
    });

  } catch (error) {
    console.error('Migration error:', error);

    // Clean up connection on error
    if (docsManagerConnection) {
      try {
        await docsManagerConnection.close();
      } catch (e) {
        console.error('Error closing connection:', e);
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to migrate data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET - Check migration status / preview data
export async function GET() {
  let docsManagerConnection: Connection | null = null;

  try {
    // Create a connection to the docsmanager database
    docsManagerConnection = await mongoose.createConnection(DOCSMANAGER_URI).asPromise();

    // Define the schema for reading from docsmanager
    const DocumentSchema = new mongoose.Schema({
      type: String,
      typeLabel: String,
      link: String,
      title: String,
      timestamp: Date,
    });

    const ProjectSchema = new mongoose.Schema({
      name: String,
      color: String,
      documents: [DocumentSchema],
      createdAt: Date,
      updatedAt: Date,
    });

    // Get the Project model from docsmanager
    const DocsProject = docsManagerConnection.model('Project', ProjectSchema);

    // Fetch all projects from docsmanager
    const docsProjects = await DocsProject.find({}).lean();

    // Close the connection
    await docsManagerConnection.close();

    // Calculate total documents
    const totalDocuments = docsProjects.reduce((sum: number, p: any) => sum + (p.documents?.length || 0), 0);

    return NextResponse.json({
      success: true,
      message: 'Data available for migration',
      projects: docsProjects.map((p: any) => ({
        name: p.name,
        documentCount: p.documents?.length || 0,
        color: p.color
      })),
      totalProjects: docsProjects.length,
      totalDocuments
    });

  } catch (error) {
    console.error('Check migration error:', error);

    if (docsManagerConnection) {
      try {
        await docsManagerConnection.close();
      } catch (e) {
        console.error('Error closing connection:', e);
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to check migration data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
