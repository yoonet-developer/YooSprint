import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import FileFolder from '@/lib/models/FileFolder';

// GET all file folders
export async function GET() {
  try {
    await dbConnect();
    const folders = await FileFolder.find({}).sort({ createdAt: -1 });
    return NextResponse.json(folders);
  } catch (error) {
    console.error('Failed to fetch file folders:', error);
    return NextResponse.json({ error: 'Failed to fetch file folders' }, { status: 500 });
  }
}

// POST create new file folder
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    const folder = await FileFolder.create({
      name: body.name,
      color: body.color,
      documents: [],
    });
    return NextResponse.json(folder, { status: 201 });
  } catch (error) {
    console.error('Failed to create file folder:', error);
    return NextResponse.json({ error: 'Failed to create file folder' }, { status: 500 });
  }
}
