import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import FileFolder from '@/lib/models/FileFolder';

// GET single file folder
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const folder = await FileFolder.findById(id);
    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }
    return NextResponse.json(folder);
  } catch (error) {
    console.error('Failed to fetch file folder:', error);
    return NextResponse.json({ error: 'Failed to fetch file folder' }, { status: 500 });
  }
}

// PUT update file folder
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    const folder = await FileFolder.findByIdAndUpdate(id, body, { new: true });
    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }
    return NextResponse.json(folder);
  } catch (error) {
    console.error('Failed to update file folder:', error);
    return NextResponse.json({ error: 'Failed to update file folder' }, { status: 500 });
  }
}

// DELETE file folder
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const folder = await FileFolder.findByIdAndDelete(id);
    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Folder deleted successfully' });
  } catch (error) {
    console.error('Failed to delete file folder:', error);
    return NextResponse.json({ error: 'Failed to delete file folder' }, { status: 500 });
  }
}
