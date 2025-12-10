import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import FileFolder from '@/lib/models/FileFolder';

// POST add document to folder
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    const folder = await FileFolder.findById(id);
    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    const newDocument = {
      type: body.type,
      typeLabel: body.typeLabel,
      link: body.link,
      title: body.title,
      timestamp: new Date(),
    };

    folder.documents.push(newDocument);
    await folder.save();

    return NextResponse.json(folder, { status: 201 });
  } catch (error) {
    console.error('Failed to add document:', error);
    return NextResponse.json({ error: 'Failed to add document' }, { status: 500 });
  }
}

// PUT update document in folder
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');
    const body = await request.json();

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
    }

    const folder = await FileFolder.findById(id);
    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    const docIndex = folder.documents.findIndex(
      (doc: any) => doc._id.toString() === documentId
    );

    if (docIndex === -1) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    folder.documents[docIndex] = {
      ...folder.documents[docIndex],
      type: body.type,
      typeLabel: body.typeLabel,
      link: body.link,
      title: body.title,
    };
    await folder.save();

    return NextResponse.json(folder);
  } catch (error) {
    console.error('Failed to update document:', error);
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
  }
}

// DELETE document from folder
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
    }

    const folder = await FileFolder.findById(id);
    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    folder.documents = folder.documents.filter(
      (doc: any) => doc._id.toString() !== documentId
    );
    await folder.save();

    return NextResponse.json(folder);
  } catch (error) {
    console.error('Failed to delete document:', error);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}
