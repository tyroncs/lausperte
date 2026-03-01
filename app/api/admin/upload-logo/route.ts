import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function checkAuth(request: NextRequest): boolean {
  const secret = request.nextUrl.searchParams.get('secret');
  const expectedSecret = process.env.ADMIN_SECRET || 'change-me-in-production';
  return secret === expectedSecret;
}

export async function POST(request: NextRequest) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Allowed: PNG, JPEG, WebP, SVG' }, { status: 400 });
    }

    // Sanitize filename: keep only alphanumeric, hyphens, dots
    const ext = path.extname(file.name) || (file.type === 'image/png' ? '.png' : file.type === 'image/svg+xml' ? '.svg' : '.jpg');
    const baseName = path.basename(file.name, path.extname(file.name))
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .replace(/-+/g, '-')
      .toLowerCase();
    const filename = `${baseName}${ext}`;

    const logoDir = path.join(process.cwd(), 'public', 'event-logos');
    if (!fs.existsSync(logoDir)) {
      fs.mkdirSync(logoDir, { recursive: true });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(path.join(logoDir, filename), buffer);

    return NextResponse.json({ success: true, path: `/event-logos/${filename}` });
  } catch (error) {
    console.error('Error uploading logo:', error);
    return NextResponse.json({ error: 'Failed to upload logo' }, { status: 500 });
  }
}
