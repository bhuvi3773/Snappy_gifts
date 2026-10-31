import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getOptionalUser } from '@/lib/auth/rbac';
import { privateStorageService } from '@/services/storage/private-storage.service';
import { StorageValidationError } from '@/services/storage/local-storage.service';
import { createArtworkUploadRecord } from '@/lib/personalization/personalization.service';

export async function POST(req: Request) {
  try {
    const user = await getOptionalUser(req);

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    let guestToken = (formData.get('guestToken') as string)?.trim() || req.headers.get('x-guest-token')?.trim() || null;

    if (!user && !guestToken) {
      guestToken = `guest-${Date.now()}-${crypto.randomBytes(12).toString('hex')}`;
    }

    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { error: 'No file provided in form field "file".', code: 'MISSING_FILE' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Securely validate and write to private storage
    const uploadResult = await privateStorageService.storePrivateUpload(
      buffer,
      file.name,
      file.type,
      'customer-artwork'
    );

    // Persist metadata record in database or fallback store
    const record = await createArtworkUploadRecord(uploadResult, {
      userId: user?.id || null,
      guestToken,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: record.id,
          originalFilename: record.originalFilename,
          mimeType: record.mimeType,
          sizeBytes: record.sizeBytes,
          guestToken: user ? null : record.guestSessionToken,
          createdAt: record.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof StorageValidationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to process artwork upload.' },
      { status: 500 }
    );
  }
}
