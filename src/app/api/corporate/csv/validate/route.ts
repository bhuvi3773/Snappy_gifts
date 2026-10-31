import { NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth/rbac';
import {
  parseAndValidateCorporateCsv,
  CorporateValidationError,
} from '@/lib/corporate/corporate.service';

export async function POST(req: Request) {
  try {
    await requireAuth(req);

    const contentType = req.headers.get('content-type') || '';
    let csvText = '';

    const MAX_CSV_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB limit

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file');
      if (!file || typeof file === 'string') {
        return NextResponse.json({ error: 'No file uploaded or file is invalid.' }, { status: 400 });
      }
      if ((file as Blob).size > MAX_CSV_SIZE_BYTES) {
        return NextResponse.json({ error: 'CSV file size exceeds the maximum allowed limit of 2 MB.' }, { status: 400 });
      }
      csvText = await (file as Blob).text();
    } else {
      const body = await req.json();
      csvText = body.csvContent || '';
    }

    if (!csvText || csvText.trim().length === 0) {
      return NextResponse.json({ error: 'CSV content cannot be empty.' }, { status: 400 });
    }

    if (csvText.length > MAX_CSV_SIZE_BYTES) {
      return NextResponse.json({ error: 'CSV content exceeds the maximum allowed limit of 2 MB.' }, { status: 400 });
    }

    const validationSummary = parseAndValidateCorporateCsv(csvText);

    return NextResponse.json({
      success: true,
      data: validationSummary,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    if (error instanceof CorporateValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Failed to validate CSV.' }, { status: 500 });
  }
}
